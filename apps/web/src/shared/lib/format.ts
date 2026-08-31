export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRating(value: number) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function capitalizeFirst(value: string) {
  return value ? value[0]!.toLocaleUpperCase("ru-RU") + value.slice(1) : value;
}

export function shortId(id: string, externalId?: string | null) {
  return externalId ?? `FDB-${id.slice(0, 6).toUpperCase()}`;
}
