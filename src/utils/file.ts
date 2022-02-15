import * as fs from "fs";
export function writeFile(filePath: string, buffer: Buffer): Promise<boolean> {
  return new Promise((res, rej) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        rej(err.message);
        return;
      }
      res(true);
    });
  });
}
export function readFile(path: string): Promise<Buffer> {
  return new Promise((res, rej) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        rej(err.message);
        return;
      }
      res(data);
    });
  });
}
export function mkdir(path: string, recursive = false): Promise<string> {
  return new Promise((res, rej) => {
    fs.mkdir(path, { recursive }, (err) => {
      if (err) {
        if (err.code == "EEXIST") {
          res(path);
        } else {
          rej(err);
        }
        return;
      }
      res(path);
    });
  })
}
export function mkdirSync(path: string, recursive = false) {
  try {
    fs.mkdirSync(path, { recursive });
  } catch (err: any) {
    if (err && err.code != "EEXIST") {
      throw new Error("cannot create directory: " + path);
    }
  }
  return path;
}
export function rm(path: string): Promise<boolean> {
  return new Promise((res, rej) => {
    fs.rm(path, (err) => {
      if (err) {
        rej(err);
        return;
      }
      res(true);
    });
  })
}
export function stat(path: string): Promise<fs.Stats> {
  return new Promise((res, rej) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        rej(err);
        return;
      }
      res(stats);
    });
  })
}