"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileWarning } from "lucide-react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  error?: string | null;
}

export function UploadZone({ onFileSelected, error }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        onFileSelected(file); // let parent surface the validation error consistently
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`group cursor-pointer rounded-xl border-2 border-dashed transition-colors
          flex flex-col items-center justify-center gap-3 px-6 py-16 text-center
          ${isDragging ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/60"}
        `}
      >
        <UploadCloud
          className={`size-9 transition-colors ${isDragging ? "text-accent" : "text-ink-muted group-hover:text-accent"}`}
          strokeWidth={1.5}
        />
        <div>
          <p className="font-semibold text-ink">Drop your CSV file here</p>
          <p className="text-sm text-ink-muted mt-1">or click to browse files</p>
        </div>
        <p className="font-mono text-xs text-ink-muted">.csv &middot; max 5MB &middot; any column layout</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          <FileWarning className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
