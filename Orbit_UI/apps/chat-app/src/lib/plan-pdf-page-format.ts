export type PlanPdfPageFormatId = "a4" | "letter" | "legal" | "a3" | "a5";

export type PlanPdfPageFormat = {
  id: PlanPdfPageFormatId;
  label: string;
  widthMm: number;
  heightMm: number;
  cssPageSize: string;
};

export const PLAN_PDF_PAGE_FORMATS: PlanPdfPageFormat[] = [
  { id: "a4", label: "A4", widthMm: 210, heightMm: 297, cssPageSize: "A4" },
  { id: "letter", label: "US Letter", widthMm: 216, heightMm: 279, cssPageSize: "letter" },
  { id: "legal", label: "US Legal", widthMm: 216, heightMm: 356, cssPageSize: "legal" },
  { id: "a3", label: "A3", widthMm: 297, heightMm: 420, cssPageSize: "A3" },
  { id: "a5", label: "A5", widthMm: 148, heightMm: 210, cssPageSize: "A5" },
];

export const DEFAULT_PLAN_PDF_PAGE_FORMAT: PlanPdfPageFormatId = "a4";

export function getPlanPdfPageFormat(id: PlanPdfPageFormatId): PlanPdfPageFormat {
  return PLAN_PDF_PAGE_FORMATS.find((format) => format.id === id) ?? PLAN_PDF_PAGE_FORMATS[0];
}
