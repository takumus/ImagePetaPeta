import { spawn } from "child_process";
export function runExternalApplication(cliToolPath: string, args: string[], log: (value: string) => void) {
  return new Promise((res: (value: boolean) => void, rej: (error: Error) => void) => {
    const childProcess = spawn(cliToolPath, args);
    if (process.platform == "win32") {
      childProcess.stdout.setEncoding("utf16le");
      childProcess.stderr.setEncoding("utf16le");
    }
    childProcess.on("exit", (code) => {
      log(`exit code: ${code}`);
      res(code === 0);
    });
    childProcess.stdout.on("data", (chunk: Buffer) => {
      log(chunk.toString());
    });
    childProcess.stderr.on("data", (chunk: Buffer) => {
      log(chunk.toString());
    });
    childProcess.on("error", (error) => {
      log(error.message);
      rej(error);
    });
  })
}