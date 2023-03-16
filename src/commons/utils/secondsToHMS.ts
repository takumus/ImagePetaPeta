export function secondsToHMS(seconds: number) {
  const h = Math.floor(seconds / 3600).toString();
  const m = Math.floor((seconds % 3600) / 60).toString();
  const s = Math.floor((seconds % 3600) % 60).toString();
  const ms = String(seconds).split(".")[1]?.substring(0, 3) ?? "0";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}.${ms.padStart(3, "0")}`;
}
