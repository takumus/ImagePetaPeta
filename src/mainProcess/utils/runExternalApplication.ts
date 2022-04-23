import { spawn } from "child_process";
export function runExternalApplication(cliToolPath: string, args: string[], encoding: BufferEncoding, log: (value: string) => void) {
  return new Promise((res: (value: boolean) => void, rej: (error: Error) => void) => {
    const childProcess = spawn(cliToolPath, args);
    childProcess.stdout.setEncoding(encoding);
    childProcess.stderr.setEncoding(encoding);
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