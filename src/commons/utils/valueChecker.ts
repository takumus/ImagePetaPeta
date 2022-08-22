export function valueChecker() {
  const values: { [key: string]: unknown } = {};
  function isSame(key: string, value: unknown) {
    if (values[key] != value) {
      values[key] = value;
      return false;
    }
    return true;
  }
  function isSameAll(...pairs: unknown[]) {
    let result = true;
    for (let i = 0; i < pairs.length / 2; i++) {
      const key = pairs[i * 2] as string;
      const value = pairs[i * 2 + 1];
      if (!isSame(key, value)) {
        result = false;
      }
    }
    return result;
  }
  return {
    isSame,
    isSameAll,
  };
}
