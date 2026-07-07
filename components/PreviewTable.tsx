interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;
}

export function PreviewTable({ headers, rows, maxRows = 50 }: PreviewTableProps) {
  const shown = rows.slice(0, maxRows);
  const truncated = rows.length > maxRows;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {}
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-ink text-white">
            <tr>
              <th className="px-3 py-2 text-left font-mono text-xs font-medium text-white/50 whitespace-nowrap">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-mono text-xs font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="odd:bg-canvas/40 even:bg-surface border-t border-border">
                <td className="px-3 py-2 font-mono text-xs text-ink-muted whitespace-nowrap">{i + 1}</td>
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 font-mono text-xs whitespace-nowrap max-w-[240px] truncate">
                    {row[h] || <span className="text-ink-muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <div className="border-t border-border px-3 py-2 text-xs text-ink-muted bg-canvas/40">
          Showing first {maxRows} of {rows.length} rows — the full file will be sent on confirm.
        </div>
      )}
    </div>
  );
}
