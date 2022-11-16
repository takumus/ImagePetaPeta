export class DelayUpdater<T> {
  private callback?: (data: T) => void;
  private data = "";
  private timerId = -1;
  constructor(private delay: number = 200) {
    //
  }
  initData(data: T) {
    this.data = JSON.stringify(data);
  }
  order(data: T) {
    window.clearInterval(this.timerId);
    this.timerId = window.setTimeout(() => {
      const newData = JSON.stringify(data);
      if (this.data === newData) return;
      this.data = newData;
      this.callback?.(data);
    }, this.delay);
    return true;
  }
  destroy() {
    window.clearInterval(this.timerId);
  }
  onUpdate(callback: (data: T) => void) {
    this.callback = callback;
  }
}
