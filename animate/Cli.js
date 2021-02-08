import templates from "./templates";
import Roll20 from "../lib/Roll20";

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
        `Command '${message.content}' incorrect. ${this.usage(context)}`
      );
      return false;
    }

    const { template, player, sheet } = match.groups;
    const availableTemplates = Object.keys(templates);

    if (!availableTemplates.includes(template)) {
      context.info(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown template '${template}'. Available templates are:<br /> ${availableTemplates.join(
            ", "
          )}. ${this.usage(context)}`
      );
      return false;
    }

    const availablePlayerNames = Roll20.findObjs({
      _type: "player",
    }).map((playerObj) => playerObj.get("_displayname"));

    if (!availablePlayerNames.includes(player)) {
      context.info(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown player '${player}'. Available players are:<br /> ${availablePlayerNames.join(
            ", "
          )}. ${this.usage(context)}`
      );
      return false;
    }

    const availableSheetNames = Roll20.findObjs({
      _type: "character",
    }).map((charObj) => charObj.get("name"));

    if (!availableSheetNames.includes(sheet)) {
      context.info(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown sheet '${sheet}'. Available sheets are:<br /> ${availableSheetNames.join(
            ", "
          )}. ${this.usage(context)}`
      );
      return false;
    }
  }

  static usage(context) {
    return `<br /><br /><strong>USAGE:</strong> !animate template player sheet`;
  }
}
