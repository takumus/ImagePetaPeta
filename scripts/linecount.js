const fs = require("fs");
const Path = require("path");
const config = {
  root: "./src",
  types: ["ts", "vue"],
  exclude: ["./src/assets/licenses.ts"]
}

function search(path) {
  path = Path.resolve(path);
  let count = 0;
  fs.readdirSync(path).forEach((value) => {
    const cpath = Path.resolve(path, value);
    if (fs.statSync(cpath).isDirectory()) {
      count += search(cpath);
    } else {
      if (config.types.indexOf(Path.extname(value).toLocaleLowerCase().replace(/\./g, "")) >= 0) {
        for (let i = 0; i < config.exclude.length; i++) {
          if (Path.resolve(config.exclude[i]) == cpath) {
            return;
          }
        }
        const c = fs.readFileSync(cpath).toString().split("\n").length;
        count += c;
      }
    }
  });
  return count;
}

console.log(search(config.root), "lines");