const formats: {[key: string]: string} = {
  "jpeg": "jpg"
}
export function imageFormatToExtention(format: string | undefined | null) {
  if (!format) return format;
  const extention = formats[format];
  if (extention) return extention;
  return format;
}