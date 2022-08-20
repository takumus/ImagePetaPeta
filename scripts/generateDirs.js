const script = require("./@script");
script.run("generate dirs", async () => {
  script.utils.log(script.utils.rm(script.files.output.electron.resources.dir));
  script.utils.log(script.utils.rm(script.files.output.electron.appDir));
  script.utils.log(script.utils.mkdir(script.files.output.electron.resources.dir));
  script.utils.log(script.utils.mkdir(script.files.output.testDir));
});
