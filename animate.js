// TODO: Implement feats
// TODO: Implement special, check (Ex) qualities?
// TODO: meleeattack descflag contains [[]] which are evualated, so escape the [[]] before rendering?
// TODO: Make !animate be able to assign it to a user
// TODO: Always add success message to output
// TODO: when resetting sheet remove preanimate attributes
// TODO: print results into a table

/* global sendChat, findObjs, _, log, getObj, on, createObj */

import Context from "./lib/Context";
import Attribute from "./lib/Attribute";
import Character from "./lib/Character";
import animateTemplates from "./animateTemplates";

const revertAttributes = (character) => {
  const preanimateAttributes = findObjs({
    type: "attribute",
    _characterid: character.id,
  }).filter((attribute) =>
    attribute.get("name").startsWith(preanimatePrefix(""))
  );

  const results = preanimateAttributes.map((preanimateAttribute) => {
    const attribute = findAttribute(
      character,
      withoutPreanimatePrefix(preanimateAttribute.get("name"))
    );

    attribute.current = preanimateAttribute.get("current");
    attribute.max = preanimateAttribute.get("max");
    return attribute;
  });

  return results;
};

const removePreanimateAttributes = (character) => {
  const preanimateAttributes = findObjs({
    type: "attribute",
    _characterid: character.id,
  }).filter((attribute) =>
    attribute.get("name").startsWith(preanimatePrefix(""))
  );

  preanimateAttributes.forEach((attribute) => {
    attribute.remove();
  });

  return preanimateAttributes;
};

const processCharacter = async (selection, context) => {
  const tokenObj = getObj("graphic", selection._id);

  if (tokenObj === undefined) {
    context.info(`Unable to find graphic for ${selection._id}.`);
    return;
  }

  log(tokenObj);

  const charObj = getObj("character", tokenObj.get("represents"));

  if (charObj === undefined) {
    context.info(
      `Token with id ${tokenObj._id} is not correctly linked to a good character.`
    );
    return;
  }

  log(charObj);

  switch (context.action) {
    case "clean": {
      const character = new Character(charObj);
      const removedAttributes = removePreanimateAttributes(character);
      context.info(
        `Removed (${removedAttributes.length}) preanimate_ attributes.`
      );
      return;
    }
    case "undo": {
      const character = new Character(charObj);
      character.addAttributes(revertAttributes(character, context));
      removePreanimateAttributes(character);
      const messages = applyUpdate(character, false);

      if (messages.length === 0) {
        context.info("Nothing to undo, please animate first.");
        return;
      }

      context.info(messages.join("<br />"));
      return;
    }
    default: {
      const character = new Character(
        charObj,
        animateTemplates[context.action]
      );
      // Update the character according to https://homebrewery.naturalcrit.com/share/HJMdrpxOx
      character.addAttributes(updateAbilities(character, context));
      character.addAttributes(await updateHitPoints(character, context));
      character.addAttributes(updateArmor(character, context));
      character.addAttributes(updateType(character, context));
      character.addAttributes(updateSaves(character, context));
      character.addAttributes(updateAttack(character, context));
      character.addAttributes(updateSkills(character, context));

      const messages = applyUpdate(character, true);
      context.info(messages.join("<br />"));
    }
  }

  // newAttributes.push(updateSkills(character));
  // newAttributes.push(updateFeats(character));
  // newAttributes.push(updateSpecial(character));

  // update character controlled by username

  // update weapons using repeating rows
  // https://github.com/Roll20/roll20-api-scripts/blob/12d949a668df8a986f1a20f32fc9aff667c6ee8e/CharSheetUtils/1.0/index.js
  // createObj("attribute", {name: 'repeating_attack_$7_name', current: 'testingXYZ', _characterid: character.id});
};

const utilities = {
  undo: {
    description: "Undo the previous !animate:",
  },
  clean: {
    description: "Remove all preanimate attributes:",
  },
};

const usage = () => {
  const templateString = Object.keys(animateTemplates)
    .map((action) => `<strong>!animate ${action}</strong>`)
    .join("<br />");

  const utilityString = Object.keys(utilities)
    .map(
      (utility) =>
        `${utilities[utility].description}<br /><strong>!animate ${utility}</strong>`
    )
    .join("<br /><br />");

  let part = `USAGE: Select a token and convert it using the following templates:<br /><br />`;
  part += templateString;
  part += `<br /><br />Or use one of the following utility methods:<br /><br />`;
  part += utilityString;
  return part;
};

const process = (msg) => {
  if (msg.type !== "api") return;

  const match = msg.content.match(/!(?<operation>animate)\s*(?<action>.+$)?/);

  if (match === null) return;

  const { action } = _.defaults(match.groups, { action: "" });

  log(msg);
  log(match.groups);

  const context = new Context(msg, action);

  if (
    !Object.keys(animateTemplates).includes(action) &&
    !Object.keys(utilities).includes(action)
  ) {
    context.info(
      `Unknown action '${match.groups.action}'.<br /><br />${usage()}`
    );
    return;
  }

  // check for selection
  if (!msg.selected || msg.selected.length === 0) {
    context.info(usage());
    return;
  }

  msg.selected.forEach((selection) => {
    // NOTE: this weird contraption with .catch and setTimeout is to
    // make sure the error isn't swallowed somewhere in the async world.
    // This is necessary to get the error actually displayed in the console
    processCharacter(selection, context).catch((err) => {
      setTimeout(() => {
        throw err;
      }, 0);
    });
  });
};

on("ready", () => {
  on("chat:message", process);
});
