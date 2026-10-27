export function formatRetryAfterDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  if (safeSeconds < 60) return safeSeconds === 0 ? "несколько секунд" : `${safeSeconds} сек`;
  const minutes = Math.ceil(safeSeconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} ч${remainingMinutes ? ` ${remainingMinutes} мин` : ""}`;
}
