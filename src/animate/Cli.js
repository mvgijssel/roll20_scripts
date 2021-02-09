import templates from "./templates";
import Roll20 from "../lib/Roll20";
import animate from "./animate";

class UsageError extends Error {}

// TODO: Implement feats
// TODO: Implement special, check (Ex) qualities?
// TODO: meleeattack descflag contains [[]] which are evualated, so escape the [[]] before rendering?
// TODO: Make !animate be able to assign it to a user
// TODO: Always add success message to output
// TODO: when resetting sheet remove preanimate attributes
// TODO: print results into a table
export default class Cli {
  constructor(context) {
    this.context = context;
  }

  execute() {
    // parse & validate
    // duplicate character
    // assign player to duplicate character
    // convert duplicate character using animate algorithm
    // put converted character on screen
    try {
      const result = this.parse();
      if (!result) return false;

      this.context.info(`Executing: '${this.context.message.content}'`);

      const { player, character, template } = result;

      const duplicate = this.duplicateCharacter(character);

      this.assignPlayerToCharacter(player, duplicate);

      animate(this.context, duplicate, template);

      // this.renderCharacter(duplicate);
    } catch (e) {
      if (e instanceof UsageError) {
        this.context.info(
          `Command '${this.context.message.content}' incorrect.<br /><br />` +
            `${e.message}${e.message && "<br /><br />"}` +
            `<strong>USAGE:</strong> !animate template player sheet`
        );
        return false;
      }

      if (Roll20.isTest) {
        throw e;
      }

      this.context.info(
        `Error happened while executing '${this.context.message.content}' <br /><br />` +
          `${e.message}` +
          `${e.stack.split("\n").join("<br />")}`
      );
      return false;
    }
  }

  duplicateCharacter(character) {
    const currentAttributes = Roll20.findObjs({
      _type: "attribute",
      _characterid: character.id,
    });

    const duplicate = Roll20.createObj("character", {
      ...character.attributes,
    });

    currentAttributes.forEach((attribute) => {
      Roll20.createObj("attribute", {
        ...attribute.attributes,
        _characterid: duplicate.id,
      });
    });

    Roll20.createObj("attribute", {
      _characterid: duplicate.id,
      name: "duplicateOf",
      current: String(character.id),
    });

    return duplicate;
  }

  assignPlayerToCharacter(player, character) {
    character.set({ controlledby: String(player.id) });
  }

  parse() {
    const { message } = this.context;

    if (message.type !== "api") return false;
    if (!message.content.startsWith("!animate")) return false;

    const match = message.content.match(
      /!(?<operation>animate)\s+(?<templateName>\w+)\s+(?<playerName>\w+)\s+(?<sheetName>.*$)/
    );

    if (match === null) throw new UsageError();

    const { templateName, playerName, sheetName } = match.groups;
    const availableTemplateNames = Object.keys(templates);
    const template = templates[templateName];

    if (!template) {
      throw new UsageError(
        `Unknown templateName '${templateName}'. Available templates are:<br /> ${availableTemplateNames.join(
          ", "
        )}.`
      );
    }

    const availablePlayers = Roll20.findObjs({ _type: "player" });
    const player = availablePlayers.find(
      (p) => p.get("_displayname") === playerName
    );
    const availablePlayerNames = availablePlayers.map((playerObj) =>
      playerObj.get("_displayname")
    );

    if (!player) {
      throw new UsageError(
        `Unknown playerName '${playerName}'. Available players are:<br /> ${availablePlayerNames.join(
          ", "
        )}.`
      );
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
      throw new UsageError(
        `Error executing command "${message.content}"<br /><br />` +
          `Unknown sheetName '${sheetName}'. Available sheets are:<br /> ${availableCharacterNames.join(
            ", "
          )}.`
      );
    }

    return {
      player,
      character,
      template,
    };
  }
}
