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

  static assignPlayerToCharacter(player, character) {
    const controlledby = [player.id].join(",");
    const inplayerjournals = [player.id].join(",");

    character.set({ controlledby, inplayerjournals });
  }

  static duplicateCharacter(character) {
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

  static findCharacterById(id) {
    const result = this.findObjs({
      _type: "character",
      _id: String(id),
    });

    switch (result.length) {
      case 0: {
        throw new Error(`Character with id '${id}' not found.`);
      }
      case 1: {
        return result[0];
      }
      default: {
        throw new Error(
          `Character '${id}' resulted in more than 1 (${result.length}) result.`
        );
      }
    }
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

  static findAttributeByName(characterId, name) {
    const result = this.findObjs({
      _type: "attribute",
      _characterid: characterId,
      name,
    });

    switch (result.length) {
      case 0: {
        throw new Error(
          `Attribute '${name}' not found for character ${characterId}`
        );
      }
      case 1: {
        return result[0];
      }
      default: {
        throw new Error(
          `Attribute '${name}' resulted in more than 1 (${result.length}) for character ${characterId}`
        );
      }
    }
  }

  static findAttribute(character, name, type) {
    const result = this.characterAttributes(character, { name });

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

  static findOrCreateAttribute(character, name, type) {
    const result = this.characterAttributes(character, { name });

    switch (result.length) {
      case 0: {
        const createResult = Roll20.createObj("attribute", {
          name,
          current: "",
          max: "",
          _characterid: character.id,
        });
        return new Attribute(createResult, type);
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
    const result = this.characterAttributes(character);

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

  static findRepeatingAttributeByName(characterId, name) {
    const result = this.findObjs({
      _type: "attribute",
      _characterid: characterId,
    });

    const hash = result
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

        memo[id][nestedName] = attribute;

        return memo;
      }, {});

    return Object.keys(hash).map((key) => hash[key]);
  }

  static attributeExists(character, name) {
    const result = Roll20.findObjs({
      _type: "attribute",
      _characterid: character.id,
      name,
    });

    return result.length > 0;
  }

  // Copied from https://app.roll20.net/forum/post/3025111/api-and-repeating-sections-on-character-sheets/?pageforid=3037403#post-3037403
  static generateUUID() {
    let a = 0;
    const b = [];
    let c = new Date().getTime() + 0;
    const d = c === a;
    a = c;
    for (var e = new Array(8), f = 7; f >= 0; f--) {
      e[
        f
      ] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(
        c % 64
      );
      c = Math.floor(c / 64);
    }
    c = e.join("");
    if (d) {
      for (f = 11; f >= 0 && b[f] === 63; f--) {
        b[f] = 0;
      }
      b[f]++;
    } else {
      for (f = 0; f < 12; f++) {
        b[f] = Math.floor(64 * Math.random());
      }
    }
    for (f = 0; f < 12; f++) {
      c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(
        b[f]
      );
    }
    return c;
  }

  // Copied from https://app.roll20.net/forum/post/3025111/api-and-repeating-sections-on-character-sheets/?pageforid=3037403#post-3037403
  static generateRowID() {
    return this.generateUUID().replace(/_/g, "Z");
  }
}

Roll20.sendChat = sendChat;
Roll20.log = log;
Roll20.findObjs = findObjs;
Roll20.createObj = createObj;
