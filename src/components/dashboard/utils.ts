export const looksLikeGuid = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
};
