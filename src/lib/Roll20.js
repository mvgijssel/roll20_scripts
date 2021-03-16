/* global sendChat, log, findObjs, createObj, _ */

import Attribute from "./Attribute";

export default class Roll20 {
  static duplicateOfCharacter(character) {
    const characterIds = this.findObjs({
      name: "duplicateOf",
      current: String(character.id),
      _type: "attribute",
    }).map((att) => att.get("_characterid"));

    return this.findObjs({
      _type: "character",
    }).filter((char) => characterIds.includes(char.id));
  }

  static players() {
    return this.findObjs({
      _type: "player",
    });
  }

  static playerByName(name) {
    return this.players().find((p) => p.get("_displayname") === name);
  }

  static characters() {
    return this.findObjs({
      _type: "character",
    });
  }

  static characterAttributes(character, overrides) {
    return this.findObjs({
      _type: "attribute",
      _characterid: character.id,
      ...overrides,
    });
  }

  static get isTest() {
    if (typeof process === "undefined") {
      return false;
    }
    return process.env.NODE_ENV === "test";
  }

  static findAttribute(character, name, type) {
    const result = Roll20.characterAttributes(character, { name });

    switch (result.length) {
      case 0: {
        throw new Error(
          `Attribute '${name}' not found for character ${character.id}`
        );
      }
      case 1: {
        const attribute = new Attribute(result[0], type);
        return attribute;
      }
      default: {
        throw new Error(
          `Attribute '${name}' resulted in more than 1 (${result.length}) for character ${character.id}`
        );
      }
    }
  }

  // for example name is repeating_npcatk-melee
  // return { id: { ...attribute }}
  static findRepeatingAttributes(character, name) {
    const result = Roll20.characterAttributes(character);

    return result
      .filter((attribute) => attribute.get("name").startsWith(name))
      .reduce((memo, attribute) => {
        const matchResult = attribute
          .get("name")
          .match(
            new RegExp(
              `(?<prefix>${name})_(?<id>[a-zA-Z0-9-]+)_(?<nestedName>.+)`
            )
          );

        const { id, nestedName } = matchResult.groups;

        if (!(id in memo)) {
          memo[id] = {};
        }

        memo[id][nestedName] = new Attribute(attribute);

        return memo;
      }, {});
  }

  static attributeExists(character, name) {
    const result = Roll20.findObjs({
      type: "attribute",
      _characterid: character.id,
      name,
    });

    return result.length > 0;
  }
}

Roll20.sendChat = sendChat;
Roll20.log = log;
Roll20.findObjs = findObjs;
Roll20.createObj = createObj;
