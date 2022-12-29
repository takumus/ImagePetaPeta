const script = require("./@script");
script.run("linecount", () => {
  const Path = require("path");
  const config = {
    types: ["vue"],
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
          const kebabize = (string) => {
            // uppercase after a non-uppercase or uppercase before non-uppercase
            const upper =
              /(?<!\p{Uppercase_Letter})\p{Uppercase_Letter}|\p{Uppercase_Letter}(?!\p{Uppercase_Letter})/gu;
            return string.replace(upper, "-$&").replace(/^-/, "").toLowerCase();
          };
          let str = script.utils.read(cpath).toString();
          let result = null;
          while ((result = str.match(/:(.+?)="/))) {
            str = str.replace(result[0], `____${kebabize(result[1])}="`);
          }
          str = str.replace(/____/g, ":");
          while ((result = str.match(/@(.+?)="/))) {
            str = str.replace(result[0], `____${kebabize(result[1])}="`);
          }
          str = str.replace(/____/g, "@");
          script.utils.write(cpath, str);
          console.log(str);
          // lineCount += c;
        }
      }
    });
  }
  search("./src");
});
