import { spawn } from "child_process";
export function runExternalApplication(cliToolPath: string, args: string[], log: (value: string) => void) {
  return new Promise((res, rej) => {
    const process = spawn(cliToolPath, args);
    process.on("exit", (code) => {
      log(`exit code: ${code}`);
      res(code === 0);
    });
    process.stdout.on("data", (chunk) => {
      log(chunk.toString());
    });
    process.stderr.on("data", (chunk) => {
      log(chunk.toString());
    });
    process.on("error", (error) => {
      log(error.message);
      res(false);
    });
  })
}