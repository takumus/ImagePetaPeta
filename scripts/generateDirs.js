const script = require("./@script");
script.run("generate dirs", async (log) => {
  log(script.utils.rm(script.files.output.electron.resources.dir));
  log(script.utils.rm(script.files.output.electron.appDir));
  log(script.utils.mkdir(script.files.output.electron.resources.dir));
  log(script.utils.mkdir(script.files.output.testDir));
});
