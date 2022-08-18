export class DelayUpdater<T> {
  private callback?: (data: T) => void;
  private data = "";
  private timerId = -1;
  private _ordered = false;
  constructor(private delay: number = 200) {
    //
  }
  initData(data: T) {
    this.data = JSON.stringify(data);
  }
  forceUpdate() {
    if (!this.callback || !this._ordered) return;
    window.clearInterval(this.timerId);
    this._ordered = false;
    this.callback(JSON.parse(this.data) as T);
  }
  order(data: T) {
    const newData = JSON.stringify(data);
    if (this.data === newData) return;
    this.data = newData;
    window.clearInterval(this.timerId);
    this._ordered = true;
    this.timerId = window.setTimeout(() => {
      this.forceUpdate();
    }, this.delay);
    return true;
  }
  onUpdate(callback: (data: T) => void) {
    this.callback = callback;
  }
}
