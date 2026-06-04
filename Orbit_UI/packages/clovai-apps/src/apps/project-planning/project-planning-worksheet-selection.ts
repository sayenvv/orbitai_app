export type WorksheetTextSelection = {
  blockId: string;
  text: string;
  selectedText: string;
  start: number;
  end: number;
};

export function readWorksheetTextSelection(blockId: string, fullText: string): WorksheetTextSelection | null {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const anchor = range.commonAncestorContainer;
  const element =
    anchor.nodeType === Node.ELEMENT_NODE
      ? (anchor as HTMLElement)
      : anchor.parentElement;
  const host = element?.closest<HTMLElement>(`[data-worksheet-block-id="${blockId}"]`);
  if (!host) return null;

  const selectedText = range.toString();
  if (!selectedText.trim()) return null;

  const pre = document.createRange();
  pre.selectNodeContents(host);
  pre.setEnd(range.startContainer, range.startOffset);
  let start = pre.toString().length;
  let end = start + selectedText.length;

  if (fullText.slice(start, end) !== selectedText) {
    const idx = fullText.indexOf(selectedText);
    if (idx >= 0) {
      start = idx;
      end = idx + selectedText.length;
    }
  }

  return {
    blockId,
    text: fullText,
    selectedText,
    start,
    end,
  };
}
