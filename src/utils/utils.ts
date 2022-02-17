export function minimId(id: string | null | undefined) {
  if (!id) {
    return "";
  }
  return id.substring(0, 6);
}

export function noHtml(str: string | null | undefined){
  return String(str)
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;'); 
}