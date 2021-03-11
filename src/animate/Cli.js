import { Command, Option, CommanderError } from "commander";
import { parse } from "shell-quote";
import Roll20 from "../lib/Roll20";
import animate from "./animate";
import templates from "./templates";

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
    const { message } = this.context;
    if (message.type !== "api") return false;
    if (!message.content.startsWith("!animate")) return false;

    const program = new Command();
    const programArgs = parse(message.content);
    programArgs.shift();

    program.version("0.0.1");
    program.name("!animate");
    program.exitOverride();
    program.configureOutput({
      writeOut: (str) => {
        this.context.warn(str);
      },
      writeErr: (str) => {
        this.context.info(str);
      },
      getOutHelpWidth: () => undefined,
      getErrHelpWidth: () => undefined,
    });

    program
      .command("new <sheet>")
      .description("Turn a character sheet into the animated version.", {
        sheet: "Name of the character sheet",
      })
      .addOption(
        new Option("-t, --template <template_name>")
          .choices(Object.keys(templates))
          .makeOptionMandatory()
      )
      .addOption(
        new Option("-p, --player <player_name>")
          .choices(this.playerNames())
          .makeOptionMandatory()
      )
      .action((sheetName, { template, player }) => {
        const availableCharacters = Roll20.characters();
        const sheetObj = availableCharacters.find(
          (c) => c.get("name") === sheetName
        );
        const templateObj = templates[template];
        const playerObj = Roll20.playerByName(player);

        const availableCharacterNames = availableCharacters.map((charObj) =>
          charObj.get("name")
        );

        if (!sheetObj) {
          program._outputConfiguration.writeErr(
            `Unknown sheet '${sheetName}'. Available sheets are:<br /> ${availableCharacterNames.join(
              ", "
            )}`
          );
          return false;
        }
        this.context.info(`Executing: '${this.context.message.content}'`);
        const duplicate = this.duplicateCharacter(sheetObj);
        this.assignPlayerToCharacter(playerObj, duplicate);

        animate(this.context, duplicate, templateObj);
        return true;
      });

    try {
      program.parse(programArgs, { from: "user" });
      return true;
    } catch (e) {
      if (e instanceof CommanderError) {
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

  playerNames() {
    return Roll20.players().map((player) => player.get("_displayname"));
  }
}
