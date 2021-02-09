#!/usr/bin/env node

require("dotenv").config();
const fs = require("fs");

const deploy = require("heward/src/deploy.js");

const options = {
  name: "animate.js",
  roll20: {
    campaign: process.env.ROLL20_CAMPAIGN,
    username: process.env.ROLL20_USERNAME,
    password: process.env.ROLL20_PASSWORD,
  },
};

const distPath = `${process.cwd()}/dist/animate.js`;
const distContent = fs.readFileSync(distPath);

deploy(distContent, options);
