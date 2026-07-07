"use client";

import { useState } from "react";
import { Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { PreviewTable } from "@/components/PreviewTable";
import { ResultTable } from "@/components/ResultTable";
import { parseCsvForPreview, ParsedCsvPreview } from "@/lib/parseCsv";
import { ImportResult } from "@/lib/types";

type Stage = "upload" | "preview" | "processing" | "result";

const STEPS: { key: Stage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "AI Mapping" },
  { key: "result", label: "Result" },
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCsvPreview | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFileSelected(selected: File) {
    setUploadError(null);
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("That doesn't look like a CSV file. Please upload a .csv export.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setUploadError("File is larger than 5MB. Split it into smaller files and try again.");
      return;
    }
    try {
      const parsed = await parseCsvForPreview(selected);
      setFile(selected);
      setPreview(parsed);
      setStage("preview");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not read this CSV file.");
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setStage("processing");
    setProcessError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Import failed.");
      }
      setResult(data as ImportResult);
      setStage("result");
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "Something went wrong during AI mapping.");
      setStage("preview"); 
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setUploadError(null);
    setProcessError(null);
    setStage("upload");
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === stage);

  return (
    <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="font-mono text-xs text-accent uppercase tracking-widest mb-1">GrowEasy</p>
        <h1 className="text-2xl font-semibold text-ink">CRM Lead Importer</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Upload any lead export — Facebook, Google Ads, a spreadsheet, another CRM — and the
          importer maps it into GrowEasy&rsquo;s CRM format automatically, whatever your column names look like.
        </p>
      </header>

      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-8 text-xs font-mono">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center size-6 rounded-full border transition-colors
                ${i < currentStepIndex ? "bg-accent border-accent text-white" : ""}
                ${i === currentStepIndex ? "border-accent text-accent" : ""}
                ${i > currentStepIndex ? "border-border text-ink-muted" : ""}
              `}
            >
              {i + 1}
            </span>
            <span
              className={i <= currentStepIndex ? "text-ink" : "text-ink-muted"}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-border mx-1">/</span>}
          </li>
        ))}
      </ol>

      {stage === "upload" && (
        <UploadZone onFileSelected={handleFileSelected} error={uploadError} />
      )}

      {stage === "preview" && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              <span className="font-mono text-ink font-medium">{file?.name}</span> &middot;{" "}
              {preview.rowCount} row{preview.rowCount === 1 ? "" : "s"} detected &middot; no AI processing yet
            </p>
            <button
              onClick={handleReset}
              className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Start over
            </button>
          </div>

          <PreviewTable headers={preview.headers} rows={preview.rows} />

          {processError && (
            <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{processError}</div>
          )}

          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-hover text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Confirm &amp; run AI mapping
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {stage === "processing" && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-muted">
          <Loader2 className="size-8 animate-spin text-accent" />
          <p className="text-sm">
            Mapping <span className="font-mono text-ink">{preview?.rowCount}</span> rows into CRM fields&hellip;
          </p>
        </div>
      )}

      {stage === "result" && result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">Mapping complete for {file?.name}</p>
            <button
              onClick={handleReset}
              className="text-xs text-ink-muted hover:text-ink flex items-center gap-1"
            >
              <RotateCcw className="size-3" /> Import another file
            </button>
          </div>
          <ResultTable imported={result.imported} skipped={result.skipped} />
        </div>
      )}
    </main>
  );
}
