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
  // Our five fixed synthetic UUIDs share their first six characters.
  // Keep their labels distinct even before legacy demo metadata is refreshed.
  const demoNumber = /^90000000-0000-4000-8000-00000000000([1-5])$/i.exec(id)?.[1];
  return externalId ?? (demoNumber ? `FDB-DEMO-00${demoNumber}` : `FDB-${id.slice(0, 6).toUpperCase()}`);
}
