/** Markers for mixed freeform + labeled fulfillment in product_secrets.content */
export const DETAILS_MARK = '---PRODUCT_DETAILS---';
export const VALUES_MARK = '---PRODUCT_VALUES---';

export type ParsedSecret = {
  details: string;
  /** Raw "Label: value" lines (admin form). */
  valueLines: string;
};

/** Split stored secret into freeform details + labeled value block. */
export function parseSecretContent(content: string | null | undefined): ParsedSecret {
  if (!content?.trim()) return { details: '', valueLines: '' };

  const hasDetails = content.includes(DETAILS_MARK);
  const hasValues = content.includes(VALUES_MARK);

  if (!hasDetails && !hasValues) {
    // Legacy: all lines treated as labeled fields.
    return { details: '', valueLines: content.trim() };
  }

  let details = '';
  let valueLines = '';

  if (hasDetails && hasValues) {
    const dIdx = content.indexOf(DETAILS_MARK);
    const vIdx = content.indexOf(VALUES_MARK);
    if (dIdx < vIdx) {
      details = content.slice(dIdx + DETAILS_MARK.length, vIdx).trim();
      valueLines = content.slice(vIdx + VALUES_MARK.length).trim();
    } else {
      valueLines = content.slice(vIdx + VALUES_MARK.length, dIdx).trim();
      details = content.slice(dIdx + DETAILS_MARK.length).trim();
    }
  } else if (hasDetails) {
    details = content.slice(content.indexOf(DETAILS_MARK) + DETAILS_MARK.length).trim();
  } else {
    valueLines = content.slice(content.indexOf(VALUES_MARK) + VALUES_MARK.length).trim();
  }

  return { details, valueLines };
}

/** Build product_secrets.content from optional details + labeled fields text. */
export function serializeSecretContent(details: string, valueLines: string): string {
  const d = details.trim();
  const v = valueLines.trim();
  if (!d && !v) return '';
  if (d && !v) return `${DETAILS_MARK}\n${d}`;
  if (!d && v) {
    // Values-only: keep legacy format so existing buyers/parsers stay simple.
    return v;
  }
  return `${DETAILS_MARK}\n${d}\n\n${VALUES_MARK}\n${v}`;
}

/** Strip "Label: " prefixes from labeled lines only. */
function valuesOnlyFromLines(valueLines: string): string {
  if (!valueLines.trim()) return '';
  return valueLines
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const idx = trimmed.indexOf(':');
      if (idx === -1) return trimmed;
      return trimmed.slice(idx + 1).trim();
    })
    .filter(Boolean)
    .join('\n');
}

/** Buyer-facing fulfillment: freeform details as-is + values without labels. */
export function fulfillmentValuesOnly(content: string | null | undefined): string {
  if (!content?.trim()) return '';
  const { details, valueLines } = parseSecretContent(content);
  const values = valuesOnlyFromLines(valueLines);
  if (details && values) return `${details}\n\n${values}`;
  return details || values;
}

/** One claimed key + optional override (same marker format as product_secrets). */
export type FulfillmentKeyUnit = {
  content: string;
  details?: string | null;
};

/** Normalize RPC/archive jsonb into key units (null if empty/missing). */
export function parseKeyUnits(raw: unknown): FulfillmentKeyUnit[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const units: FulfillmentKeyUnit[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const content = String((row as { content?: unknown }).content ?? '').trim();
    if (!content) continue;
    const detailsRaw = (row as { details?: unknown }).details;
    const details =
      typeof detailsRaw === 'string' && detailsRaw.trim() ? detailsRaw : null;
    units.push({ content, details });
  }
  return units.length ? units : null;
}

/** Full buyer-facing text: product default (or per-key override) + keys. */
export function fulfillmentDisplay(
  content: string | null | undefined,
  keys: string | null | undefined,
  keyUnits?: FulfillmentKeyUnit[] | null,
): string {
  if (keyUnits && keyUnits.length > 0) {
    return keyUnits
      .map((u) => {
        const raw = u.details?.trim() ? u.details : content;
        const info = fulfillmentValuesOnly(raw);
        const k = u.content.trim();
        if (info && k) return `${info}\n\n${k}`;
        return info || k;
      })
      .filter(Boolean)
      .join('\n\n');
  }
  const info = fulfillmentValuesOnly(content);
  const k = keys?.trim() ?? '';
  if (info && k) return `${info}\n\n${k}`;
  return info || k;
}
