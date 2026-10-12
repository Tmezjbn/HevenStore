import { Loader2, Check, Trash2, RefreshCw, Plus, Bookmark, Lock, Unlock } from 'lucide-react';
import { BUILDER_PRESETS_MAX, type BuilderPreset, type SiteSettingsMap } from '../../../lib/siteSettings';
import { fmtDateTime } from '../../../lib/dates';
import { type UseMutationResult } from '@tanstack/react-query';
import { focusRing, SECTION_SHELL, SECTION_TITLE } from './constants';

interface PresetsSectionProps {
  applyPreset: (preset: BuilderPreset) => void;
  lang: 'ar' | 'en';
  newPresetLocked: boolean;
  presetBusy: boolean;
  presetName: string;
  presets: BuilderPreset[];
  removePreset: (id: string) => Promise<void>;
  saveCurrentAsPreset: () => Promise<void>;
  saveMutation: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  setNewPresetLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setPresetName: React.Dispatch<React.SetStateAction<string>>;
  t: (ar: string, en: string) => string;
  togglePresetLock: (id: string) => Promise<void>;
  updatePreset: (id: string) => Promise<void>;
}

export default function PresetsSection({
  applyPreset,
  lang,
  newPresetLocked,
  presetBusy,
  presetName,
  presets,
  removePreset,
  saveCurrentAsPreset,
  saveMutation,
  setNewPresetLocked,
  setPresetName,
  t,
  togglePresetLock,
  updatePreset,
}: PresetsSectionProps) {
  return (
      <section id="builder-presets" className={SECTION_SHELL} aria-labelledby="builder-presets-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="builder-presets-title" className={SECTION_TITLE}>
            <span className="size-8 rounded-lg border border-primary/35 bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bookmark size={15} aria-hidden />
            </span>
            {t('إعدادات مسبقة', 'Presets')}
            <span
              className={`badge badge-sm font-semibold tabular-nums ${
                presets.length >= BUILDER_PRESETS_MAX ? 'badge-warning' : 'badge-ghost'
              }`}
            >
              {presets.length}/{BUILDER_PRESETS_MAX}
            </span>
          </h3>
        </div>

        <div
          className={`rounded-lg border p-3 sm:p-4 space-y-3 ${
            presets.length >= BUILDER_PRESETS_MAX
              ? 'border-warning/40 bg-warning/5'
              : 'border-base-300 bg-base-100'
          }`}
        >
          <p className="text-xs font-semibold tracking-wide text-base-content/70">
            {presets.length >= BUILDER_PRESETS_MAX
              ? t('الحد ممتلئ — احذف إعداداً أولاً', 'Slots full — remove one first')
              : t('حفظ الحالة الحالية', 'Save current state')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              className={`input input-bordered input-sm flex-1 min-w-0 ${focusRing}`}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('اسم الإعداد المسبق', 'Preset name')}
              maxLength={48}
              disabled={presets.length >= BUILDER_PRESETS_MAX}
              aria-label={t('اسم الإعداد المسبق', 'Preset name')}
            />
            <button
              type="button"
              className={`btn btn-xs border gap-1 self-start sm:self-auto ${focusRing} ${
                newPresetLocked
                  ? 'border-warning/45 bg-warning/15 text-warning'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              aria-pressed={newPresetLocked}
              disabled={presets.length >= BUILDER_PRESETS_MAX}
              onClick={() => setNewPresetLocked((v) => !v)}
            >
              {newPresetLocked ? <Lock size={12} aria-hidden /> : <Unlock size={12} aria-hidden />}
              {t('حماية', 'Protect')}
            </button>
            <button
              type="button"
              className={`btn btn-primary btn-sm gap-1.5 self-start sm:self-auto ${focusRing}`}
              disabled={presetBusy || saveMutation.isPending || presets.length >= BUILDER_PRESETS_MAX}
              onClick={saveCurrentAsPreset}
            >
              {presetBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {t('حفظ الحالي', 'Save current')}
            </button>
          </div>
        </div>

        {presets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
            <Bookmark size={28} className="mx-auto text-base-content/35" aria-hidden />
            <p className="text-base font-semibold tracking-tight">
              {t('لا إعدادات مسبقة', 'No presets yet')}
            </p>
            <p className="text-sm text-base-content/65 text-pretty max-w-sm mx-auto">
              {t(
                'احفظ البطل والأقسام والتذييل والمشغّل كإعداد واحد.',
                'Snapshot hero, sections, footer, and player as one preset.',
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5" role="list">
            {presets.map((p) => (
              <li
                key={p.id}
                className={`preset-card rounded-lg border p-3 sm:p-4 space-y-3 transition-colors ${
                  p.locked
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-base-300 bg-base-100'
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold tracking-tight truncate leading-snug">
                      {p.name}
                    </p>
                    <p className="text-sm text-base-content/65 tabular-nums">
                      {fmtDateTime(p.updated_at, lang)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-xs border gap-1 ${focusRing} ${
                      p.locked
                        ? 'border-warning/45 bg-warning/15 text-warning'
                        : 'btn-ghost border-base-300 text-base-content/70'
                    }`}
                    aria-pressed={p.locked}
                    disabled={presetBusy || saveMutation.isPending}
                    onClick={() => togglePresetLock(p.id)}
                    title={
                      p.locked
                        ? t('إلغاء الحماية', 'Unlock')
                        : t('حماية من الحذف', 'Protect from delete')
                    }
                  >
                    {p.locked ? <Lock size={12} aria-hidden /> : <Unlock size={12} aria-hidden />}
                    {p.locked ? t('محمي', 'Protected') : t('غير محمي', 'Unlocked')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={`btn btn-primary btn-sm gap-1 ${focusRing}`}
                    disabled={presetBusy || saveMutation.isPending}
                    onClick={() => applyPreset(p)}
                  >
                    <Check size={12} aria-hidden />
                    {t('تطبيق', 'Apply')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline btn-sm gap-1 ${focusRing}`}
                    disabled={presetBusy || saveMutation.isPending}
                    onClick={() => updatePreset(p.id)}
                  >
                    <RefreshCw size={12} aria-hidden />
                    {t('تحديث', 'Update')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm gap-1 text-error border border-transparent hover:border-error/30 ${focusRing}`}
                    disabled={p.locked || presetBusy || saveMutation.isPending}
                    title={
                      p.locked
                        ? t('محمي من الحذف', 'Protected from delete')
                        : t('حذف', 'Remove')
                    }
                    onClick={() => removePreset(p.id)}
                  >
                    <Trash2 size={12} aria-hidden />
                    {t('حذف', 'Remove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
  );
}
