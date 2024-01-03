import { spawn as _spawn } from "child_process";

spawn(["generate-assets"]).once("exit", () => {
  const web = spawn(["dev:app-web"]);
  spawn(["dev:app"]).once("exit", () => {
    console.log("終わり！");
    web.kill();
  });
});

function spawn(args: string[]) {
  return _spawn("npm", ["run", ...args], { stdio: "inherit" });
}
