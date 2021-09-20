export class DelayUpdater<T> {
  private callback?: (data: T) => void;
  private data?: T;
  private timerId = -1;
  private prevDataJSON = "";
  private _ordered = false;
  constructor(private delay: number = 200) {
    //
  }
  initData(data: T) {
    this.data = data;
    this.prevDataJSON = JSON.stringify(data);
  }
  forceUpdate() {
    if (!this.callback || !this.data || !this._ordered) return;
    window.clearInterval(this.timerId);
    this._ordered = false;
    const dataJSON = JSON.stringify(this.data);
    if (dataJSON == this.prevDataJSON) return;
    this.callback(this.data);
    this.prevDataJSON = dataJSON;
  }
  order(data: T) {
    this.data = data;
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