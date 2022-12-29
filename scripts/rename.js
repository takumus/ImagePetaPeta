const script = require("./@script");
script.run("linecount", () => {
  const Path = require("path");
  const config = {
    types: ["vue", "ts"],
    exclude: ["./src/@assets/licenses.ts"],
  };
  function search(path) {
    path = Path.resolve(path);
    script.utils.readdir(path).forEach((value) => {
      const cpath = Path.resolve(path, value);
      if (script.utils.stat(cpath).isDirectory()) {
        search(cpath);
      } else {
        if (config.types.indexOf(Path.extname(value).toLocaleLowerCase().replace(/\./g, "")) >= 0) {
          for (let i = 0; i < config.exclude.length; i++) {
            if (Path.resolve(config.exclude[i]) === cpath) {
              return;
            }
          }
          const dir = Path.dirname(cpath);
          const before = Path.basename(cpath);
          const after = before.replace(/imageType/g, "fileType");
          if (before !== after) {
            console.log(`rename ${before} -> ${after}`);
            script.utils.mv(Path.resolve(dir, before), Path.resolve(dir, after));
          }
          // lineCount += c;
        }
      }
    });
  }
  search("./src");
});
