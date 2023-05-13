import * as fs from "fs";
import * as fsp from "fs/promises";
import * as Path from "path";

export async function mkdirIfNotIxists(path: string, options: fs.MakeDirectoryOptions) {
  try {
    await fsp.mkdir(path, options);
  } catch (error: any) {
    if (error.code === "EEXIST") {
      return path;
    } else {
      throw error;
    }
  }
  return path;
}
export function mkdirIfNotIxistsSync(path: string, options: fs.MakeDirectoryOptions) {
  try {
    fs.mkdirSync(path, options);
  } catch (error: any) {
    if (error.code === "EEXIST") {
      return path;
    } else {
      throw error;
    }
  }
  return path;
}
export async function initFile(...paths: string[]) {
  const res = Path.resolve(...paths);
  // await writable(res, false);
  return res;
}
export function initFileSync(...paths: string[]) {
  const res = Path.resolve(...paths);
  // writableSync(res, false);
  return res;
}
export async function initDirectory(create: boolean, ...paths: string[]) {
  const res = Path.resolve(...paths);
  // await writable(res, true);
  if (create) {
    await mkdirIfNotIxists(res, { recursive: true });
  }
  return res;
}
export function initDirectorySync(create: boolean, ...paths: string[]) {
  const res = Path.resolve(...paths);
  // writableSync(res, true);
  if (create) {
    mkdirIfNotIxistsSync(res, { recursive: true });
  }
  return res;
}
// export async function writable(path: string, isDirectory: boolean) {
//   let stat: fs.Stats;
//   try {
//     // 存在確認
//     stat = await fsp.stat(path);
//   } catch (err) {
//     // 存在しない場合は親ディレクトリのアクセス権確認
//     await fsp.access(Path.resolve(path, "../"), fs.constants.W_OK | fs.constants.R_OK);
//     return;
//   }
//   // 存在する場合はファイルの種類の確認
//   if (stat.isDirectory() !== isDirectory) {
//     throw new Error(
//       `File type is incorrect. "${path}" is not ${isDirectory ? "directory" : "file"}.`,
//     );
//   }
//   // 存在する場合はパスのアクセス権確認
//   await fsp.access(path, fs.constants.W_OK | fs.constants.R_OK);
// }
// export function writableSync(path: string, isDirectory: boolean) {
//   let stat: fs.Stats;
//   try {
//     // 存在確認
//     stat = fs.statSync(path);
//   } catch (err) {
//     // 存在しない場合は親ディレクトリのアクセス権確認
//     fs.accessSync(Path.resolve(path, "../"), fs.constants.W_OK | fs.constants.R_OK);
//     return;
//   }
//   // 存在する場合はファイルの種類の確認
//   if (stat.isDirectory() !== isDirectory) {
//     throw new Error(
//       `File type is incorrect. "${path}" is not ${isDirectory ? "directory" : "file"}.`,
//     );
//   }
//   // 存在する場合はパスのアクセス権確認
//   fs.accessSync(path, fs.constants.W_OK | fs.constants.R_OK);
// }
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
    const files = await fsp.readdir(path);
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
