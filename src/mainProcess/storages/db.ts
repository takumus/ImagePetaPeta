import { DB_COMPACTION_DELAY } from "@/commons/defines";
import { promiseSerial } from "@/commons/utils/promiseSerial";
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
      this.nedb.stopAutocompaction();
    })
  }
  orderCompaction() {
    clearTimeout(this.execCompationIntervalId);
    this.execCompationIntervalId = setTimeout(this.compaction, DB_COMPACTION_DELAY);
  }
  compaction = () => {
    if (this.nedb && this.loaded) {
      this.nedb.compactDatafileAsync().catch((error) => {
        this.orderCompaction();
      })
    }
  }
  find(query: Partial<T> | any = {}): Promise<T[]> {
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
  count(query: Partial<T> | any = {}): Promise<number> {
    return new Promise((res, rej) => {
      if (!this.nedb || !this.loaded) {
        rej("DB is not initialized");
        return;
      }
      this.nedb.count(query).exec(async (err, data) => {
        if (err) {
          rej(err);
          return;
        }
        res(data);
      });
    });
  }
  remove(query: Partial<T>): Promise<number> {
    return new Promise((res, rej) => {
      if (!this.nedb || !this.loaded) {
        rej("DB is not initialized");
        return;
      }
      this.nedb.remove(query, { multi: true }, (err, n) => {
        if (err) {
          rej(err);
          return;
        }
        this.orderCompaction();
        res(n);
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
  ensureIndex(ensureIndexOptions: Nedb.EnsureIndexOptions) {
    return new Promise((res) => {
      if (!this.nedb) {
        return;
      }
      this.nedb.ensureIndex(ensureIndexOptions, res);
    })
  }
}