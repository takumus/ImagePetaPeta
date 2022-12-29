const script = require("./@script");
script.run("linecount", () => {
  const Path = require("path");
  const config = {
    types: ["ts", "vue"],
    exclude: ["./src/@assets/licenses.ts"],
  };
  function search(path) {
    path = Path.resolve(path);
    let lineCount = 0;
    const files = [];
    script.utils.readdir(path).forEach((value) => {
      const cpath = Path.resolve(path, value);
      if (script.utils.stat(cpath).isDirectory()) {
        const result = search(cpath);
        lineCount += result.lineCount;
        files.push(...result.files);
      } else {
        if (config.types.indexOf(Path.extname(value).toLocaleLowerCase().replace(/\./g, "")) >= 0) {
          for (let i = 0; i < config.exclude.length; i++) {
            if (Path.resolve(config.exclude[i]) === cpath) {
              return;
            }
          }
          const c = script.utils.read(cpath).toString().split("\n").length;
          files.push(cpath);
          lineCount += c;
        }
      }
    });
    return { lineCount, files };
  }
  const result = search("./src");
  script.utils.log(result.files.join("\n"));
  script.utils.log(result.files.length, "files");
  script.utils.log(result.lineCount, "lines");
});
