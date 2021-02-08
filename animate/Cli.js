import templates from "./templates";
import Roll20 from "../lib/Roll20";

export default class Cli {
  // !animate Ogre skeleton playerName
  static process(context) {
    const { message } = context;

    if (message.type !== "api") return false;
    if (!message.content.startsWith("!animate")) return false;

    const match = message.content.match(
      /!(?<operation>animate)\s+(?<templateName>\w+)\s+(?<playerName>\w+)\s+(?<sheetName>.*$)/
    );

    if (match === null) {
      context.info(
        `Command '${message.content}' incorrect. ${this.usage(context)}`
      );
      return false;
    }

    const { templateName, playerName, sheetName } = match.groups;
    const availableTemplateNames = Object.keys(templates);
    const template = templates[templateName];

    if (!template) {
      context.info(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown templateName '${templateName}'. Available templates are:<br /> ${availableTemplateNames.join(
            ", "
          )}. ${this.usage(context)}`
      );
      return false;
    }

    const availablePlayers = Roll20.findObjs({ _type: "player" });
    const player = availablePlayers.find(
      (p) => p.get("_displayname") === playerName
    );
    const availablePlayerNames = availablePlayers.map((playerObj) =>
      playerObj.get("_displayname")
    );

    if (!player) {
      context.info(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown playerName '${playerName}'. Available players are:<br /> ${availablePlayerNames.join(
            ", "
          )}. ${this.usage(context)}`
      );
      return false;
    }

    const availableCharacters = Roll20.findObjs({
      _type: "character",
    });
    const character = availableCharacters.find(
      (c) => c.get("name") === sheetName
    );
    const availableCharacterNames = availableCharacters.map((charObj) =>
      charObj.get("name")
    );

    if (!character) {
      context.info(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown sheetName '${sheetName}'. Available sheets are:<br /> ${availableCharacterNames.join(
            ", "
          )}. ${this.usage(context)}`
      );
      return false;
    }

    context.setData({
      player,
      character,
      template,
    });
  }

  static usage(context) {
    return `<br /><br /><strong>USAGE:</strong> !animate template player sheet`;
  }
}
