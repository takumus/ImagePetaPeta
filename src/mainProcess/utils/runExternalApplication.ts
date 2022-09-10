import { spawn } from "child_process";
export function runExternalApplication(
  cliToolPath: string,
  args: string[],
  encoding: BufferEncoding,
  log: (value: string) => void,
) {
  const childProcess = spawn(cliToolPath, args);
  console.log(args);
  return {
    promise: new Promise((res: (value: boolean) => void, rej: (error: Error) => void) => {
      childProcess.stdout.setEncoding(encoding);
      childProcess.stderr.setEncoding(encoding);
      childProcess.on("exit", (code) => {
        if (childProcess.killed) {
          log("killed");
          res(false);
          return;
        }
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
        res(false);
      });
    }),
    kill: () => {
      childProcess.kill();
    },
  };
}
