const formats: {[key: string]: string} = {
  "jpeg": "jpg"
}
export function imageFormatToExtention(format: string | undefined) {
  if (!format) return format;
  return formats[format] || format;
}