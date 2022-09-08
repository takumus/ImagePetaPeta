// const loaderUtils = require('loader-utils');

module.exports = function (source, map) {
  this.cacheable();
  //   // TODO output path を求める
  //   const result = `import { Worker } from "worker_threads";
  // import path from "path";
  // ${source.replace("__webpack_public_path__", 'path.resolve() + "/dist/" ')}`;
  console.log(source);
  this.callback(null, source, map);
};
