const chalk = require("chalk");
module.exports = async function (name, task) {
  console.log(`${chalk.green("Begin")}    ${chalk.yellow(name)}`);
  try {
    await task((...args) => {
      console.log(" " + chalk.gray(args.join("").replace(/\n/g, "\n ")));
    });
    console.log(`${chalk.green("Complete")} ${chalk.yellow(name)}`);
  } catch (error) {
    console.error(`${chalk.red("Failed")}   ${chalk.yellow(name)}\n${error}`);
    process.exit(1);
  }
};
