import { DB_COMPACTION_DELAY } from "@/defines";
import Nedb from "@seald-io/nedb";

export default class DB<T> {
  nedb: Nedb<T> | null = null;
  loaded = false;
  execCompationIntervalId!: NodeJS.Timeout;
  constructor(private path: string) {
  }
  init() {
    this.loaded = false;
    return new Promise<boolean>((res, rej) => {
      this.nedb = new Nedb<T>({
        filename: this.path,
        autoload: true,
        onload: (error) => {
          if (error) {
            rej(`Database file is broken.\n"${this.path}"`);
            return;
          }
          this.loaded = true;
          res(true);
        }
      });
      this.nedb.persistence.stopAutocompaction();
    })
  }
  orderCompaction() {
    clearTimeout(this.execCompationIntervalId);
    this.execCompationIntervalId = setTimeout(this.compaction, DB_COMPACTION_DELAY);
  }
  compaction = () => {
    if (this.nedb && this.loaded) {
      this.nedb.persistence.compactDatafile();
    }
  }
  find(query: any = {}): Promise<T[]> {
    return new Promise((res, rej) => {
      if (!this.nedb || !this.loaded) {
        rej("DB is not initialized");
        return;
      }
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
      if (!this.nedb || !this.loaded) {
        rej("DB is not initialized");
        return;
      }
      this.nedb.remove(query, {}, (err) => {
        if (err) {
          rej(err);
          return;
        }
        this.orderCompaction();
        res(true);
      });
    });
  }
  update(query: Partial<T>, data: T, upsert: boolean = false): Promise<boolean> {
    return new Promise((res, rej) => {
      if (!this.nedb || !this.loaded) {
        rej("DB is not initialized");
        return;
      }
      this.nedb.update(query, data, { upsert }, (err) => {
        if (err) {
          rej(err);
          return;
        }
        this.orderCompaction();
        res(true);
      });
    });
  }
}