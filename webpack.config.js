const path = require("path");

module.exports = {
  entry: "./src/animate/index.js",
  mode: "development",
  devtool: false,
  output: {
    filename: "animate.js",
    path: path.resolve(__dirname, "dist"),
  },
};
