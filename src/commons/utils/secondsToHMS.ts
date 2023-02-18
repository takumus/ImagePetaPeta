export function secondsToHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor((seconds % 3600) % 60);
  const ms = String(seconds).split(".")[1] ?? 0;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}.${ms.toString().substring(0, 3).padStart(3, "0")}`;
}
