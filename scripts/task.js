const chalk = require("chalk");
module.exports = async function (name, task) {
  console.log(chalk.green.bold(`\nTask "${name}" begin`));
  try {
    await task((...args) => {
      console.log(chalk.yellow(args.join("")));
    });
    console.log(chalk.green.bold(`Task "${name}" complete\n`));
  } catch (error) {
    console.error(chalk.red.bold(`Task "${name}" failed\n${error}\n`));
    process.exit(1);
  }
};
