import type { ApiPdfInspect } from "@/lib/orbit-api";

type ConfirmHandler = (info: ApiPdfInspect) => Promise<boolean>;

let pendingHandler: ConfirmHandler | null = null;

export function registerPdfPageLimitHandler(handler: ConfirmHandler | null) {
  pendingHandler = handler;
}

export async function confirmPdfPageLimit(info: ApiPdfInspect): Promise<boolean> {
  if (pendingHandler) {
    return pendingHandler(info);
  }

  return window.confirm(
    `This PDF has ${info.total_pages} pages. On the Free plan, only the first ${info.page_limit} pages will be indexed for chat.\n\nUpgrade for full document support, or continue with a partial upload.`,
  );
}
