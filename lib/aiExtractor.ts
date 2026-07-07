import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  CrmRecord,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  CRM_FIELD_ORDER,
} from "./types";



const BATCH_SIZE = 20; 

let client: GoogleGenerativeAI | null = null;
function getClient() {
  if (!client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenerativeAI(key);
  }
  return client;
}


const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    rows: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          row_index: { type: SchemaType.NUMBER },
          skip: { type: SchemaType.BOOLEAN },
          skip_reason: { type: SchemaType.STRING },
          created_at: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          email: { type: SchemaType.STRING },
          country_code: { type: SchemaType.STRING },
          mobile_without_country_code: { type: SchemaType.STRING },
          company: { type: SchemaType.STRING },
          city: { type: SchemaType.STRING },
          state: { type: SchemaType.STRING },
          country: { type: SchemaType.STRING },
          lead_owner: { type: SchemaType.STRING },
          crm_status: { type: SchemaType.STRING },
          crm_note: { type: SchemaType.STRING },
          data_source: { type: SchemaType.STRING },
          possession_time: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["row_index", "skip"],
      },
    },
  },
  required: ["rows"],
};

function buildSystemPrompt(): string {
  return `You are a data-mapping engine for a real estate / sales CRM called GrowEasy.

You will receive raw CSV rows exported from arbitrary sources (Facebook Lead Ads,
Google Ads, Excel sheets, other CRMs, manually made spreadsheets). Column names,
order, and casing are NOT standardized — you must infer meaning from header text,
sample values, and context, not from exact string matches.

Map each row to this exact target schema: ${CRM_FIELD_ORDER.join(", ")}.

Field semantics:
- created_at: lead creation date/time. Must be a string parseable by JavaScript's
  \`new Date(created_at)\`. If the source has an ambiguous or partial date, do your
  best reasonable ISO-like conversion; never invent a date that isn't implied by the row.
- name: the lead/person's full name.
- email: the PRIMARY email only. If more than one email address appears anywhere in
  the row, use the first as \`email\` and append the rest into crm_note
  (e.g. "Additional email: x@y.com").
- mobile_without_country_code: the phone number WITHOUT country code/prefix. If more
  than one phone number appears, use the first as this field and append the rest into
  crm_note (e.g. "Additional phone: 9998887777").
- country_code: dialing code only (e.g. "+91"), separate from the phone digits.
- crm_status: MUST be exactly one of: ${CRM_STATUS_VALUES.join(", ")}. If the row gives
  no confident signal for status, return an empty string — never invent a value outside
  this list and never guess if unsure.
- data_source: MUST be exactly one of: ${DATA_SOURCE_VALUES.join(", ")}. If none match
  confidently, return an empty string.
- crm_note: remarks, follow-up notes, extra emails/phones, or any useful information
  that doesn't map cleanly to another field. Never silently drop information — if
  something doesn't fit elsewhere and seems useful, put it here.
- Any field with no corresponding data in the row: return an empty string "", never null,
  never omit the key.

Skip rule: if a row contains NEITHER an email address NOR a phone number anywhere in
its fields, set skip: true and give a one-line skip_reason (e.g.
"no email or phone number present"). Otherwise skip: false.

Formatting rule: every value must be safe to place in a single CSV cell — no raw
newlines. If you need to represent a line break inside a value (e.g. a multi-line
note), escape it as the two characters backslash-n, not an actual newline.

Return ONLY the structured JSON matching the given schema. Do not guess or fabricate
any information not present or reasonably implied by the row data.`;
}

interface RawRow {
  index: number;
  data: Record<string, string>;
}

async function extractBatch(rows: RawRow[]): Promise<
  {
    row_index: number;
    skip: boolean;
    skip_reason?: string;
    [key: string]: unknown;
  }[]
> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as never,
      temperature: 0, // deterministic mapping — we want consistency, not creativity
    },
  });

  const userPayload = rows.map((r) => ({ row_index: r.index, ...r.data }));

  const result = await model.generateContent(
    `Map the following ${rows.length} CSV rows:\n\n${JSON.stringify(userPayload, null, 2)}`
  );

  const text = result.response.text();
  const parsed = JSON.parse(text);
  return parsed.rows ?? [];
}

/** Retry once on transient failure — batches are independent, so one bad
 * batch shouldn't take down the whole import. */
async function extractBatchWithRetry(rows: RawRow[]) {
  try {
    return await extractBatch(rows);
  } catch (err) {
    console.error(`Batch starting at row ${rows[0]?.index} failed, retrying once:`, err);
    try {
      return await extractBatch(rows);
    } catch (err2) {
      console.error(`Batch starting at row ${rows[0]?.index} failed again, marking as skipped:`, err2);
      return rows.map((r) => ({
        row_index: r.index,
        skip: true,
        skip_reason: "AI extraction failed after retry",
      }));
    }
  }
}

export async function extractCrmRecords(
  parsedRows: Record<string, string>[]
): Promise<{ raw: RawRow[]; aiResults: Awaited<ReturnType<typeof extractBatch>> }> {
  const raw: RawRow[] = parsedRows.map((data, index) => ({ index, data }));

  const batches: RawRow[][] = [];
  for (let i = 0; i < raw.length; i += BATCH_SIZE) {
    batches.push(raw.slice(i, i + BATCH_SIZE));
  }

  
  const batchResults = await Promise.all(batches.map(extractBatchWithRetry));

  return { raw, aiResults: batchResults.flat() };
}

export type { CrmRecord };
