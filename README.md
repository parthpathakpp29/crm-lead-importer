# GrowEasy CRM Lead Importer

An AI-powered CSV importer that maps leads from **any** CSV layout — Facebook Lead Ads,
Google Ads exports, Excel sheets, other CRMs, hand-built spreadsheets — into GrowEasy's
CRM schema, without assuming fixed column names.

## Live demo

- App: `<ADD YOUR VERCEL URL HERE>`
- Repo: `<ADD YOUR GITHUB URL HERE>`

## Why this architecture

**Single Next.js app (App Router), no separate Express server.** The assignment allows
"Node.js / Express or equivalent" for the backend — Next.js API routes run on Node under
the hood, and keeping frontend + backend in one project meant one deploy target, no CORS
configuration, and a smaller surface area to get right in the timeline available.

**Client-side parse is preview-only; the server re-parses the raw file.** Step 2 of the
spec parses the CSV in the browser purely to render the preview table before any
processing happens. When the user hits Confirm, the *original file* is uploaded and the
API route parses it again server-side with the same library (`papaparse`). The backend
never trusts a client-side transformation of the data — it re-derives everything from
the uploaded file itself.

**Gemini 2.5 Flash with a strict JSON response schema**, not free-text prompting. The
model is configured with `responseMimeType: "application/json"` and an explicit
`responseSchema`, so the output is guaranteed to be parseable JSON in the expected shape
— no markdown-fence stripping, no "the model added a sentence before the JSON" failures.
`temperature: 0` because this is a deterministic mapping task, not a creative one.

**The AI's output is never trusted for hard constraints.** `lib/crmMapper.ts` re-validates
every hard rule from the spec in plain TypeScript after the AI responds:
- `crm_status` and `data_source` are checked against the exact allow-lists; anything else
  (including near-misses) is blanked to `""`, never passed through.
- The "skip if no email and no phone" rule is enforced in code, not left purely to the
  model's self-reported flag.
- `created_at` is validated with `new Date(...)` before being accepted.

This means a bad or slightly-off AI response degrades gracefully (a blank field) rather
than silently corrupting CRM data with an invalid enum value.

**Batching + concurrency + retry.** Rows are sent to Gemini in batches of 20. Batches run
concurrently (`Promise.all`) since they're independent, and each batch gets one retry on
failure before its rows are marked as skipped with a clear reason — a single bad batch
doesn't fail the whole import.

## Field mapping approach (the actual "AI Prompt Engineering" part)

The system prompt (`lib/aiExtractor.ts`) gives the model:
1. The exact target schema and field-by-field semantics (not just field names — what
   each field *means*, e.g. "mobile_without_country_code: without the dialing prefix").
2. The two closed vocabularies (`crm_status`, `data_source`) spelled out explicitly, with
   an instruction to return an empty string rather than guess when unsure.
3. The multi-value merge rule: first email/phone kept as the primary field, any
   additional ones appended into `crm_note` instead of being dropped.
4. The skip rule and the CSV-safety rule (escape real newlines as `\n` so no field breaks
   a CSV row).

The model receives raw rows exactly as they appear in the source file — column names,
casing, and order are whatever the source CSV happens to have. It's told to infer meaning
from header text and sample values, which is what actually handles the "Facebook export
vs. Google Ads export vs. hand-built spreadsheet" requirement — there's no hardcoded
column-name lookup table anywhere in this project.

## Setup

```bash
git clone <your-repo-url>
cd groweasy-csv-importer
npm install
cp .env.example .env.local
# edit .env.local and set GEMINI_API_KEY (get one free at https://aistudio.google.com/apikey)
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key (free tier). Used server-side only — never exposed to the client. |

## Deployment

Deployed on **Vercel** (frontend + API routes together, since they're one Next.js app).
Set `GEMINI_API_KEY` in the Vercel project's Environment Variables before deploying.

```bash
npm install -g vercel
vercel --prod
```

## Project structure

```
app/
  page.tsx              — 4-stage flow: upload → preview → processing → result
  api/import/route.ts   — receives the file, parses it, runs AI extraction, validates, responds
components/
  UploadZone.tsx         — drag & drop + file picker
  PreviewTable.tsx       — raw CSV preview, sticky header, scrollable, no AI involved
  ResultTable.tsx        — mapped CRM records, skipped records, coverage stats
lib/
  types.ts               — shared CRM schema + allow-lists (single source of truth)
  parseCsv.ts             — client-side parse, preview only
  aiExtractor.ts          — Gemini prompt + batching + retry logic
  crmMapper.ts            — server-side validation, never trusts AI for hard constraints
```

## Known limitations

- Max file size: 5MB / 2000 rows in this build (raise `MAX_FILE_BYTES` / `MAX_ROWS` in
  `app/api/import/route.ts` for larger imports; would also want streaming results at
  that point rather than one JSON response).
- Date parsing accepts whatever the AI returns as long as `new Date()` can parse it —
  genuinely ambiguous source dates (e.g. `03/04/2026`, which could be Mar 4 or Apr 3)
  are resolved by the model's best guess, not verified against a fixed locale.
- No persistence — this is stateless per the assignment's "optional database" note;
  refreshing the page loses the last result.

## Bonus features implemented

- [x] Drag & drop upload
- [x] Loading state during AI processing
- [x] Retry mechanism for failed AI batches (one retry per batch, then graceful skip)
- [x] Error handling (bad file type, oversized file, empty CSV, AI failure)
- [ ] Dark mode
- [ ] Unit tests
- [ ] Docker setup
- [ ] Virtualized table for very large CSVs

## Submitted for

Software Developer (Intern / Full-Time) — GrowEasy
