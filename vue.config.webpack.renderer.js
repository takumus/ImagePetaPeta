module.exports = (config) => {
  config.optimization.delete("splitChunks");
  config.performance
    .maxEntrypointSize(16 * 1024 * 1024) // 16mb
    .maxAssetSize(16 * 1024 * 1024); // 16mb
  config.module
    .rule("vue")
    .use("vue-loader")
    .tap((options) => {
      options.hotReload = false;
      options.compilerOptions = {
        ...options.compilerOptions,
        isCustomElement: (tag) => tag.startsWith("e-"),
      };
      return options;
    })
    .end();
  config.module
    .rule("images")
    .set("parser", {
      dataUrlCondition: {
        maxSize: 16 * 1024 * 1024, // 16mb
      },
    })
    .end();
  config.module.rule("ts").exclude.add(/\.worker\.ts$/);
  config.module
    .rule("web-worker")
    .test(/\.worker\.ts$/)
    .use("worker-loader")
    .loader("worker-loader")
    .end()
    .use("ts-loader")
    .loader("ts-loader")
    .end();
};
