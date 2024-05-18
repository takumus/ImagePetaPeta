import { ChildProcess, exec } from "child_process";
import keypress from "keypress";
import kill from "tree-kill";

keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on("keypress", async function (ch, key) {
  if (key && key.ctrl && key.name == "c") {
    console.log("ctrl-c");
    await Promise.all(
      cps.map((cp) => {
        new Promise<void>((res) => {
          if (cp.pid) {
            kill(cp.pid, (e) => {
              if (e) {
                console.error(e);
              }
              res();
            });
          } else {
            res();
          }
        });
      }),
    );
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
});
const cps: ChildProcess[] = [];
cps.push(spawn(["dev:app"]), spawn(["dev:app-web"]));
cps.forEach((cp) => {
  cp.stdout?.pipe(process.stdout);
});
function spawn(args: any[]) {
  return exec(["npm", "run", ...args].join(" "));
}
