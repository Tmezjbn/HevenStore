import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, Check, X, ChevronRight, ChevronDown, FolderTree, Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// PERF-2: defer owner-tree CSS off storefront main chunk (loads with CategoriesPage).
void import('../../styles/dashboard-owner-surfaces.css');
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import {
  buildCategoryForest,
  cascadeLevelPatches,
  CATEGORY_MAX_LEVEL,
  categoryLevelFromParent,
  categoryPathLabel,
  countDescendants,
  eligibleParents,
  expandIdsForSearch,
  filterAndSortForest,
  hasSiblingNameConflict,
  levelLabel,
  subtreeHeight,
  uniqueCategorySlug,
  type CategoryLevel,
  type CategoryNode,
  type CategoryTreeSort,
} from '../../lib/categories';
import type { Category } from '../../types';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import { CATEGORY_COLS } from '../../lib/dbCols';

type PanelMode =
  | { kind: 'idle' }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'edit'; id: string };

interface Draft {
  name: string;
  name_ar: string;
  parent_id: string;
}

const emptyDraft = (): Draft => ({ name: '', name_ar: '', parent_id: '' });

function friendlyDbError(message: string, t: (ar: string, en: string) => string): string {
  if (message.includes('categories_slug_key')) {
    return t(
      'اسم الرابط (slug) مستخدم. جرّب اسماً مختلفاً.',
      'That URL slug is already taken. Try a different name.',
    );
  }
  return message;
}

export default function CategoriesPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelMode>({ kind: 'idle' });
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CategoryTreeSort>('order');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error: err } = await supabase
        .from('categories')
        .select(CATEGORY_COLS)
        .order('sort_order', { ascending: true });
      if (err) throw err;
      return (data ?? []) as unknown as Category[];
    },
  });

  const forest = useMemo(() => buildCategoryForest(categories), [categories]);
  const visibleForest = useMemo(
    () => filterAndSortForest(forest, search, sort),
    [forest, search, sort]
  );
  const searchExpandIds = useMemo(
    () => expandIdsForSearch(forest, search),
    [forest, search]
  );
  const effectiveCollapsed = useMemo(() => {
    if (!search.trim()) return collapsed;
    // While searching, force-open ancestors of matches.
    const next = new Set(collapsed);
    for (const id of searchExpandIds) next.delete(id);
    return next;
  }, [collapsed, search, searchExpandIds]);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const parentOptions = useMemo(
    () => eligibleParents(categories, panel.kind === 'edit' ? panel.id : undefined),
    [categories, panel]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const resolveLevel = (parentId: string): CategoryLevel => {
    if (!parentId) return 1;
    return categoryLevelFromParent(byId.get(parentId));
  };

  useEffect(() => {
    if (panel.kind === 'create' || panel.kind === 'edit') {
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [panel]);

  const openCreate = (parentId: string | null) => {
    setError('');
    setDraft({ name: '', name_ar: '', parent_id: parentId ?? '' });
    setPanel({ kind: 'create', parentId });
    if (parentId) setSelectedId(parentId);
  };

  const openEdit = (c: Category) => {
    setError('');
    setSelectedId(c.id);
    setDraft({
      name: c.name,
      name_ar: c.name_ar ?? '',
      parent_id: c.parent_id ?? '',
    });
    setPanel({ kind: 'edit', id: c.id });
  };

  const closePanel = () => {
    setPanel({ kind: 'idle' });
    setDraft(emptyDraft());
    setError('');
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addMutation = useMutation({
    mutationFn: async (input: Draft) => {
      const parent_id = input.parent_id || null;
      const parent = parent_id ? byId.get(parent_id) : undefined;
      if (parent && parent.level >= CATEGORY_MAX_LEVEL) {
        throw new Error(
          t(
            `لا يمكن إضافة تحت مستوى ${CATEGORY_MAX_LEVEL}`,
            `Cannot nest under a level-${CATEGORY_MAX_LEVEL} category`,
          ),
        );
      }
      if (hasSiblingNameConflict(input.name, parent_id, categories)) {
        throw new Error(
          t(
            'يوجد تصنيف بنفس الاسم تحت نفس الأب.',
            'A sibling under this parent already uses that name.',
          ),
        );
      }
      const level = resolveLevel(input.parent_id);
      const slug = uniqueCategorySlug(
        input.name,
        categories.map((c) => c.slug),
        parent?.slug ?? null
      );
      const { data, error: err } = await supabase
        .from('categories')
        .insert({
          name: input.name.trim(),
          name_ar: input.name_ar.trim() || null,
          slug,
          parent_id,
          level,
          sort_order: categories.length,
          is_active: true,
        })
        .select(CATEGORY_COLS)
        .single();
      if (err) throw err;
      return data as unknown as Category;
    },
    onSuccess: (row) => {
      setSelectedId(row.id);
      setPanel({ kind: 'idle' });
      setDraft(emptyDraft());
      setError('');
      invalidate();
    },
    onError: (e: Error) => setError(friendlyDbError(e.message, t)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
      cascades,
    }: {
      id: string;
      patch: Partial<Category>;
      cascades?: { id: string; level: CategoryLevel; parent_id: string | null }[];
    }) => {
      const { error: err } = await supabase.from('categories').update(patch).eq('id', id);
      if (err) throw err;
      if (cascades?.length) {
        // Root already updated via patch; only push descendant level rows.
        const kids = cascades.filter((row) => row.id !== id);
        for (const row of kids) {
          const { error: childErr } = await supabase
            .from('categories')
            .update({ level: row.level })
            .eq('id', row.id);
          if (childErr) throw childErr;
        }
      }
    },
    onSuccess: () => {
      setError('');
      invalidate();
    },
    onError: (e: Error) => setError(friendlyDbError(e.message, t)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from('categories').delete().eq('id', id);
      if (err) throw err;
    },
    onSuccess: (_d, id) => {
      if (selectedId === id) setSelectedId(null);
      if (panel.kind === 'edit' && panel.id === id) closePanel();
      invalidate();
    },
    onError: (e: Error) => setError(friendlyDbError(e.message, t)),
  });

  const saveCreate = () => {
    if (!draft.name.trim()) return;
    addMutation.mutate(draft);
  };

  const saveEdit = () => {
    if (panel.kind !== 'edit' || !draft.name.trim()) return;
    const parent_id = draft.parent_id || null;
    if (hasSiblingNameConflict(draft.name, parent_id, categories, panel.id)) {
      setError(
        t(
          'يوجد تصنيف بنفس الاسم تحت نفس الأب.',
          'A sibling under this parent already uses that name.',
        ),
      );
      return;
    }
    const level = resolveLevel(draft.parent_id);
    const height = subtreeHeight(categories, panel.id);
    if (level + height - 1 > CATEGORY_MAX_LEVEL) {
      setError(
        t(
          `النقل يتجاوز الحد الأقصى للمستوى (${CATEGORY_MAX_LEVEL}).`,
          `Move would exceed max nesting level (${CATEGORY_MAX_LEVEL}).`,
        ),
      );
      return;
    }
    const cascades = cascadeLevelPatches(categories, panel.id, parent_id, level);
    updateMutation.mutate(
      {
        id: panel.id,
        patch: {
          name: draft.name.trim(),
          name_ar: draft.name_ar.trim() || null,
          parent_id,
          level,
        },
        cascades,
      },
      { onSuccess: () => setPanel({ kind: 'idle' }) },
    );
  };

  const previewLevel = resolveLevel(draft.parent_id);
  const createParent = draft.parent_id ? byId.get(draft.parent_id) : undefined;
  const createPath = createParent ? categoryPathLabel(createParent, byId, lang) : '';
  const siblingConflict =
    draft.name.trim().length > 0 &&
    hasSiblingNameConflict(
      draft.name,
      draft.parent_id || null,
      categories,
      panel.kind === 'edit' ? panel.id : undefined
    );

  const confirmDelete = (c: Category) => {
    setDeleteTarget(c);
  };

  const deleteTargetMsg = deleteTarget
    ? (() => {
        const kids = categories.filter((x) => x.parent_id === deleteTarget.id).length;
        return kids > 0
          ? t(
              `حذف «${deleteTarget.name}» و ${kids} ابن؟ لا يمكن التراجع.`,
              `Delete “${deleteTarget.name}” and ${kids} child(ren)? Cannot undo.`,
            )
          : t(
              `حذف «${deleteTarget.name}»؟ لا يمكن التراجع.`,
              `Delete “${deleteTarget.name}”? Cannot undo.`,
            );
      })()
    : '';

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const mains = forest.length;
  const countLabel =
    categories.length === 1 ? t('تصنيف', 'category') : t('تصنيفات', 'categories');

  return (
    <div className="owner-tree mx-auto w-full max-w-6xl text-start">
      <header className="owner-tree__hero">
        <div className="min-w-0">
          <p className="owner-tree__kicker">{t('تصنيف الخزنة', 'Vault taxonomy')}</p>
          <h2 className="owner-tree__title text-balance">{t('التصنيفات', 'Categories')}</h2>
          <p className="owner-tree__lede text-pretty">
            {t(
              'ابنِ شجرة المتجر: رئيسي → فرعي → فرعي ثانوي. المنتجات ترتبط بتصنيف واحد مباشرة.',
              'Build the store tree: Main → Sub → Sub-sub. Products attach to one category directly.',
            )}
          </p>
        </div>
        <div className="owner-tree__hero-aside">
          <p className="owner-tree__count" aria-live="polite">
            <strong className="tabular-nums">{isLoading ? '—' : categories.length}</strong>
            <span>
              {countLabel}
              {!isLoading && mains > 0 ? ` · ${mains} ${t('رئيسي', 'main')}` : ''}
            </span>
          </p>
          <button
            type="button"
            className={`owner-tree__cta ${focusRing}`}
            onClick={() => openCreate(null)}
          >
            <Plus size={16} aria-hidden />
            {t('رئيسي جديد', 'New main')}
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          {error}
        </div>
      )}

      <div className="owner-tree__stage">
        <section className="owner-tree__rail" aria-label={t('الشجرة', 'Tree')}>
          <div className="owner-tree__rail-head">
            <div className="owner-tree__rail-title">
              <FolderTree size={16} aria-hidden />
              <h3>{t('الشجرة', 'Tree')}</h3>
            </div>
            <div className="owner-tree__toolbar">
              <label className="owner-tree__search">
                <Search size={14} aria-hidden />
                <span className="sr-only">{t('بحث', 'Search')}</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('بحث بالاسم…', 'Search by name…')}
                />
                {search ? (
                  <button
                    type="button"
                    className={`owner-tree__search-clear ${focusRing}`}
                    onClick={() => setSearch('')}
                    aria-label={t('مسح', 'Clear')}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>
              <details className="dropdown dropdown-end owner-tree__sort-dd">
                <summary
                  className="owner-tree__sort-btn"
                  aria-label={t('ترتيب', 'Sort')}
                >
                  <span>
                    {sort === 'name_asc'
                      ? t('الاسم أ→ي', 'Name A→Z')
                      : sort === 'name_desc'
                        ? t('الاسم ي→أ', 'Name Z→A')
                        : t('الترتيب الافتراضي', 'Default order')}
                  </span>
                  <ChevronDown size={14} className="owner-tree__sort-chev" aria-hidden />
                </summary>
                <ul
                  className="dropdown-content menu owner-tree__sort-menu bg-base-200 rounded-box z-30 w-48 p-1 shadow-md border border-base-300"
                  role="listbox"
                  aria-label={t('ترتيب', 'Sort')}
                >
                  {(
                    [
                      { id: 'order' as const, ar: 'الترتيب الافتراضي', en: 'Default order' },
                      { id: 'name_asc' as const, ar: 'الاسم أ→ي', en: 'Name A→Z' },
                      { id: 'name_desc' as const, ar: 'الاسم ي→أ', en: 'Name Z→A' },
                    ] satisfies { id: CategoryTreeSort; ar: string; en: string }[]
                  ).map((opt) => {
                    const on = sort === opt.id;
                    return (
                      <li key={opt.id} role="option" aria-selected={on}>
                        <button
                          type="button"
                          className={on ? 'menu-active' : undefined}
                          disabled={on}
                          onClick={(e) => {
                            const root = (e.currentTarget as HTMLElement).closest('details');
                            if (root) root.open = false;
                            setSort(opt.id);
                          }}
                        >
                          {t(opt.ar, opt.en)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>
          </div>

          {isLoading ? (
            <div className="owner-tree__list" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="owner-tree__skel" />
              ))}
            </div>
          ) : forest.length === 0 ? (
            <div className="owner-tree__empty">
              <FolderTree size={28} aria-hidden />
              <p className="text-pretty">
                {t(
                  'لا تصنيفات بعد. ابدأ بتصنيف رئيسي مثل Games.',
                  'No categories yet. Start with a main category like Games.',
                )}
              </p>
              <button
                type="button"
                className={`owner-tree__cta owner-tree__cta--sm ${focusRing}`}
                onClick={() => openCreate(null)}
              >
                <Plus size={14} aria-hidden />
                {t('إضافة رئيسي', 'Add main')}
              </button>
            </div>
          ) : visibleForest.length === 0 ? (
            <div className="owner-tree__empty owner-tree__empty--soft">
              <p>{t('لا نتائج لهذا البحث.', 'No results for this search.')}</p>
            </div>
          ) : (
            <ul className="owner-tree__list" role="tree">
              {visibleForest.map((node, i) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  index={i}
                  lang={lang}
                  t={t}
                  selectedId={selectedId}
                  collapsed={effectiveCollapsed}
                  onSelect={(id) => {
                    setSelectedId(id);
                    if (panel.kind === 'edit' && panel.id !== id) setPanel({ kind: 'idle' });
                  }}
                  onToggle={toggleCollapse}
                  onAddChild={(id) => openCreate(id)}
                  onEdit={openEdit}
                />
              ))}
            </ul>
          )}
        </section>

        <aside className="owner-tree__pane" aria-label={t('التفاصيل', 'Details')}>
          {panel.kind === 'create' && (
            <PanelShell
              title={
                createParent
                  ? t(`إضافة ${levelLabel(previewLevel, t)}`, `Add ${levelLabel(previewLevel, t)}`)
                  : t('رئيسي جديد', 'New main')
              }
              onClose={closePanel}
            >
              {createParent && (
                <p className="owner-tree__path" dir="ltr">
                  {createPath}
                </p>
              )}
              <DraftFields
                draft={draft}
                setDraft={setDraft}
                nameRef={nameRef}
                parentOptions={parentOptions}
                byId={byId}
                lang={lang}
                t={t}
                previewLevel={previewLevel}
                allowParentPick={!createParent}
                siblingConflict={siblingConflict}
              />
              <div className="owner-tree__actions">
                <button
                  type="button"
                  className={`owner-tree__cta owner-tree__cta--grow ${focusRing}`}
                  disabled={addMutation.isPending || siblingConflict || !draft.name.trim()}
                  onClick={saveCreate}
                >
                  {addMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t('إنشاء', 'Create')}
                </button>
                <button type="button" className={`owner-tree__ghost ${focusRing}`} onClick={closePanel}>
                  {t('إلغاء', 'Cancel')}
                </button>
              </div>
            </PanelShell>
          )}

          {panel.kind === 'edit' && selected && (
            <PanelShell title={t('تعديل', 'Edit')} onClose={closePanel}>
              <p className="owner-tree__path" dir="ltr">
                {categoryPathLabel(selected, byId, lang)}
              </p>
              <DraftFields
                draft={draft}
                setDraft={setDraft}
                nameRef={nameRef}
                parentOptions={parentOptions}
                byId={byId}
                lang={lang}
                t={t}
                previewLevel={resolveLevel(draft.parent_id)}
                allowParentPick
                siblingConflict={siblingConflict}
              />
              <div className="owner-tree__actions">
                <button
                  type="button"
                  className={`owner-tree__cta owner-tree__cta--grow ${focusRing}`}
                  disabled={updateMutation.isPending || siblingConflict || !draft.name.trim()}
                  onClick={saveEdit}
                >
                  {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {t('حفظ', 'Save')}
                </button>
                <button type="button" className={`owner-tree__ghost ${focusRing}`} onClick={closePanel}>
                  {t('إلغاء', 'Cancel')}
                </button>
              </div>
            </PanelShell>
          )}

          {panel.kind === 'idle' && !selected && (
            <div className="owner-tree__pane-empty">
              <FolderTree size={32} aria-hidden />
              <p className="text-pretty">
                {t(
                  'اختر تصنيفاً من الشجرة، أو أنشئ رئيساً جديداً.',
                  'Select a category in the tree, or create a new main.',
                )}
              </p>
            </div>
          )}

          {panel.kind === 'idle' && selected && (
            <PanelShell
              title={lang === 'ar' ? selected.name_ar || selected.name : selected.name}
              onClose={() => setSelectedId(null)}
            >
              <p className="owner-tree__path" dir="ltr">
                {categoryPathLabel(selected, byId, lang)}
              </p>

              <dl className="owner-tree__meta">
                <div>
                  <dt>{t('المستوى', 'Level')}</dt>
                  <dd>
                    <span className={`owner-tree__level owner-tree__level--${selected.level}`}>
                      {levelLabel(selected.level, t)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>{t('عربي', 'Arabic')}</dt>
                  <dd dir="rtl" className="truncate">
                    {selected.name_ar || <span className="owner-tree__muted">—</span>}
                  </dd>
                </div>
              </dl>

              <div className="owner-tree__storefront">
                <p className="owner-tree__storefront-label">{t('واجهة المتجر', 'Storefront')}</p>
                <label className="owner-tree__toggle">
                  <span>{t('ظاهر في المتجر', 'Visible in store')}</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-success"
                    checked={selected.is_active}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (!next) {
                        const kids = categories.filter((c) => c.parent_id === selected.id);
                        if (kids.length > 0) {
                          setError(
                            t(
                              'عطّل أو انقل الأبناء أولاً قبل إخفاء هذا التصنيف.',
                              'Deactivate or move children first before hiding this category.',
                            ),
                          );
                          return;
                        }
                      }
                      updateMutation.mutate({
                        id: selected.id,
                        patch: { is_active: next },
                      });
                    }}
                  />
                </label>
                <label className="owner-tree__toggle">
                  <span>{t('هالة مزدوجة', 'Dual aura')}</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-primary"
                    checked={selected.aura_dual ?? false}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: selected.id,
                        patch: { aura_dual: e.target.checked },
                      })
                    }
                  />
                </label>
              </div>

              <div className="owner-tree__stack">
                {selected.level < CATEGORY_MAX_LEVEL && (
                  <button
                    type="button"
                    className={`owner-tree__action ${focusRing}`}
                    onClick={() => openCreate(selected.id)}
                  >
                    <Plus size={14} aria-hidden />
                    {selected.level === 1
                      ? t('إضافة فرعي', 'Add sub')
                      : t('إضافة تحت', 'Add under')}
                  </button>
                )}
                <button
                  type="button"
                  className={`owner-tree__action ${focusRing}`}
                  onClick={() => openEdit(selected)}
                >
                  <Pencil size={14} aria-hidden />
                  {t('تعديل الاسم / الأب', 'Edit name / parent')}
                </button>
                <button
                  type="button"
                  className={`owner-tree__action owner-tree__action--danger ${focusRing}`}
                  onClick={() => confirmDelete(selected)}
                >
                  <Trash2 size={14} aria-hidden />
                  {t('حذف', 'Delete')}
                </button>
              </div>
            </PanelShell>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
          });
        }}
        busy={deleteMutation.isPending}
        danger
        title={t('حذف التصنيف', 'Delete category')}
        body={deleteTargetMsg}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}

function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="owner-tree__panel">
      <div className="owner-tree__panel-head">
        <h3 className="owner-tree__panel-title text-balance">{title}</h3>
        <button
          type="button"
          className="owner-tree__icon-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}

function DraftFields({
  draft,
  setDraft,
  nameRef,
  parentOptions,
  byId,
  lang,
  t,
  previewLevel,
  allowParentPick,
  siblingConflict,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  nameRef: RefObject<HTMLInputElement>;
  parentOptions: Category[];
  byId: Map<string, Category>;
  lang: string;
  t: (ar: string, en: string) => string;
  previewLevel: CategoryLevel;
  allowParentPick: boolean;
  siblingConflict: boolean;
}) {
  return (
    <div className="owner-tree__fields">
      <label className="owner-tree__field">
        <span>{t('الاسم (إنجليزي)', 'Name (English)')}</span>
        <input
          ref={nameRef}
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className={siblingConflict ? 'is-warn' : undefined}
          placeholder={previewLevel === 1 ? 'Games' : previewLevel === 2 ? 'GTA 5' : 'GTA 5 Gift Card'}
        />
      </label>
      <label className="owner-tree__field">
        <span>{t('الاسم (عربي، اختياري)', 'Name (Arabic, optional)')}</span>
        <input
          type="text"
          value={draft.name_ar}
          onChange={(e) => setDraft((d) => ({ ...d, name_ar: e.target.value }))}
          dir="rtl"
          placeholder="ألعاب"
        />
      </label>
      {allowParentPick && (
        <label className="owner-tree__field">
          <span>{t('تحت تصنيف', 'Under category')}</span>
          <select
            value={draft.parent_id}
            onChange={(e) => setDraft((d) => ({ ...d, parent_id: e.target.value }))}
          >
            <option value="">{t('— رئيسي —', '— Main —')}</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryPathLabel(c, byId, lang)}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="owner-tree__level-hint">
        {t('المستوى', 'Level')}:{' '}
        <span className={`owner-tree__level owner-tree__level--${previewLevel}`}>
          {levelLabel(previewLevel, t)}
        </span>
      </p>
      {siblingConflict && (
        <p role="status" className="owner-tree__warn">
          {t('اسم مكرر تحت نفس الأب.', 'Duplicate name under the same parent.')}
        </p>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  index = 0,
  lang,
  t,
  selectedId,
  collapsed,
  onSelect,
  onToggle,
  onAddChild,
  onEdit,
}: {
  node: CategoryNode;
  depth: number;
  index?: number;
  lang: string;
  t: (ar: string, en: string) => string;
  selectedId: string | null;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onEdit: (c: Category) => void;
}) {
  const hasKids = node.children.length > 0;
  const isOpen = !collapsed.has(node.id);
  const selected = selectedId === node.id;
  const label = lang === 'ar' ? node.name_ar || node.name : node.name;
  const kids = countDescendants(node);

  return (
    <li
      role="treeitem"
      aria-expanded={hasKids ? isOpen : undefined}
      aria-selected={selected}
      className="owner-tree__node-wrap"
      style={{ ['--owner-i' as string]: String(index + depth) }}
    >
      <div
        className={[
          'owner-tree__node',
          `owner-tree__node--l${node.level}`,
          selected ? 'is-selected' : '',
          node.is_active ? '' : 'is-dim',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ['--owner-depth' as string]: String(depth) }}
      >
        <button
          type="button"
          className={`owner-tree__chev ${hasKids ? '' : 'is-ghost'}`}
          onClick={() => onToggle(node.id)}
          aria-label={isOpen ? t('طي', 'Collapse') : t('توسيع', 'Expand')}
          tabIndex={hasKids ? 0 : -1}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <button type="button" className="owner-tree__pick" onClick={() => onSelect(node.id)}>
          <span className="owner-tree__name truncate">{label}</span>
          <span className="owner-tree__sub truncate">
            <span className={`owner-tree__level owner-tree__level--${node.level}`}>
              {levelLabel(node.level, t)}
            </span>
            {kids > 0 ? <span className="owner-tree__kids"> · {kids}</span> : null}
            {lang !== 'ar' && node.name_ar ? (
              <>
                <span className="owner-tree__sep" aria-hidden>
                  {' · '}
                </span>
                <span className="owner-tree__alt" dir="rtl">
                  {node.name_ar}
                </span>
              </>
            ) : null}
            {lang === 'ar' && node.name && node.name !== label ? (
              <>
                <span className="owner-tree__sep" aria-hidden>
                  {' · '}
                </span>
                <span className="owner-tree__alt" dir="ltr">
                  {node.name}
                </span>
              </>
            ) : null}
          </span>
        </button>

        <div className="owner-tree__node-ops">
          {node.level < CATEGORY_MAX_LEVEL && (
            <button
              type="button"
              className="owner-tree__icon-btn"
              onClick={() => onAddChild(node.id)}
              aria-label={t('إضافة تحت', 'Add under')}
              title={t('إضافة تحت', 'Add under')}
            >
              <Plus size={13} />
            </button>
          )}
          <button
            type="button"
            className="owner-tree__icon-btn"
            onClick={() => onEdit(node)}
            aria-label={t('تعديل', 'Edit')}
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {hasKids && isOpen && (
        <ul role="group" className="owner-tree__branch">
          {node.children.map((ch, i) => (
            <TreeNode
              key={ch.id}
              node={ch}
              depth={depth + 1}
              index={i}
              lang={lang}
              t={t}
              selectedId={selectedId}
              collapsed={collapsed}
              onSelect={onSelect}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
