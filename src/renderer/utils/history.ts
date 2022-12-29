// export class DataHistory {
//   private history: Data[][] = [];
//   private nextIndex = 0;
//   private lastAddedTime = 0;
//   public add(datas: Data[]) {
//     let override = false;
//     if (new Date().getTime() - this.lastAddedTime < 100) {
//       // 100ms未満の変更は無視して上書きする。
//       override = true;
//     }
//     const latest = this.getCurrent();
//     if (!latest || (latest && JSON.stringify(latest) !== JSON.stringify(datas))) {
//       if (override) this.nextIndex--;
//       this.history.splice(this.nextIndex, this.history.length);
//       this.history[this.nextIndex] = datas.map(v => v.clone());
//       console.log(`add history (${this.nextIndex})(override: ${override})`);
//       this.nextIndex++;
//       this.lastAddedTime = new Date().getTime();
//     }
//   }
//   public undo(datas: Data[]) {
//     if (this.nextIndex <= 1) return false;
//     this.nextIndex--;
//     const current = this.getCurrent();
//     if (current) this.copyDatas(current, datas);
//     console.log(`undo history (${this.nextIndex})`);
//   }
//   public redo(datas: Data[]) {
//     if (this.nextIndex >= this.history.length) return false;
//     this.nextIndex++;
//     const current = this.getCurrent();
//     if (current) this.copyDatas(current, datas);
//     console.log(`redo history (${this.nextIndex})`);
//   }
//   public getCurrent() {
//     return this.history[this.nextIndex - 1];
//   }
//   private copyDatas(from: Data[], to: Data[]) {
//     to.splice(0, to.length);
//     from.forEach((d) => {
//       to.push(d.clone());
//     });
//   }
// }
