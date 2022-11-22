export function minimizeID(id: string | null | undefined) {
  if (!id) {
    return "";
  }
  return id.substring(0, 8);
}
