import {
  CrmRecord,
  SkippedRecord,
  ImportResult,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
} from "./types";


function safeString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().replace(/\r?\n/g, "\\n");
}

function enforceEnum<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  const v = safeString(value);
  return (allowed as readonly string[]).includes(v) ? (v as T) : "";
}

function isValidDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

interface RawAiRow {
  row_index: number;
  skip: boolean;
  skip_reason?: string;
  [key: string]: unknown;
}

export function buildImportResult(
  rawRows: { index: number; data: Record<string, string> }[],
  aiResults: RawAiRow[]
): ImportResult {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  const resultByIndex = new Map(aiResults.map((r) => [r.row_index, r]));

  for (const row of rawRows) {
    const ai = resultByIndex.get(row.index);

    if (!ai) {
      skipped.push({
        _sourceRowIndex: row.index,
        reason: "No AI response returned for this row",
        rawRow: row.data,
      });
      continue;
    }

    const email = safeString(ai.email);
    const mobile = safeString(ai.mobile_without_country_code);

    
    const shouldSkip = ai.skip === true || (!email && !mobile);

    if (shouldSkip) {
      skipped.push({
        _sourceRowIndex: row.index,
        reason: ai.skip_reason || "No email or mobile number present",
        rawRow: row.data,
      });
      continue;
    }

    const created_at_raw = safeString(ai.created_at);

    imported.push({
      created_at: isValidDate(created_at_raw) ? created_at_raw : "",
      name: safeString(ai.name),
      email,
      country_code: safeString(ai.country_code),
      mobile_without_country_code: mobile,
      company: safeString(ai.company),
      city: safeString(ai.city),
      state: safeString(ai.state),
      country: safeString(ai.country),
      lead_owner: safeString(ai.lead_owner),
      crm_status: enforceEnum(ai.crm_status, CRM_STATUS_VALUES),
      crm_note: safeString(ai.crm_note),
      data_source: enforceEnum(ai.data_source, DATA_SOURCE_VALUES),
      possession_time: safeString(ai.possession_time),
      description: safeString(ai.description),
      _sourceRowIndex: row.index,
    });
  }

  return {
    imported,
    skipped,
    total_imported: imported.length,
    total_skipped: skipped.length,
  };
}
