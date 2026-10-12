import { supabase } from '../../../lib/supabase';
import { newPendingStock, bulkLabelTemplate, bulkDeliveryApplyPatch, clampDeliveryPaste, maxDeliveryPasteLines, renameLabelAtIndex, addLabelField, removeLabelAtIndex, KeyOverride, PendingStock, BulkDeliveryPasteTarget } from './stockHelpers';
import { SecretField, newField } from './formModel';
import { Product } from '../../../types';
import { type Dispatch, type SetStateAction } from 'react';

type StockActionsArgs = {
  editing: Product | null;
  setClearKeysOpen: Dispatch<SetStateAction<boolean>>;
  clearKeysBusy: boolean;
  setClearKeysBusy: Dispatch<SetStateAction<boolean>>;
  setFormError: Dispatch<SetStateAction<string>>;
  t: (ar: string, en: string) => string;
  setKeyCounts: Dispatch<SetStateAction<{ available: number; claimed: number; }>>;
  setKeyOverrides: Dispatch<SetStateAction<KeyOverride[]>>;
  refreshStorefront: () => void;
  stockPaste: string;
  setPendingStock: Dispatch<SetStateAction<PendingStock[]>>;
  setStockPaste: Dispatch<SetStateAction<string>>;
  setFulfillTab: Dispatch<SetStateAction<"default" | "stock">>;
  pendingStock: PendingStock[];
  keyOverrides: KeyOverride[];
  deliveryPaste: string;
  deliveryTwoLinesPerUnit: boolean;
  deliveryPasteTarget: BulkDeliveryPasteTarget;
  setDeliveryPasteWarn: Dispatch<SetStateAction<string>>;
  setDeliveryPaste: Dispatch<SetStateAction<string>>;
  stockDraft: string;
  setStockDraft: Dispatch<SetStateAction<string>>;
};

export function createStockActions({
  editing,
  setClearKeysOpen,
  clearKeysBusy,
  setClearKeysBusy,
  setFormError,
  t,
  setKeyCounts,
  setKeyOverrides,
  refreshStorefront,
  stockPaste,
  setPendingStock,
  setStockPaste,
  setFulfillTab,
  pendingStock,
  keyOverrides,
  deliveryPaste,
  deliveryTwoLinesPerUnit,
  deliveryPasteTarget,
  setDeliveryPasteWarn,
  setDeliveryPaste,
  stockDraft,
  setStockDraft,
}: StockActionsArgs) {
  const clearUnclaimedKeys = () => {
    if (!editing) return;
    setClearKeysOpen(true);
  };

  const confirmClearUnclaimedKeys = async () => {
    if (!editing || clearKeysBusy) return;
    setClearKeysBusy(true);
    const { error } = await supabase
      .from('product_keys')
      .delete()
      .eq('product_id', editing.id)
      .is('claimed_at', null);
    if (error) {
      setFormError(t('فشل حذف المفاتيح.', 'Could not delete keys.'));
    } else {
      setKeyCounts((prev) => ({ ...prev, available: 0 }));
      setKeyOverrides([]);
      refreshStorefront();
    }
    setClearKeysBusy(false);
    setClearKeysOpen(false);
  };

  const removeStockUnit = async (id: string) => {
    if (!editing) return;
    const { error } = await supabase
      .from('product_keys')
      .delete()
      .eq('id', id)
      .eq('product_id', editing.id)
      .is('claimed_at', null);
    if (error) {
      setFormError(t('فشل حذف الوحدة.', 'Could not delete stock unit.'));
      return;
    }
    setKeyOverrides((prev) => prev.filter((k) => k.id !== id));
    setKeyCounts((prev) => ({ ...prev, available: Math.max(0, prev.available - 1) }));
    refreshStorefront();
  };

  const queuePasteAsStock = () => {
    const lines = stockPaste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setPendingStock((prev) => [...prev, ...lines.map((c) => newPendingStock(c))]);
    setStockPaste('');
    setFulfillTab('stock');
  };

  const applyBulkDelivery = () => {
    const pendingLen = pendingStock.length;
    const unitCount = pendingLen + keyOverrides.length;
    if (unitCount === 0) return;
    const rawLines = deliveryPaste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length === 0) return;

    const two = deliveryTwoLinesPerUnit;
    const target = deliveryPasteTarget;
    const templateKeys = bulkLabelTemplate([
      ...pendingStock.map((u) => u.secretFields),
      ...keyOverrides.map((u) => u.secretFields),
    ]).map((f) => f.key);
    const entryCount = two ? Math.floor(rawLines.length / 2) : rawLines.length;
    const orphanLine = two && rawLines.length % 2 === 1;
    const extraEntries = Math.max(0, entryCount - unitCount);
    if (orphanLine || extraEntries > 0) {
      const parts: string[] = [];
      if (orphanLine) {
        parts.push(t('سطر فردي بدون زوج — يُتجاهل.', 'Odd line without a pair — ignored.'));
      }
      if (extraEntries > 0) {
        parts.push(
          t(
            `${extraEntries} وحدة لصق زائدة — تُطبَّق على ${unitCount} وحدة فقط.`,
            `${extraEntries} extra paste unit(s) — applied to ${unitCount} unit(s) only.`,
          ),
        );
      }
      setDeliveryPasteWarn(parts.join(' '));
    } else {
      setDeliveryPasteWarn('');
    }

    const applyCount = Math.min(entryCount, unitCount);
    // Patch outside updater indexes — mutating a shared counter inside setState is unsafe (Strict Mode).
    setPendingStock((prev) =>
      prev.map((unit, i) =>
        i < applyCount
          ? { ...unit, ...bulkDeliveryApplyPatch(rawLines, i, two, unit, target, templateKeys) }
          : unit,
      ),
    );
    setKeyOverrides((prev) =>
      prev.map((unit, i) => {
        const idx = pendingLen + i;
        return idx < applyCount
          ? { ...unit, ...bulkDeliveryApplyPatch(rawLines, idx, two, unit, target, templateKeys) }
          : unit;
      }),
    );

    setDeliveryPaste('');
    setFulfillTab('stock');
  };

  const setDeliveryPasteClamped = (nextPaste: string, two: boolean = deliveryTwoLinesPerUnit) => {
    const units = pendingStock.length + keyOverrides.length;
    const { text, truncated } = clampDeliveryPaste(nextPaste, units, two);
    setDeliveryPaste(text);
    if (truncated) {
      const maxLines = maxDeliveryPasteLines(units, two);
      const keptUnits = two ? Math.floor(maxLines / 2) : maxLines;
      setDeliveryPasteWarn(
        t(
          `قُصِّ إلى ${keptUnits} وحدة (${maxLines} سطر).`,
          `Trimmed to ${keptUnits} unit(s) (${maxLines} line(s)).`,
        ),
      );
    } else {
      setDeliveryPasteWarn('');
    }
  };

  const bulkLabelFields = bulkLabelTemplate([
    ...pendingStock.map((u) => u.secretFields),
    ...keyOverrides.map((u) => u.secretFields),
  ]);

  const renameBulkLabel = (index: number, key: string) => {
    setPendingStock((prev) =>
      prev.map((u) => ({ ...u, secretFields: renameLabelAtIndex(u.secretFields, index, key) })),
    );
    setKeyOverrides((prev) =>
      prev.map((u) => ({ ...u, secretFields: renameLabelAtIndex(u.secretFields, index, key) })),
    );
  };

  const addBulkLabel = () => {
    setPendingStock((prev) =>
      prev.map((u) => ({ ...u, secretFields: addLabelField(u.secretFields) })),
    );
    setKeyOverrides((prev) =>
      prev.map((u) => ({ ...u, secretFields: addLabelField(u.secretFields) })),
    );
  };

  const removeBulkLabel = (index: number) => {
    setPendingStock((prev) =>
      prev.map((u) => ({ ...u, secretFields: removeLabelAtIndex(u.secretFields, index) })),
    );
    setKeyOverrides((prev) =>
      prev.map((u) => ({ ...u, secretFields: removeLabelAtIndex(u.secretFields, index) })),
    );
  };

  const queueDraftStock = () => {
    const c = stockDraft.trim();
    if (!c) return;
    setPendingStock((prev) => [...prev, newPendingStock(c)]);
    setStockDraft('');
    setFulfillTab('stock');
  };

  const setPendingDetails = (tempId: string, secretDetails: string) => {
    setPendingStock((prev) =>
      prev.map((k) => (k.tempId === tempId ? { ...k, secretDetails } : k)),
    );
  };

  const setPendingField = (
    tempId: string,
    fieldId: string,
    patch: Partial<Pick<SecretField, 'key' | 'value'>>,
  ) => {
    setPendingStock((prev) =>
      prev.map((k) =>
        k.tempId === tempId
          ? {
              ...k,
              secretFields: k.secretFields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            }
          : k,
      ),
    );
  };

  const addPendingField = (tempId: string) => {
    setPendingStock((prev) =>
      prev.map((k) =>
        k.tempId === tempId ? { ...k, secretFields: [...k.secretFields, newField('', '')] } : k,
      ),
    );
  };

  const removePendingField = (tempId: string, fieldId: string) => {
    setPendingStock((prev) =>
      prev.map((k) =>
        k.tempId === tempId
          ? { ...k, secretFields: k.secretFields.filter((f) => f.id !== fieldId) }
          : k,
      ),
    );
  };

  const removePendingStock = (tempId: string) => {
    setPendingStock((prev) => prev.filter((k) => k.tempId !== tempId));
  };

  const setKeyOverrideDetails = (id: string, secretDetails: string) => {
    setKeyOverrides((prev) =>
      prev.map((k) => (k.id === id ? { ...k, secretDetails } : k)),
    );
  };

  const setKeyOverrideField = (
    keyId: string,
    fieldId: string,
    patch: Partial<Pick<SecretField, 'key' | 'value'>>,
  ) => {
    setKeyOverrides((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? {
              ...k,
              secretFields: k.secretFields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            }
          : k,
      ),
    );
  };

  const addKeyOverrideField = (keyId: string) => {
    setKeyOverrides((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, secretFields: [...k.secretFields, newField('', '')] } : k,
      ),
    );
  };

  const removeKeyOverrideField = (keyId: string, fieldId: string) => {
    setKeyOverrides((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? { ...k, secretFields: k.secretFields.filter((f) => f.id !== fieldId) }
          : k,
      ),
    );
  };

  return { clearUnclaimedKeys, confirmClearUnclaimedKeys, removeStockUnit, queuePasteAsStock, applyBulkDelivery, setDeliveryPasteClamped, bulkLabelFields, renameBulkLabel, addBulkLabel, removeBulkLabel, queueDraftStock, setPendingDetails, setPendingField, addPendingField, removePendingField, removePendingStock, setKeyOverrideDetails, setKeyOverrideField, addKeyOverrideField, removeKeyOverrideField };
}
