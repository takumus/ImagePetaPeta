const chalk = require("chalk");
const fs = require("fs");
const files = require("../files.config");
module.exports = {
  async run(name, task) {
    console.log(`${chalk.green("Begin")}    ${chalk.yellow(name)}`);
    try {
      await task((...args) => {
        console.log(" " + chalk.gray(args.join(" ").replace(/\n/g, "\n ")));
      });
      console.log(`${chalk.green("Complete")} ${chalk.yellow(name)}`);
    } catch (error) {
      console.error(`${chalk.red("Failed")}   ${chalk.yellow(name)}\n${error}`);
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
  },
  files,
};
