export function minimId(id: string | null | undefined) {
  if (!id) {
    return "";
  }
  return id.substring(0, 16);
}

export function noHtml(str: string | null | undefined){
  return String(str)
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;'); 
}

export function arrLast<T>(array: T[], defaultValue: T): T {
  const value = array[array.length - 1];
  if (value === undefined) {
    return defaultValue;
  }
  return value;
}