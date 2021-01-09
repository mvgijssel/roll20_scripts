// TODO: Always add success message to output
// TODO: Make reverse of animate. preanimate?
// TODO: Make !animate be able to assign it to a user
// TODO: Implement saves
// TODO: Implement base attack bonus
// TODO: Implement type and alignment
// TODO: Implement skills
// TODO: Implement feats
// TODO: Implement special, check (Ex) qualities?

/* global sendChat, findObjs, _, log, getObj, on, createObj */

const bonusHdMapping = {
  tiny: 0,
  small: +1,
  medium: +1,
  large: +2,
  huge: +4,
  gargantuan: +6,
  colossal: +10,
};

const templates = {
  skeleton: {
    name: "Skeleton",
    strength: 0,
    dexterity: +2,
    naturalArmorBonus: {
      tiny: 0,
      small: +1,
      medium: +2,
      large: +2,
      huge: +3,
      gargantuan: +6,
      colossal: +10,
    },
  },
  zombie: {
    name: "Zombie",
    strength: +2,
    dexterity: -2,
    naturalArmorBonus: {
      tiny: 0,
      small: +1,
      medium: +2,
      large: +3,
      huge: +4,
      gargantuan: +7,
      colossal: +11,
    },
  },
};

const utilities = {
  undo: {
    description: "Undo the previous !animate:",
  },
  clean: {
    description: "Remove all preanimate attributes:",
  },
};

const castValue = (value, type) => {
  switch (type) {
    case "number": {
      const newValue = parseInt(value, 10);
      return Number.isNaN(newValue) ? null : newValue;
    }
    default: {
      return value;
    }
  }
};

const preanimatePrefix = (string) => `preanimate_${string}`;

class Base {
  constructor(fieldObject) {
    // store a copy of the raw attributes into the instance
    this.fields = { ...fieldObject.attributes };
    // the object with the setters and getters from roll20
    this._fieldObject = fieldObject;
    this.changedFields = {};
    this.originalFields = {};

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target.fields) {
          return target.fields[prop];
        }

        return target[prop];
      },

      /* eslint-disable no-param-reassign */
      set: (target, prop, value) => {
        if (prop in target.fields) {
          const previousValue = target.fields[prop];

          // Don't update if the value is the same
          if (value === previousValue) {
            return value;
          }

          // only update the original fields on the first mutation
          // to keep the actual original field after multiple mutations
          if (!(prop in target.originalFields)) {
            target.originalFields[prop] = target.fields[prop];
          }

          target.changedFields[prop] = value;
          target.fields[prop] = value;
        } else {
          target[prop] = value;
        }

        return value;
      },
      /* eslint-disable no-param-reassign */
    });
  }

  get id() {
    return this.fields._id;
  }

  get hasChanged() {
    return Object.keys(this.changedFields).length > 0;
  }
}

class Attribute extends Base {
  constructor(originalAttribute, castType) {
    super(originalAttribute);
    this._castType = castType;
  }

  get current() {
    return castValue(this.fields.current, this._castType);
  }

  get max() {
    return castValue(this.fields.max, this._castType);
  }
}

class Character extends Base {
  constructor(charObj, template) {
    super(charObj);
    this.template = template;
    this.attributes = {};
  }

  addAttributes(newAttributes) {
    _.flatten(newAttributes).forEach((attribute) => {
      this.attributes[attribute.name] = attribute;
    });
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  get attributeArray() {
    return Object.keys(this.attributes).map(
      (attributeName) => this.attributes[attributeName]
    );
  }
}

class Context {
  constructor(messageObject, action) {
    this._messageObject = messageObject;
    this._chatName = "animate";
    this.action = action;
  }

  info(text) {
    log(this._messageObject.who);

    sendChat(
      this._chatName,
      `/w ${this._messageObject.who.replace(
        " (GM)",
        ""
      )} <div style="color: #993333;">${text}</div>`,
      null,
      { noarchive: true }
    );
  }

  // TODO: implement different coloring here
  warn(text) {
    this.info(text);
  }

  roll(text, callback) {
    sendChat(this._chatName, `/roll ${text}`, callback, { noarchive: true });
  }
}

const attributeExists = (character, name) => {
  const result = findObjs({
    type: "attribute",
    _characterid: character.id,
    name,
  });

  return result.length > 0;
};

const findAttribute = (character, name, type) => {
  const result = findObjs({
    type: "attribute",
    _characterid: character.id,
    name,
  });

  switch (result.length) {
    case 0: {
      throw new Error(
        `Attribute '${name}' not found for character ${character.id}`
      );
    }
    case 1: {
      const attribute = new Attribute(result[0], type);
      log(attribute);
      return attribute;
    }
    default: {
      throw new Error(
        `Attribute '${name}' resulted in more than 1 (${result.length}) for character ${character.id}`
      );
    }
  }
};

const applyUpdate = (character) => {
  log("ABOUT TO UPDATE");
  log(character);
  const messages = [];

  character.attributeArray.forEach((attribute) => {
    const preanimateName = preanimatePrefix(attribute.name);

    if (attributeExists(character, preanimateName)) {
      messages.push(`Attribute '${attribute.name}' already updated, skipping.`);
      return;
    }

    const newFields = attribute.changedFields;
    const oldFields = attribute.originalFields;

    if (attribute.hasChanged) {
      messages.push(
        Object.keys(newFields).map(
          (valueName) =>
            `Updated ${valueName} ${attribute.name} from ${oldFields[valueName]} to ${newFields[valueName]}`
        )
      );
    }

    // TODO: when resetting sheet remove preanimate attributes
    log("SETTING NEW FIELDS");
    log(newFields);
    attribute._fieldObject.set(newFields);
    createObj("attribute", { ...attribute.fields, name: preanimateName });
  });

  return _.flatten(messages);
};

const usage = () => {
  const templateString = Object.keys(templates)
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

const calculateModifier = (number) => Math.floor(number / 2) - 5;

const calculateSizeBonus = (character, mapping) => {
  const size = findAttribute(character, "size", "string");
  return castValue(_.get(mapping, size.current, 0), "number");
};

const updateAbilities = (character) => {
  const updateAbility = (name, value, operation = "set") => {
    const results = [];

    const ability = findAttribute(character, name, "number");
    const newValue = operation === "set" ? value : ability.current + value;
    ability.current = newValue;
    results.push(ability);

    const abilityMod = findAttribute(character, `${name}_mod`, "number");
    abilityMod.current = calculateModifier(newValue);
    results.push(abilityMod);

    return results;
  };

  const results = [];

  results.push(updateAbility("constitution", 0));
  results.push(updateAbility("intelligence", 0));
  results.push(updateAbility("wisdom", 10));
  results.push(updateAbility("charisma", 10));
  results.push(updateAbility("strength", character.template.strength, "add"));
  results.push(updateAbility("dexterity", character.template.dexterity, "add"));

  return results;
};

const updateHitPoints = (character, context) => {
  const results = [];
  const hdRoll = findAttribute(character, "hd_roll", "string");
  const matchResult = hdRoll.current.match(
    /(?<level>\d+)d(?<size>\d+)(?:\+(?<bonus>\d+))?/
  );

  if (matchResult === null) {
    context.warn(
      `hd_roll field does not follow 1d4+10 form: '${hdRoll.current}'. Skipping hit points`
    );
    return results;
  }

  const currentLevel = castValue(matchResult.groups.level, "number");
  const newLevel = currentLevel + calculateSizeBonus(character, bonusHdMapping);
  const newSize = 8;
  const currentCharismaModifier = character.getAttribute("charisma_mod")
    .current;
  const newBonus = newLevel * castValue(currentCharismaModifier, "number");

  let newHdRoll = `${newLevel}d${newSize}`;

  if (newBonus > 0) {
    newHdRoll = `${newHdRoll}+${newBonus}`;
  }

  hdRoll.current = newHdRoll;
  results.push(hdRoll);

  return new Promise((resolve) => {
    const hp = findAttribute(character, "hp", "number");

    context.roll(hdRoll.current, (result) => {
      const newHp = JSON.parse(result[0].content).total;
      hp.current = newHp;
      hp.max = newHp;

      results.push(hp);
      resolve(results);
    });
  });
};

class UnmatchedRegex extends Error {}

// , -1 Size
const updateArmor = (character, context) => {
  const results = [];
  const newNaturalAc = calculateSizeBonus(
    character,
    character.template.naturalArmorBonus
  );
  const newDexterityAc = calculateModifier(
    character.getAttribute("dexterity").current
  );
  const ac = findAttribute(character, "ac", "number");
  const acNotes = findAttribute(character, "ac_notes", "string");
  const acData = {};

  try {
    acNotes.current.split(",").forEach((note) => {
      // This matches for example '+4 Armor' or '-1 Dex' or '5 Natural'
      const matchResult = note
        .trim()
        .match(/(?<sign>[-|+])?\s*(?<amount>\d+)\s*(?<category>\w+)/);

      if (matchResult === null) {
        throw new UnmatchedRegex();
      }

      // Note we're defaulting to negative if the sign is missing from the note
      const { sign = "-", amount, category } = matchResult.groups;

      acData[category] = castValue(`${sign}${amount}`, "number");
    });
  } catch (e) {
    if (e instanceof UnmatchedRegex) {
      context.warn(
        `ac_notes field does not follow '+1 Dex, +2 Natural, 3 Armor' form: '${acNotes.current}'. Skipping updating armor.`
      );
      return results;
    }

    throw e;
  }

  const numberWithSign = (number) => {
    if (number >= 0) {
      return `+${number}`;
    }
    return `${number}`;
  };

  acData.Natural = newNaturalAc;
  acData.Dex = newDexterityAc;

  acNotes.current = Object.keys(acData)
    .map((key) => `${numberWithSign(acData[key])} ${key}`)
    .join(", ");
  results.push(acNotes);

  ac.current =
    10 +
    Object.values(acData).reduce((acc, currentValue) => acc + currentValue, 0);
  results.push(ac);

  return results;
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

  const attributes = findObjs(
    { type: "attribute", _characterid: charObj.id },
    { caseInsensitive: true }
  );

  log(attributes);

  switch (context.action) {
    case "clean": {
      const preanimateAttributes = findObjs({
        type: "attribute",
        _characterid: charObj.id,
      }).filter((attribute) =>
        attribute.get("name").startsWith(preanimatePrefix(""))
      );

      preanimateAttributes.forEach((attribute) => {
        attribute.remove();
      });

      context.info(
        `Removed (${preanimateAttributes.length}) preanimate_ attributes.`
      );
      return;
    }

    case "undo": {
      // TODO: implement this
      context.info("undo not implemented.");
      return;
    }
    default: {
      // Update the character according to https://homebrewery.naturalcrit.com/share/HJMdrpxOx
      const character = new Character(charObj, templates[context.action]);
      character.addAttributes(updateAbilities(character, context));
      character.addAttributes(await updateHitPoints(character, context));
      character.addAttributes(updateArmor(character, context));

      const messages = applyUpdate(character);
      context.info(messages.join("<br />"));
    }
  }

  // log(results);

  // newAttributes.push(updateType(character)); // includes name
  // newAttributes.push(updateSaves(character));
  // newAttributes.push(updateAttack(character)); // bab and weapons
  // newAttributes.push(updateSkills(character));
  // newAttributes.push(updateFeats(character));
  // newAttributes.push(updateSpecial(character));

  // const messages = [];

  // const currentName = charObj.get("name");
  // const newName = `${template.name} ${charObj.get("name")}`;
  // charObj.set({ name: newName });
  // messages.push(`Updated name from ${currentName} to ${newName}`);

  // Step 2: Hit dice and natural armor

  // TODO: update fortitude, reflex, will
  // TODO: update bab

  // const attributes = findObjs(
  //   { type: "attribute", _characterid: charObj.id },
  //   { caseInsensitive: true }
  // );

  // log(attributes);

  // Step 3: Base stats

  // update name to + action?
  // const attributes = findObjs(
  //   { type: "attribute", _characterid: charObj.id },
  //   { caseInsensitive: true }
  // );

  // log(attributes);

  // update character controlled by username

  // update weapons using repeating rows
  // https://github.com/Roll20/roll20-api-scripts/blob/12d949a668df8a986f1a20f32fc9aff667c6ee8e/CharSheetUtils/1.0/index.js
  // createObj("attribute", {name: 'repeating_attack_$7_name', current: 'testingXYZ', _characterid: character.id});
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
    !Object.keys(templates).includes(action) &&
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
        log("finally going for the error?");
        throw err;
      }, 0);
    });
  });
};

on("ready", () => {
  on("chat:message", process);
});
