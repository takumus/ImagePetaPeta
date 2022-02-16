import Nedb from "@seald-io/nedb";

export default class DB<T> {
  nedb: Nedb<T>;
  constructor(path: string) {
    this.nedb = new Nedb<T>({
      filename: path,
      autoload: true,
    });
    this.nedb.persistence.setAutocompactionInterval(5000);
  }
  find(query: any = {}): Promise<T[]> {
    return new Promise((res, rej) => {
      this.nedb.find(query).exec(async (err, data) => {
        if (err) {
          rej(err);
          return;
        }
        res(data);
      });
    });
  }
  remove(query: Partial<T>): Promise<boolean> {
    return new Promise((res, rej) => {
      this.nedb.remove(query, {}, (err) => {
        if (err) {
          rej(err);
          return;
        }
        res(true);
      });
    });
  }
  update(query: Partial<T>, data: T, upsert: boolean = false): Promise<boolean> {
    return new Promise((res, rej) => {
      this.nedb.update(query, data, { upsert }, (err) => {
        if (err) {
          rej(err);
          return;
        }
        res(true);
      });
    });
  }
}