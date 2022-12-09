export function valueChecker() {
  const prevValues: unknown[] = [];
  return (...values: unknown[]) => {
    let result = true;
    for (let i = 0; i < values.length; i++) {
      if (prevValues[i] !== values[i]) {
        prevValues[i] = values[i];
        result = false;
      }
    }
    return result;
  };
}
