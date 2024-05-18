import { exec } from "child_process";
import keypress from "keypress";
import kill from "tree-kill";

keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on("keypress", async function (_ch, key) {
  if (key?.ctrl && key?.name === "c") {
    await Promise.all(
      childProcesses.map(
        (cp) =>
          new Promise<void>((res) => {
            if (cp.pid) {
              kill(cp.pid, (e) => {
                console.log("tree-kill", cp.pid);
                if (e) {
                  console.error(e);
                }
                res();
              });
            } else {
              res();
            }
          }),
      ),
    );
    process.exit(0);
  }
});
const childProcesses = [
  exec(["npm", "run", "dev:app"].join(" ")),
  exec(["npm", "run", "dev:app-web"].join(" ")),
];
childProcesses.forEach((cp) => {
  cp.stdout?.pipe(process.stdout);
});
