import { DB_COMPACTION_DELAY } from "@/commons/defines";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";
import Nedb from "@seald-io/nedb";
type MessageEvents = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  compactionError: (error: any) => void;
  beginCompaction: () => void;
  doneCompaction: () => void;
};
export default class DB<T> extends (EventEmitter as new () => TypedEmitter<MessageEvents>) {
  nedb: Nedb<T> | null = null;
  loaded = false;
  execCompationIntervalId!: NodeJS.Timeout;
  constructor(public name: string, private path: string) {
    super();
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
        },
      });
      this.nedb.stopAutocompaction();
    });
  }
  orderCompaction() {
    clearTimeout(this.execCompationIntervalId);
    this.execCompationIntervalId = setTimeout(this.compaction, DB_COMPACTION_DELAY);
  }
  compaction = () => {
    if (this.nedb && this.loaded) {
      this.emit("beginCompaction");
      this.nedb
        .compactDatafileAsync()
        .then(() => {
          this.emit("doneCompaction");
        })
        .catch((error) => {
          this.emit("compactionError", error);
          this.orderCompaction();
        });
    }
  };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  find(query: Partial<T> | any = {}): Promise<T[]> {
    if (!this.nedb || !this.loaded) {
      throw new Error("DB is not initialized");
    }
    return this.nedb.findAsync(query).execAsync();
  }
  getAll() {
    if (!this.nedb || !this.loaded) {
      throw new Error("DB is not initialized");
    }
    return this.nedb.getAllData();
  }
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  count(query: Partial<T> | any = {}): Promise<number> {
    if (!this.nedb || !this.loaded) {
      throw new Error("DB is not initialized");
    }
    return this.nedb.countAsync(query).execAsync();
  }
  async remove(query: Partial<T>): Promise<number> {
    if (!this.nedb || !this.loaded) {
      throw new Error("DB is not initialized");
    }
    const result = await this.nedb.removeAsync(query, { multi: true });
    this.orderCompaction();
    return result;
  }
  async update(query: Partial<T>, data: T) {
    if (!this.nedb || !this.loaded) {
      throw new Error("DB is not initialized");
    }
    const result = await this.nedb.updateAsync(query, data);
    this.orderCompaction();
    return result;
  }
  async insert(data: T) {
    if (!this.nedb || !this.loaded) {
      throw new Error("DB is not initialized");
    }
    try {
      const result = await this.nedb.insertAsync(data);
      this.orderCompaction();
      return result;
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (err: any) {
      if (err.errorType === "uniqueViolated") {
        return undefined;
      } else {
        throw err;
      }
    }
  }
  ensureIndex(ensureIndexOptions: Nedb.EnsureIndexOptions) {
    return new Promise((res) => {
      if (!this.nedb) {
        return;
      }
      this.nedb.ensureIndex(ensureIndexOptions, res);
    });
  }
}
