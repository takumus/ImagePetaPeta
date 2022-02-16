const formats: {[key: string]: string} = {
  "jpeg": "jpg"
}
export function imageFormatToExtention(format: string | undefined | null) {
  if (!format) return format;
  return formats[format] || format;
}