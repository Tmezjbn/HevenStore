import type { Category } from '../types';

/** Max nesting depth (root = 1). Raised from 3 → 6. */
export const CATEGORY_MAX_LEVEL = 6;

export type CategoryLevel = 1 | 2 | 3 | 4 | 5 | 6;

function asLevel(n: number): CategoryLevel {
  const v = Math.min(CATEGORY_MAX_LEVEL, Math.max(1, Math.round(n)));
  return v as CategoryLevel;
}

/** DFS flatten for selects/tables: root → leaves. */
export function flattenCategoryTree(cats: Category[]): Category[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of cats) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  const out: Category[] = [];
  const walk = (parentId: string | null) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(null);
  // Orphans (parent missing from list) — append so nothing disappears.
  const seen = new Set(out.map((c) => c.id));
  for (const c of cats) {
    if (!seen.has(c.id)) out.push(c);
  }
  return out;
}

export function categoryLevelFromParent(parent: Category | null | undefined): CategoryLevel {
  if (!parent) return 1;
  if (parent.level >= CATEGORY_MAX_LEVEL) return CATEGORY_MAX_LEVEL as CategoryLevel;
  return asLevel(parent.level + 1);
}

/** Parents allowed when creating/editing: any node above max leaf level. */
export function eligibleParents(cats: Category[], selfId?: string): Category[] {
  return flattenCategoryTree(cats).filter(
    (c) =>
      c.level < CATEGORY_MAX_LEVEL &&
      c.id !== selfId &&
      !isDescendantOf(cats, c.id, selfId),
  );
}

function isDescendantOf(cats: Category[], nodeId: string, ancestorId: string | undefined): boolean {
  if (!ancestorId) return false;
  const byId = new Map(cats.map((c) => [c.id, c]));
  let cur = byId.get(nodeId);
  while (cur?.parent_id) {
    if (cur.parent_id === ancestorId) return true;
    cur = byId.get(cur.parent_id);
  }
  return false;
}

export function indentPrefix(level: number): string {
  if (level <= 1) return '';
  return `${'—'.repeat(level - 1)} `;
}

export function levelLabel(level: number, t: (ar: string, en: string) => string): string {
  if (level === 1) return t('رئيسي', 'Main');
  if (level === 2) return t('فرعي', 'Sub');
  if (level === 3) return t('فرعي ثانوي', 'Sub-sub');
  return t(`مستوى ${level}`, `Level ${level}`);
}

/** Self + all descendant category ids (BFS). */
export function descendantIds(cats: Category[], rootId: string): string[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of cats) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const ch of byParent.get(id) ?? []) stack.push(ch.id);
  }
  return out;
}

export function findCategoryBySlug(cats: Category[], slug: string): Category | undefined {
  const needle = slug.trim().toLowerCase();
  if (!needle) return undefined;
  return cats.find((c) => c.slug.toLowerCase() === needle);
}

/** Depth of subtree rooted at `rootId` (leaf = 1). */
export function subtreeHeight(cats: Category[], rootId: string): number {
  const kids = cats.filter((c) => c.parent_id === rootId);
  if (kids.length === 0) return 1;
  let max = 0;
  for (const k of kids) max = Math.max(max, subtreeHeight(cats, k.id));
  return 1 + max;
}

/**
 * Level patches for a node + all descendants after reparent.
 * `root` gets `newLevel` / `newParentId`; children recompute from that.
 */
export function cascadeLevelPatches(
  cats: Category[],
  rootId: string,
  newParentId: string | null,
  newLevel: CategoryLevel,
): { id: string; level: CategoryLevel; parent_id: string | null }[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of cats) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const out: { id: string; level: CategoryLevel; parent_id: string | null }[] = [
    { id: rootId, level: newLevel, parent_id: newParentId },
  ];
  const walk = (parentId: string, parentLevel: CategoryLevel) => {
    for (const ch of byParent.get(parentId) ?? []) {
      if (ch.id === rootId) continue;
      const level = asLevel(parentLevel + 1);
      out.push({ id: ch.id, level, parent_id: ch.parent_id });
      walk(ch.id, level);
    }
  };
  walk(rootId, newLevel);
  return out;
}

export function slugifyCategoryName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`
  );
}

/** Slugs are globally unique — nest under parent slug, then suffix -2/-3 if needed. */
export function uniqueCategorySlug(
  name: string,
  existingSlugs: Iterable<string>,
  parentSlug?: string | null
): string {
  const taken = new Set(
    [...existingSlugs].map((s) => s.toLowerCase())
  );
  const leaf = slugifyCategoryName(name);
  const parent = parentSlug ? slugifyCategoryName(parentSlug) : '';
  const root = parent ? `${parent}-${leaf}` : leaf;
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/** Ancestor chain including self, root → leaf. */
export function categoryPath(
  cat: Category,
  byId: Map<string, Category>
): Category[] {
  const chain: Category[] = [];
  let cur: Category | undefined = cat;
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    chain.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return chain;
}

export function categoryPathLabel(
  cat: Category,
  byId: Map<string, Category>,
  lang: string
): string {
  return categoryPath(cat, byId)
    .map((c) => (lang === 'ar' ? c.name_ar || c.name : c.name))
    .join(' › ');
}

/** True if another category under the same parent already uses this EN name (case-insensitive). */
export function hasSiblingNameConflict(
  name: string,
  parentId: string | null,
  cats: Category[],
  excludeId?: string
): boolean {
  const needle = name.trim().toLowerCase();
  if (!needle) return false;
  return cats.some(
    (c) =>
      c.id !== excludeId &&
      (c.parent_id ?? null) === parentId &&
      c.name.trim().toLowerCase() === needle
  );
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

/** Nested forest for tree UI (roots = mains).
 * Parent missing from `cats` (e.g. inactive filtered out) → node hidden, not promoted to root.
 */
export function buildCategoryForest(cats: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of cats) map.set(c.id, { ...c, children: [] });
  const roots: CategoryNode[] = [];
  for (const c of cats) {
    const node = map.get(c.id)!;
    if (c.parent_id) {
      const parent = map.get(c.parent_id);
      if (parent) parent.children.push(node);
      // else: orphan under inactive/missing parent — omit from forest
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

export function countDescendants(node: CategoryNode): number {
  let n = node.children.length;
  for (const ch of node.children) n += countDescendants(ch);
  return n;
}

export type CategoryTreeSort = 'order' | 'name_asc' | 'name_desc';

function nodeMatchesQuery(node: CategoryNode, q: string): boolean {
  if (!q) return true;
  return (
    node.name.toLowerCase().includes(q) ||
    (node.name_ar || '').toLowerCase().includes(q) ||
    node.slug.toLowerCase().includes(q)
  );
}

function sortNodes(nodes: CategoryNode[], sort: CategoryTreeSort): CategoryNode[] {
  const next = [...nodes];
  if (sort === 'name_asc') {
    next.sort((a, b) => a.name.localeCompare(b.name) || a.sort_order - b.sort_order);
  } else if (sort === 'name_desc') {
    next.sort((a, b) => b.name.localeCompare(a.name) || a.sort_order - b.sort_order);
  } else {
    next.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }
  return next.map((n) => ({ ...n, children: sortNodes(n.children, sort) }));
}

/** Keep ancestors of matches; expand filter hits. Empty query = full sorted forest. */
export function filterAndSortForest(
  forest: CategoryNode[],
  query: string,
  sort: CategoryTreeSort
): CategoryNode[] {
  const q = query.trim().toLowerCase();
  const walk = (nodes: CategoryNode[]): CategoryNode[] => {
    const out: CategoryNode[] = [];
    for (const n of nodes) {
      const kids = walk(n.children);
      if (!q || nodeMatchesQuery(n, q) || kids.length > 0) {
        out.push({ ...n, children: kids });
      }
    }
    return sortNodes(out, sort);
  };
  return walk(forest);
}

/** IDs that should stay expanded while searching (ancestors of hits). */
export function expandIdsForSearch(forest: CategoryNode[], query: string): Set<string> {
  const q = query.trim().toLowerCase();
  const open = new Set<string>();
  if (!q) return open;
  const walk = (nodes: CategoryNode[], ancestors: string[]): boolean => {
    let any = false;
    for (const n of nodes) {
      const childHit = walk(n.children, [...ancestors, n.id]);
      const self = nodeMatchesQuery(n, q);
      if (self || childHit) {
        for (const a of ancestors) open.add(a);
        if (childHit) open.add(n.id);
        any = true;
      }
    }
    return any;
  };
  walk(forest, []);
  return open;
}
