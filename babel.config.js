module.exports = (api) => {
  const presets = [];
  const plugins = ["@babel/plugin-transform-modules-commonjs"];

  api.cache(true);

  return {
    presets,
    plugins,
  };
};
