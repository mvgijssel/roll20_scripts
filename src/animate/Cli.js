import { Command, Option, CommanderError } from "commander";
import { parse } from "shell-quote";
import Roll20 from "../lib/Roll20";
import animate from "./animate";
import templates from "./templates";

// TODO: linking of tokens :/
// TODO: add AC to green circle on token
// TODO: set first attack for each character to icon as well, so don’t need to open character
// TODO: special abilities not showing up?
// TODO: set default cool icon
// TODO: print results into a table
// TODO: implement rollbacks when something goes wrong
// TODO: Implement feats
// TODO: meleeattack descflag contains [[]] which are evualated, so escape the [[]] before rendering?
// TODO: Always add success message to output
// TODO: when resetting sheet remove preanimate attributes
// TODO: fix printing of sheets (information disclosure :p)
// TODO: slow cloning of character sheet
// TODO: remove errors from API output console
// TODO: character sheet not showing up for multi word characters?
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
      .command("remove <sheet>")
      .description(
        "Removes animated characters based on the target orignal sheet."
      )
      .action((sheetName) => {
        const availableCharacters = Roll20.characters();
        const sheetObj = availableCharacters.find(
          (c) => c.get("name") === sheetName
        );
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
        const messages = [];

        Roll20.duplicateOfCharacter(sheetObj).forEach((duplicate) => {
          const owningIds = duplicate.get("controlledby").split(",");
          const playerNames = Roll20.players()
            .filter((player) => owningIds.includes(player.id))
            .map((player) => player.get("_displayname"));

          duplicate.remove();
          messages.push(
            `Removed character '${duplicate.get(
              "name"
            )}' for player(s) '${playerNames.join(", ")}'`
          );
        });

        this.context.info(messages.join("<br />"));
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
      .addOption(new Option("-d, --desecrate").default(false))
      .action((sheetName, { template, player, desecrate }) => {
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
        const duplicate = Roll20.duplicateCharacter(sheetObj);
        Roll20.assignPlayerToCharacter(playerObj, duplicate);

        animate(this.context, duplicate, templateObj, { desecrate });
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

  playerNames() {
    return Roll20.players().map((player) => player.get("_displayname"));
  }
}
