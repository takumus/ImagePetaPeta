export function isLatest(meVersion: string, remoteVersion: string, ignoreMinor: boolean) {
  if (meVersion == remoteVersion) {
    return true;
  }
  const meNumbers = meVersion.split(".");
  const remoteNumbers = remoteVersion.split(".");
  const length = Math.min(meNumbers.length, remoteNumbers.length);
  for (let i = 0; i < length; i++) {
    const meNumber = parseInt(meNumbers[i]!.replace(/[^0-9]/g, ""));
    const remoteNumber = parseInt(remoteNumbers[i]!.replace(/[^0-9]/g, ""));
    // A.B.C のC以降をマイナーとする。
    if (ignoreMinor && i > 1) return true;
    if (meNumber < remoteNumber) return false;
    if (meNumber > remoteNumber) return true;
  }
  if (meNumbers.length < remoteNumbers.length) {
    return false;
  }
  if (meNumbers.length > remoteNumbers.length) {
    return true;
  }
  return true;
}