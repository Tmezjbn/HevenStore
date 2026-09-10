/** Public storefront specs: label + value (e.g. Operating System → Windows). */

export type RequirementPair = { label: string; value: string };

export function parseRequirements(raw: unknown): RequirementPair[] {
  if (!Array.isArray(raw)) return [];
  const out: RequirementPair[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const value = typeof o.value === 'string' ? o.value.trim() : '';
    if (!label && !value) continue;
    out.push({ label, value });
  }
  return out;
}

export function serializeRequirements(
  pairs: Array<{ label: string; value: string }>,
): RequirementPair[] {
  return pairs
    .map((p) => ({ label: p.label.trim(), value: p.value.trim() }))
    .filter((p) => p.label || p.value);
}
