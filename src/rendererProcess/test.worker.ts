const w: Worker = self as any;

setTimeout(() => {
  w.postMessage("hello");
}, 1000);

export default w;