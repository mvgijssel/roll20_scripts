module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["airbnb-base", "prettier"],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-underscore-dangle": 0,
    "max-classes-per-file": 0,
  },
  overrides: [
    {
      files: ["**/*_test.js"],
      env: {
        mocha: true,
      },
      plugins: ["mocha"],
      rules: {
        "mocha/no-exclusive-tests": "error",
        "mocha/no-pending-tests": "error",
        "no-undef": 0,
        "no-unused-expressions": 0,
      },
    },
  ],
};
