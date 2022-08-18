export default function (basename: string, names: string[]) {
  let name = basename;
  for (let i = 2; names.includes(name); i++) {
    name = basename + (i > 0 ? `(${i})` : "");
  }
  return name;
}
