export const normalizeText = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export const matchesText = (value: string, query?: string): boolean => {
  if (!query || query.trim() === "") return true;
  return normalizeText(value).includes(normalizeText(query));
};
