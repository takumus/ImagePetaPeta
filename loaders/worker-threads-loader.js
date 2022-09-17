module.exports = function (source, map) {
  this.cacheable();
  const result = `import { Worker } from "worker_threads";\n${source.replace(
    "__webpack_public_path__",
    '__dirname + "/"',
  )}`;
  this.callback(null, result, map);
};