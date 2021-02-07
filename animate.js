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

// cli parsing
// - create
//     duplicate character sheet
//     modify character sheet
//     create graphic/token and link it to character sheet
// - undo
// - clean

const bonusHdMapping = {
  tiny: 0,
  small: +1,
  medium: +1,
  large: +2,
  huge: +4,
  gargantuan: +6,
  colossal: +10,
};

const bonusAttackMapping = {
  tiny: +2,
  small: +1,
  medium: +0,
  large: -1,
  huge: -2,
  gargantuan: -4,
  colossal: -8,
};

const parseRoll = (string) => {
  const matchResult = string.match(
    /(?<level>\d+)d(?<size>\d+)(?:\+(?<bonus>\d+))?/
  );

  if (matchResult === null) return matchResult;

  return matchResult.groups;
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
const withoutPreanimatePrefix = (string) => string.replace("preanimate_", "");

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
      return attribute;
    }
    default: {
      throw new Error(
        `Attribute '${name}' resulted in more than 1 (${result.length}) for character ${character.id}`
      );
    }
  }
};

// for example name is repeating_npcatk-melee
// return { id: { ...attribute }}
const findRepeatingAttributes = (character, name) => {
  const result = findObjs({
    type: "attribute",
    _characterid: character.id,
  });

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
};

const applyUpdate = (character, writePreanimate) => {
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

      if (attribute.setWithWorker) {
        attribute._fieldObject.setWithWorker(newFields);
      } else {
        attribute._fieldObject.set(newFields);
      }
    }

    if (!writePreanimate) {
      return;
    }

    createObj("attribute", {
      ...attribute.fields,
      ...attribute.originalFields,
      name: preanimateName,
    });
  });

  const name = findAttribute(character, "npcdrop_name", "string");
  character._fieldObject.set({ name: name.current });

  return _.flatten(messages);
};

const calculateModifier = (number) => Math.floor(number / 2) - 5;

const calculateSizeBonus = (character, mapping) => {
  const size = findAttribute(character, "size", "string");
  return castValue(_.get(mapping, size.current, 0), "number");
};

const parseHitDice = (string) => {
  const result = parseRoll(string);

  if (result === null) return result;

  return result.level;
};

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
  const hitDice = parseHitDice(hdRoll.current);

  if (hitDice === null) {
    context.warn(
      `hd_roll field does not follow 1d4+10 form: '${hdRoll.current}'. Skipping hit points`
    );
    return results;
  }

  const currentLevel = castValue(hitDice, "number");
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

const updateType = (character, context) => {
  const results = [];

  const name = findAttribute(character, "npcdrop_name", "string");
  name.current = `${character.template.name} ${name.current}`;
  results.push(name);

  const alignment = findAttribute(character, "npc_alignment", "string");
  alignment.current = "Ne";
  results.push(alignment);

  const type = findAttribute(character, "npc_type", "string");
  const matchResult = type.current.match(
    /(?<creatureType>\w+)\s+(?<subtype>\(.*\))?/
  );

  if (matchResult === null) {
    context.warn(
      `npc_type field does not follow 'Type (Subtype)' form: '${type.current}'. Skipping npc_type`
    );
    return results;
  }

  type.current = `Undead ${matchResult.groups.subtype}`;
  results.push(type);

  return results;
};

const updateSaves = (character, context) => {
  const results = [];

  const hdRoll = character.getAttribute("hd_roll");
  const hitDice = parseHitDice(hdRoll.current);

  if (hitDice === null) {
    context.warn(
      `hd_roll field does not follow 1d4+10 form: '${hdRoll.current}'. Skipping saves`
    );
    return results;
  }

  const fortitude = findAttribute(character, "fortitude", "number");
  const charismaMod = character.getAttribute("charisma_mod");
  fortitude.current = 0 + charismaMod.current + Math.floor(hitDice / 3);
  results.push(fortitude);

  const reflex = findAttribute(character, "reflex", "number");
  const dexterityMod = character.getAttribute("dexterity_mod");
  reflex.current = 0 + dexterityMod.current + Math.floor(hitDice / 3);
  results.push(reflex);

  const will = findAttribute(character, "will", "number");
  const wisdomMod = character.getAttribute("wisdom_mod");
  will.current = 2 + wisdomMod.current + Math.floor(hitDice / 2);
  results.push(will);

  return results;
};

const updateAttack = (character, context) => {
  const results = [];

  const hdRoll = character.getAttribute("hd_roll");
  const hitDice = parseHitDice(hdRoll.current);

  if (hitDice === null) {
    context.warn(
      `hd_roll field does not follow 1d4+10 form: '${hdRoll.current}'. Skipping base attack bonus`
    );
    return results;
  }

  const baseAttackBonus = findAttribute(character, "bab", "number");
  baseAttackBonus.current = Math.floor(hitDice * (3 / 4));
  results.push(baseAttackBonus);

  const calculateAttack = (name, abilityModifier, isRanged) => {
    const sizeBonus = calculateSizeBonus(character, bonusAttackMapping);
    const attacks = findRepeatingAttributes(character, name);

    const attackResults = Object.keys(attacks).map((id) => {
      const attack = attacks[id];
      const attackModifier =
        baseAttackBonus.current + abilityModifier + sizeBonus;

      // NOTE: casting the attackModifier to a string
      // because that's the way it's originally stored
      attack.atkmod.current = `${attackModifier}`;
      attack.atkmod.setWithWorker = true;

      const roll = parseRoll(attack.dmgbase.current);
      if (roll === null) {
        context.warn(
          `${attack.atkname.current} attack does not follow 1d4+10 form: '${roll.current}'. Skipping damage`
        );
      } else {
        if (isRanged) {
          attack.dmgbase.current = `${roll.level}d${roll.size}`;

          const thrownDamage = character.getAttribute("strength_mod").current;
          attack.atkdesc.current = `Add +${thrownDamage} damage when weapon is thrown.`;
        } else {
          attack.dmgbase.current = `${roll.level}d${roll.size}+${abilityModifier}`;

          const twoHandedDamage =
            Math.floor(abilityModifier * 1.5) - abilityModifier;
          attack.atkdesc.current = `Add +${twoHandedDamage} damage when using weapon with two hands.`;
        }

        attack.dmgbase.setWithWorker = true;

        // This enables printing attack notes when clicking on an attack
        if (!("descflag" in attack)) {
          const descFlagAttributeName = `${name}_${id}_descflag`;

          createObj("attribute", {
            name: descFlagAttributeName,
            current: "",
            max: "",
            _characterid: character.id,
          });

          attack.descflag = findAttribute(character, descFlagAttributeName);
        }

        attack.descflag.current = "{{descflag=[[1]]}}{{desc=@{atkdesc}}}";
      }

      attack.atkdisplay.current = `${attack.atkname.current}  + ${attackModifier} (${attack.dmgbase.current})`;

      return [attack.atkmod, attack.dmgbase, attack.descflag, attack.atkdesc];
    });

    return _.flatten(attackResults);
  };

  const strengthModifier = character.getAttribute("strength_mod").current;
  const meleeAttacks = calculateAttack(
    "repeating_npcatk-melee",
    strengthModifier,
    false
  );

  log(meleeAttacks);

  const dexterityModifier = character.getAttribute("dexterity_mod").current;
  const rangedAttacks = calculateAttack(
    "repeating_npcatk-ranged",
    dexterityModifier,
    true
  );

  log(rangedAttacks);

  return results.concat(meleeAttacks).concat(rangedAttacks);
};

const updateSkills = (character) => {
  const attributes = findObjs({
    type: "attribute",
    _characterid: character.id,
  });

  const skillNames = attributes
    .filter((attribute) => attribute.get("name").endsWith("_classkill"))
    .map((attribute) => attribute.get("name").replace("_classkill", ""));

  const results = attributes
    .filter((attribute) => skillNames.includes(attribute.get("name")))
    .map((attribute) => {
      const att = new Attribute(attribute);
      att.current = 0;
      att.setWithWorker = true;
      return att;
    });

  log(results);

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
