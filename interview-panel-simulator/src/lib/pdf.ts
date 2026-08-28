import fs from "node:fs/promises";
// @ts-ignore -- pdf-parse ships no ESM types entry that satisfies NodeNext cleanly
import pdfParse from "pdf-parse";

export async function extractPdfText(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const result = await pdfParse(buffer);
  return result.text.trim();
}
