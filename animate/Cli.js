export default class Cli {
  // !animate Ogre skeleton player
  static process(context) {
    const { message } = context;

    if (message.type !== "api") return false;
    if (!message.content.startsWith("!animate")) return false;

    const match = message.content.match(
      /!(?<operation>animate)\s+(?<template>\w+)\s+(?<player>\w+)\s+(?<sheet>.*$)/
    );

    if (match === null) {
      context.info(
        `Command '${message.content}' incorrect. ` +
          `USAGE: !animate <sheet> <template> <player>`
      );
    }

    log(match);
  }
}
