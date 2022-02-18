import * as fs from "fs";
import * as path from "path";
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
      throw err;
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
export function initFile(...paths: string[]) {
  const res = path.resolve(...paths);
  writable(res, false);
  return res;
}
export function initDirectory(create: boolean, ...paths: string[]) {
  const res = path.resolve(...paths);
  writable(res, true);
  if (create) {
    mkdirSync(res);
  }
  return res;
}
export function writable(p: string, isDirectory: boolean) {
  let stat: fs.Stats;
  try {
    // 存在確認
    stat = fs.statSync(p);
  } catch (err) {
    // 存在しない場合は親ディレクトリのアクセス権確認
    fs.accessSync(path.resolve(p, "../"), fs.constants.W_OK | fs.constants.R_OK);
    return;
  }
  // 存在する場合はファイルの種類の確認
  if (stat.isDirectory() != isDirectory) {
    throw new Error(`File type is incorrect. "${p}" is not ${ isDirectory ? "directory" : "file" }.`);
  }
  // 存在する場合はパスのアクセス権確認
  fs.accessSync(p, fs.constants.W_OK | fs.constants.R_OK);
}