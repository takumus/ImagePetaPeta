import * as fs from "fs";
import * as Path from "path";
export function writeFile(filePath: string, buffer: NodeJS.ArrayBufferView): Promise<boolean> {
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
        if (err.code === "EEXIST") {
          res(path);
        } else {
          rej(err);
        }
        return;
      }
      res(path);
    });
  });
}
export function mkdirSync(path: string, recursive = false) {
  try {
    fs.mkdirSync(path, { recursive });
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
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
  });
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
  });
}
export function initFile(...paths: string[]) {
  const res = Path.resolve(...paths);
  writable(res, false);
  return res;
}
export function initDirectory(create: boolean, ...paths: string[]) {
  const res = Path.resolve(...paths);
  writable(res, true);
  if (create) {
    mkdirSync(res);
  }
  return res;
}
export function writable(path: string, isDirectory: boolean) {
  let stat: fs.Stats;
  try {
    // 存在確認
    stat = fs.statSync(path);
  } catch (err) {
    // 存在しない場合は親ディレクトリのアクセス権確認
    fs.accessSync(Path.resolve(path, "../"), fs.constants.W_OK | fs.constants.R_OK);
    return;
  }
  // 存在する場合はファイルの種類の確認
  if (stat.isDirectory() != isDirectory) {
    throw new Error(
      `File type is incorrect. "${path}" is not ${isDirectory ? "directory" : "file"}.`,
    );
  }
  // 存在する場合はパスのアクセス権確認
  fs.accessSync(path, fs.constants.W_OK | fs.constants.R_OK);
}
export function readdir(path: string) {
  return new Promise((res: (files: string[]) => void, rej) => {
    fs.readdir(path, {}, (err, files) => {
      if (err) {
        rej(err);
        return;
      }
      res(files as string[]);
    });
  });
}
export function readDirRecursive(
  path: string,
  onFile?: (filePaths: string[], count: number) => void,
) {
  let count = 0;
  const canceled = {
    value: false,
  };
  return {
    files: _readDirRecursive(
      path,
      (filePaths: string[]) => {
        if (onFile) {
          onFile(filePaths, ++count);
        }
      },
      canceled,
    ),
    cancel: () => {
      canceled.value = true;
    },
  };
}
async function _readDirRecursive(
  path: string,
  onFile: (filePaths: string[]) => void,
  canceled: { value: boolean },
) {
  if (canceled.value) {
    throw "canceled";
  }
  path = Path.resolve(path);
  const _files: string[] = [];
  try {
    const files = await readdir(path);
    for (let i = 0; i < files.length; i++) {
      try {
        const fileName = files[i];
        if (fileName === undefined) {
          continue;
        }
        const cPath = Path.resolve(path, fileName);
        const isDirectory = fs.statSync(cPath).isDirectory();
        if (isDirectory) {
          _files.push(...(await _readDirRecursive(cPath, onFile, canceled)));
        } else {
          _files.push(cPath);
        }
      } catch (error) {
        if (error === "canceled") {
          throw "canceled";
        }
      }
    }
  } catch (error) {
    if (error === "canceled") {
      throw "canceled";
    }
    return [path];
  }
  onFile(_files);
  return _files;
}
