import { parseSecretContent } from '../../../lib/fulfillment';
import { SecretField, newField, parseFields } from './formModel';

export type KeyOverride = {
  id: string;
  content: string;
  secretDetails: string;
  secretFields: SecretField[];
};

/** Not-yet-saved stock units (one key = one sellable unit). */
export type PendingStock = {
  tempId: string;
  content: string;
  secretDetails: string;
  secretFields: SecretField[];
};

export type StockListItem =
  | { kind: 'pending'; row: PendingStock; globalIndex: number }
  | { kind: 'saved'; row: KeyOverride; globalIndex: number };

let pendingSeq = 0;
export function newPendingStock(content: string, secretDetails = '', secretFields: SecretField[] = []): PendingStock {
  pendingSeq += 1;
  return {
    tempId: `pending-${pendingSeq}`,
    content: content.trim(),
    secretDetails,
    secretFields,
  };
}

export function keyHasCustom(row: { secretDetails: string; secretFields: SecretField[] }) {
  return (
    row.secretDetails.trim().length > 0 ||
    row.secretFields.some((f) => f.key.trim() || f.value.trim())
  );
}

export function patchTwoLineFields(existing: SecretField[], line1: string, line2: string): SecretField[] {
  if (existing.length >= 2) {
    return existing.map((f, i) =>
      i === 0 ? { ...f, value: line1 } : i === 1 ? { ...f, value: line2 } : f,
    );
  }
  if (existing.length === 1) {
    return [{ ...existing[0], value: line1 }, newField('', line2)];
  }
  return [newField('', line1), newField('', line2)];
}

export type BulkDeliveryPasteTarget = 'delivery' | 'labels';

export function bulkLabelTemplate(fieldsLists: SecretField[][]): SecretField[] {
  for (const fields of fieldsLists) {
    if (fields.length > 0) return fields;
  }
  return fieldsLists[0] ?? [];
}

export function syncFieldsToTemplate(existing: SecretField[], templateKeys: string[]): SecretField[] {
  return templateKeys.map((key, i) => {
    const prev = existing[i];
    return prev ? { ...prev, key } : newField(key, '');
  });
}

export function ensureFieldCount(fields: SecretField[], count: number): SecretField[] {
  let out = fields;
  while (out.length < count) out = [...out, newField('', '')];
  return out;
}

export function renameLabelAtIndex(fields: SecretField[], index: number, key: string): SecretField[] {
  const base = ensureFieldCount(fields, index + 1);
  return base.map((f, i) => (i === index ? { ...f, key } : f));
}

export function addLabelField(fields: SecretField[], key = ''): SecretField[] {
  return [...fields, newField(key, '')];
}

export function removeLabelAtIndex(fields: SecretField[], index: number): SecretField[] {
  return fields.filter((_, i) => i !== index);
}

export function bulkLabelsPatch(
  rawLines: string[],
  entryIndex: number,
  twoLinesPerUnit: boolean,
  existing: { secretDetails: string; secretFields: SecretField[] },
  templateKeys: string[],
): Pick<PendingStock, 'secretDetails' | 'secretFields'> {
  const base = syncFieldsToTemplate(existing.secretFields, templateKeys);
  if (twoLinesPerUnit) {
    return {
      secretDetails: existing.secretDetails,
      secretFields: patchTwoLineFields(
        base,
        rawLines[entryIndex * 2],
        rawLines[entryIndex * 2 + 1],
      ),
    };
  }
  if (base.length === 0) {
    return {
      secretDetails: existing.secretDetails,
      secretFields: [newField(templateKeys[0] ?? '', rawLines[entryIndex])],
    };
  }
  return {
    secretDetails: existing.secretDetails,
    secretFields: base.map((f, i) => (i === 0 ? { ...f, value: rawLines[entryIndex] } : f)),
  };
}

export function maxDeliveryPasteLines(maxUnits: number, twoLinesPerUnit: boolean): number {
  return maxUnits * (twoLinesPerUnit ? 2 : 1);
}

export function clampDeliveryPaste(
  paste: string,
  maxUnits: number,
  twoLinesPerUnit: boolean,
): { text: string; truncated: boolean } {
  const maxNonEmpty = maxDeliveryPasteLines(maxUnits, twoLinesPerUnit);
  if (maxNonEmpty <= 0) {
    return { text: '', truncated: paste.split('\n').some((l) => l.trim()) };
  }
  const lines = paste.split('\n');
  const out: string[] = [];
  let nonEmpty = 0;
  for (const line of lines) {
    if (line.trim()) {
      if (nonEmpty >= maxNonEmpty) return { text: out.join('\n'), truncated: true };
      nonEmpty++;
    }
    out.push(line);
  }
  return { text: out.join('\n'), truncated: false };
}

export function bulkDeliveryPatch(
  rawLines: string[],
  entryIndex: number,
  twoLinesPerUnit: boolean,
  existing: { secretDetails: string; secretFields: SecretField[] },
): Pick<PendingStock, 'secretDetails' | 'secretFields'> {
  if (twoLinesPerUnit) {
    return {
      secretDetails: existing.secretDetails,
      secretFields: patchTwoLineFields(
        existing.secretFields,
        rawLines[entryIndex * 2],
        rawLines[entryIndex * 2 + 1],
      ),
    };
  }
  return { secretDetails: rawLines[entryIndex], secretFields: existing.secretFields };
}

export function bulkDeliveryApplyPatch(
  rawLines: string[],
  entryIndex: number,
  twoLinesPerUnit: boolean,
  existing: { secretDetails: string; secretFields: SecretField[] },
  target: BulkDeliveryPasteTarget,
  templateKeys: string[],
): Pick<PendingStock, 'secretDetails' | 'secretFields'> {
  if (target === 'labels') {
    return bulkLabelsPatch(rawLines, entryIndex, twoLinesPerUnit, existing, templateKeys);
  }
  return bulkDeliveryPatch(rawLines, entryIndex, twoLinesPerUnit, existing);
}

export function keyOverridesFromRows(
  rows: { id: string; content: string; details: string | null; claimed_at: string | null }[],
): { counts: { available: number; claimed: number }; overrides: KeyOverride[] } {
  const claimed = rows.filter((k) => k.claimed_at).length;
  const overrides = rows
    .filter((k) => !k.claimed_at)
    .map((k) => {
      const parsed = parseSecretContent(k.details);
      return {
        id: k.id,
        content: k.content,
        secretDetails: parsed.details,
        secretFields: parseFields(parsed.valueLines),
      };
    });
  return { counts: { available: rows.length - claimed, claimed }, overrides };
}
