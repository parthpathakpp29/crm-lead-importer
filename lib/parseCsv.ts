import Papa from "papaparse";

export interface ParsedCsvPreview {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export function parseCsvForPreview(file: File): Promise<ParsedCsvPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.data.length === 0) {
          reject(new Error("The CSV appears to have no data rows."));
          return;
        }
        resolve({
          headers: results.meta.fields ?? [],
          rows: results.data,
          rowCount: results.data.length,
        });
      },
      error: (err) => reject(err),
    });
  });
}
