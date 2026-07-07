"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { CrmRecord, SkippedRecord, CRM_FIELD_ORDER } from "@/lib/types";

interface ResultTableProps {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
}

export function ResultTable({ imported, skipped }: ResultTableProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const coverage = useMemo(() => {
    if (imported.length === 0) return {};
    const counts: Record<string, number> = {};
    for (const field of CRM_FIELD_ORDER) {
      counts[field] = imported.filter((r) => String(r[field]).trim() !== "").length;
    }
    return counts;
  }, [imported]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-accent">
            <CheckCircle2 className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Imported</span>
          </div>
          <p className="font-mono text-2xl font-semibold mt-1">{imported.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-warm">
            <XCircle className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Skipped</span>
          </div>
          <p className="font-mono text-2xl font-semibold mt-1">{skipped.length}</p>
        </div>
      </div>

      {imported.length > 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Field mapping coverage
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {CRM_FIELD_ORDER.map((field) => {
              const pct = Math.round((coverage[field] / imported.length) * 100);
              return (
                <span key={field} className="font-mono text-xs text-ink-muted">
                  {field}
                  <span className={pct > 0 ? "text-accent font-medium" : "text-ink-muted"}> {pct}%</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("imported")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "imported" ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Imported ({imported.length})
        </button>
        <button
          onClick={() => setTab("skipped")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "skipped" ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Skipped ({skipped.length})
        </button>
      </div>

      {tab === "imported" ? (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-ink text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-mono text-xs font-medium text-white/50 whitespace-nowrap">
                    row
                  </th>
                  {CRM_FIELD_ORDER.map((f) => (
                    <th key={f} className="px-3 py-2 text-left font-mono text-xs font-medium whitespace-nowrap">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imported.map((rec) => (
                  <tr key={rec._sourceRowIndex} className="odd:bg-canvas/40 border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {rec._sourceRowIndex + 1}
                    </td>
                    {CRM_FIELD_ORDER.map((f) => (
                      <td key={f} className="px-3 py-2 font-mono text-xs whitespace-nowrap max-w-[220px] truncate">
                        {rec[f] || <span className="text-ink-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-ink text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-mono text-xs font-medium text-white/50 whitespace-nowrap">
                    row
                  </th>
                  <th className="px-3 py-2 text-left font-mono text-xs font-medium whitespace-nowrap">
                    reason
                  </th>
                  <th className="px-3 py-2 text-left font-mono text-xs font-medium whitespace-nowrap">
                    raw data
                  </th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((rec) => (
                  <tr key={rec._sourceRowIndex} className="odd:bg-canvas/40 border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {rec._sourceRowIndex + 1}
                    </td>
                    <td className="px-3 py-2 text-xs text-warm whitespace-nowrap">{rec.reason}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted max-w-[400px] truncate">
                      {JSON.stringify(rec.rawRow)}
                    </td>
                  </tr>
                ))}
                {skipped.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-ink-muted text-sm">
                      Nothing skipped — every row had an email or phone number.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
