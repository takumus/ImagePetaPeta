const formats: {[key: string]: string} = {
  "jpeg": "jpg"
}
export function imageFormatToExtention(format?: string) {
  if (!format) return undefined;
  const extention = formats[format];
  if (extention) return extention;
  return format;
}