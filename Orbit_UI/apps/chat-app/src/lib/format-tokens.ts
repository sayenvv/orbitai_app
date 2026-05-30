export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatTokenUsage(
  used: number,
  limit: number | null,
  limitReached = false,
): string {
  if (limit == null) {
    return `${formatTokenCount(used)} tokens used`;
  }
  if (limitReached || used >= limit) {
    return "Limit reached";
  }
  return `${formatTokenCount(used)} / ${formatTokenCount(limit)} tokens used`;
}
