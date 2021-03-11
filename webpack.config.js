const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/animate/index.js",
  mode: "development",
  devtool: false,
  output: {
    filename: "animate.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    alias: {
      process: "process/browser",
    },
    fallback: {
      path: false,
      child_process: false,
      fs: false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process",
    }),
  ],
};
