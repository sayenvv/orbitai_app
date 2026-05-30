export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadFromApi(
  url: string,
  filename: string,
  fallbackType = "application/octet-stream",
): Promise<void> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const { parseApiError, ApiError } = await import("@/lib/orbit-api");
    throw new ApiError(parseApiError(error, "Download failed"), response.status);
  }
  const blob = await response.blob();
  downloadBlob(blob.type ? blob : new Blob([blob], { type: fallbackType }), filename);
}
