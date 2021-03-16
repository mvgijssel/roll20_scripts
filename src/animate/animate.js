import { DiceRoller } from "dice-roller-parser";

import Character from "../lib/Character";
import Attribute from "../lib/Attribute";
import Roll20 from "../lib/Roll20";
import update from "../lib/update";

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

// UTILITY METHODS
const calculateModifier = (number) => Math.floor(number / 2) - 5;

const calculateSizeBonus = (character, mapping) => {
  const size = Roll20.findAttribute(character, "size", "string");
  return castValue(_.get(mapping, size.current, 0), "number");
};

const parseRoll = (string) => {
  const matchResult = string.match(
    /(?<level>\d+)d(?<size>\d+)(?:\+(?<bonus>\d+))?/
  );

  if (matchResult === null) return matchResult;

  return matchResult.groups;
};

const parseHitDice = (string) => {
  const roller = new DiceRoller();
  let roll = null;

  try {
    roll = roller.parse(string);
  } catch {
    return roll;
  }

  switch (roll.type) {
    case "die": {
      return roll.count.value;
    }

    case "expression": {
      return roll.head.count.value;
    }

    default: {
      return null;
    }
  }
};

// UPDATE METHODS
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

const updateAbilities = (character) => {
  const updateAbility = (name, value, operation = "set") => {
    const results = [];

    const ability = Roll20.findAttribute(character, name, "number");
    const newValue = operation === "set" ? value : ability.current + value;

    ability.current = newValue;
    results.push(ability);

    const abilityMod = Roll20.findAttribute(character, `${name}_mod`, "number");
    abilityMod.current = calculateModifier(newValue);
    results.push(abilityMod);

    return results;
  };

  const results = [];

  results.push(updateAbility("constitution", 0));
  results.push(updateAbility("intelligence", 0));
  results.push(updateAbility("wisdom", 10));
  results.push(updateAbility("charisma", character.template.charisma));
  results.push(updateAbility("strength", character.template.strength, "add"));
  results.push(updateAbility("dexterity", character.template.dexterity, "add"));

  return results;
};

const updateHitPoints = (character, context, desecrate) => {
  const results = [];
  const hdRoll = Roll20.findAttribute(character, "hd_roll", "string");
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
  let newBonus = newLevel * castValue(currentCharismaModifier, "number");

  // https://www.d20pfsrd.com/magic/all-spells/d/desecrate/
  // An undead creature created within or summoned into such an area gains +1 hit points per HD
  if (desecrate) {
    newBonus += newLevel;
  }

  let newHdRoll = `${newLevel}d${newSize}`;

  if (newBonus > 0) {
    newHdRoll = `${newHdRoll}+${newBonus}`;
  }

  hdRoll.current = newHdRoll;
  results.push(hdRoll);

  const hp = Roll20.findAttribute(character, "hp", "number");

  const roller = new DiceRoller();
  const roll = roller.rollValue(hdRoll.current);

  hp.current = roll;
  hp.max = roll;

  results.push(hp);
  return results;
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
  const ac = Roll20.findAttribute(character, "ac", "number");
  const acNotes = Roll20.findAttribute(character, "ac_notes", "string");
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

  const name = Roll20.findAttribute(character, "npcdrop_name", "string");
  name.current = `${character.template.name} ${name.current}`;
  results.push(name);

  const alignment = Roll20.findAttribute(character, "npc_alignment", "string");
  alignment.current = "Ne";
  results.push(alignment);

  const type = Roll20.findAttribute(character, "npc_type", "string");
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

  const fortitude = Roll20.findAttribute(character, "fortitude", "number");
  const charismaMod = character.getAttribute("charisma_mod");
  fortitude.current = 0 + charismaMod.current + Math.floor(hitDice / 3);
  results.push(fortitude);

  const reflex = Roll20.findAttribute(character, "reflex", "number");
  const dexterityMod = character.getAttribute("dexterity_mod");
  reflex.current = 0 + dexterityMod.current + Math.floor(hitDice / 3);
  results.push(reflex);

  const will = Roll20.findAttribute(character, "will", "number");
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

  const baseAttackBonus = Roll20.findAttribute(character, "bab", "number");
  baseAttackBonus.current = Math.floor(hitDice * (3 / 4));
  results.push(baseAttackBonus);

  const calculateAttack = (name, abilityModifier, isRanged) => {
    const sizeBonus = calculateSizeBonus(character, bonusAttackMapping);
    const attacks = Roll20.findRepeatingAttributes(character, name);

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

          Roll20.createObj("attribute", {
            name: descFlagAttributeName,
            current: "",
            max: "",
            _characterid: character.id,
          });

          attack.descflag = Roll20.findAttribute(
            character,
            descFlagAttributeName
          );
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

  // Roll20.log(meleeAttacks);

  const dexterityModifier = character.getAttribute("dexterity_mod").current;
  const rangedAttacks = calculateAttack(
    "repeating_npcatk-ranged",
    dexterityModifier,
    true
  );

  // Roll20.log(rangedAttacks);

  return results.concat(meleeAttacks).concat(rangedAttacks);
};

const updateSkills = (character) => {
  const attributes = Roll20.characterAttributes(character);

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

  return results;
};

const updateSpecial = (character) => {
  const results = [];

  const defensiveAbilities = Roll20.findAttribute(
    character,
    "defensive_abilities",
    "string"
  );
  defensiveAbilities.current = character.template.defensiveAbilities;
  results.push(defensiveAbilities);

  const dr = Roll20.findAttribute(character, "npc_dr", "string");
  dr.current = character.template.dr;
  results.push(dr);

  const immune = Roll20.findAttribute(character, "immune", "string");
  immune.current = character.template.immune;
  results.push(immune);

  character.template.specialAbilities.forEach((ability) => {
    const rowId = Roll20.generateRowID();

    const createRepeatingAttribute = (name, value) => {
      const rowName = `repeating_abilities_${rowId}_${name}`;
      Roll20.createObj("attribute", {
        name: rowName,
        current: "",
        max: "",
        _characterid: character.id,
      });
      const attribute = Roll20.findAttribute(character, rowName);
      attribute.current = value;
      return attribute;
    };

    results.push(createRepeatingAttribute("name", ability.name));
    results.push(createRepeatingAttribute("type", ability.description));
    results.push(createRepeatingAttribute("description", ability.description));
  });

  return results;
};

export default (context, charObj, template, { desecrate }) => {
  const character = new Character(charObj, template);

  // Update the character according to https://homebrewery.naturalcrit.com/share/HJMdrpxOx
  character.addAttributes(updateAbilities(character));
  character.addAttributes(updateHitPoints(character, context, desecrate));
  character.addAttributes(updateArmor(character, context));
  character.addAttributes(updateType(character, context));
  character.addAttributes(updateSaves(character, context));
  character.addAttributes(updateAttack(character, context));
  character.addAttributes(updateSkills(character));
  character.addAttributes(updateSpecial(character));

  const messages = update(character, true);
  context.info(messages.join("<br />"));
};
