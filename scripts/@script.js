const chalk = require("chalk");
const fs = require("fs");
const files = require("../files.config");
module.exports = {
  async run(name, task) {
    console.log(`${chalk.green("BEGIN")} ${chalk.yellow(name)}`);
    try {
      await task();
      console.log(`${chalk.green("DONE")}`);
    } catch (error) {
      console.error(chalk.red(`Failed\n${error}`));
      process.exit(1);
    }
  },
  utils: {
    mkdir(path) {
      try {
        fs.mkdirSync(path, { recursive: true });
      } catch (err) {
        //
      }
      return "create: " + path;
    },
    rm(path) {
      try {
        fs.rmSync(path, { recursive: true });
      } catch (err) {
        //
      }
      return "remove: " + path;
    },
    read(path) {
      return fs.readFileSync(path);
    },
    mv(pathFrom, pathTo) {
      return fs.renameSync(pathFrom, pathTo);
    },
    readdir(path) {
      return fs.readdirSync(path);
    },
    stat(path) {
      return fs.statSync(path);
    },
    write(path, buffer) {
      fs.writeFileSync(path, buffer);
      return "write: " + path;
    },
    log(...args) {
      console.log(" " + chalk.gray(args.join(" ").replace(/\n/g, "\n ")));
    },
  },
  files,
};
