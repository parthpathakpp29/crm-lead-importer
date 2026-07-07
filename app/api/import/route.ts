import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { extractCrmRecords } from "@/lib/aiExtractor";
import { buildImportResult } from "@/lib/crmMapper";

export const maxDuration = 60; // AI batches run concurrently, but give room for larger CSVs

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB, matches the sample template's stated limit
const MAX_ROWS = 2000; // sane demo ceiling; batching handles the rest

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Send the CSV as multipart/form-data under 'file'." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 5MB limit for this importer." },
        { status: 413 }
      );
    }

    const text = await file.text();

    // Backend re-parses the raw file itself rather than trusting a client-side
    // parse — the frontend's parse (Step 2) is only for showing a preview,
    // it is not the authoritative source the AI extraction runs on.
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: `Could not parse CSV: ${parsed.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = parsed.data.filter((r) => Object.values(r).some((v) => v && v.trim() !== ""));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV has no data rows (only headers, or all rows are blank)." },
        { status: 400 }
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `CSV has ${rows.length} rows; this demo supports up to ${MAX_ROWS}. Split the file and retry.` },
        { status: 413 }
      );
    }

    const { raw, aiResults } = await extractCrmRecords(rows);
    const result = buildImportResult(raw, aiResults);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Import failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Import failed: ${message}` },
      { status: 500 }
    );
  }
}
