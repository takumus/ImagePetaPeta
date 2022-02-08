export function isLatest(me: string, remote: string) {
  if (me == remote) {
    return true;
  }
  const meArr = me.split(".");
  const remoteArr = remote.split(".");
  const length = Math.min(meArr.length, remoteArr.length);
  for (let i = 0; i < length; i++) {
    const mN = parseInt(meArr[i].replace(/[^0-9]/g, ""));
    const rN = parseInt(remoteArr[i].replace(/[^0-9]/g, ""));
    if (mN < rN) return false;
    if (mN > rN) return true;
  }
  if (meArr.length < remoteArr.length) {
    return false;
  }
  if (meArr.length > remoteArr.length) {
    return true;
  }
  return true;
}
export function versionChecktest() {
  for (let i = 0; i < 100; i++) {
    const v1 = Math.floor(Math.random() * 3) + "." + Math.floor(Math.random() * 3) + "." + Math.floor(Math.random() * 5) + "-beta";
    const v2 = Math.floor(Math.random() * 3) + "." + Math.floor(Math.random() * 3) + "." + Math.floor(Math.random() * 10) + "-beta";
    console.log(v1, v2, isLatest(v1, v2));
  }
}