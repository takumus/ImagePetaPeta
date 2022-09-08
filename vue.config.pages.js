const fs = require("fs");
const path = require("path");
const files = require("./files.config");
const pages = fs
  .readdirSync(files.input.renderer.windowsRoot)
  .filter((name) => !name.startsWith("@") && name.endsWith(".ts"))
  .map((name) => name.replace(/\.ts/g, ""))
  .reduce((pages, name) => {
    return {
      ...pages,
      [name]: {
        entry: path.join(files.input.renderer.windowsRoot, name + ".ts"),
        template: files.input.renderer.template,
        filename: name + ".html",
      },
    };
  }, {});
const windowTypes = fs
  .readFileSync(files.input.renderer.windowTypes)
  .toString()
  .match(/"(.*?)"/g)
  .map((name) => name.replace(/"/g, ""));
if (windowTypes.sort().join() !== Object.keys(pages).sort().join()) {
  console.error(
    `Error: ${files.input.renderer.windowTypes} or ${files.input.renderer.windowsRoot} is wrong.`,
  );
  process.kill(0);
}
module.exports = pages;
