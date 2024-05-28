import { spawn } from "child_process";
import keypress from "keypress";
import kill from "tree-kill";

const childProcesses = [spawn("npm", ["run", "dev:app"]), spawn("npm", ["run", "dev:app-web"])];
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on("keypress", async function (_ch, key) {
  if (key?.ctrl && key?.name === "c") {
    killAll();
  }
});
childProcesses.forEach((cp) => {
  cp.stdout?.pipe(process.stdout);
  cp.stderr?.pipe(process.stderr);
  cp.on("close", () => {
    killAll();
  });
});
const killAll = (() => {
  let killed = false;
  return async () => {
    if (killed) return;
    killed = true;
    try {
      await Promise.all(
        childProcesses.map(
          (cp) =>
            new Promise<void>((res, rej) => {
              if (cp.pid === undefined) {
                res();
                return;
              }
              kill(cp.pid, (e) => {
                console.log("tree-kill", cp.pid);
                if (e) {
                  rej(e);
                  return;
                }
                res();
              });
            }),
        ),
      );
    } catch {
      //
    }
    console.log("bye");
    process.exit(0);
  };
})();
