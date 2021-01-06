// TODO: Make idempotent
// TODO: Make reverse of animate. preanimate?
// TODO: Make !animate be able to assign it to a user
// TODO: Implement updated armor
// TODO: Implement saves
// TODO: Implement base attack bonus
// TODO: Implement type and alignment
// TODO: Implement skills
// TODO: Implement feats
// TODO: Implement special, check (Ex) qualities?

/* global sendChat, findObjs, _, log, getObj, getAttrByName, on */

const castToNumber = (value) => {
  const newValue = parseInt(value, 10);
  return Number.isNaN(newValue) ? 0 : newValue;
};

const sChat = (msg, txt) => {
  sendChat(
    "animate",
    `/w ${msg.who.replace(
      " (GM)",
      ""
    )} <div style="color: #993333;font-weight:bold;">${txt}</div>`,
    null,
    { noarchive: true }
  );
};

const calculateModifier = (number) => Math.floor(number / 2) - 5;

const calculateNaturalAc = (characterId, mapping) => {
  const size = findObjs({
    type: "attribute",
    _characterid: characterId,
    name: "size",
  })[0];

  return castToNumber(_.get(mapping, size.get("current"), 0));
};

const calculateBonusHd = (characterId) => {
  const size = findObjs({
    type: "attribute",
    _characterid: characterId,
    name: "size",
  })[0];

  const mapping = {
    tiny: 0,
    small: +1,
    medium: +1,
    large: +2,
    huge: +4,
    gargantuan: +6,
    colossal: +10,
  };

  return castToNumber(_.get(mapping, size.get("current"), 0));
};

const updateAbility = (characterId, name, value, operation = "set") => {
  const ability = findObjs({
    type: "attribute",
    _characterid: characterId,
    name,
  })[0];

  log(ability);

  const currentValue = castToNumber(ability.get("current"));
  const newValue = operation === "set" ? value : currentValue + value;

  ability.set({ max: newValue, current: newValue });

  const abilityMod = findObjs({
    type: "attribute",
    _characterid: characterId,
    name: `${name}_mod`,
  })[0];

  const currentMod = castToNumber(abilityMod.get("current"));
  const newMod = calculateModifier(newValue);

  abilityMod.set({ current: newMod });

  return `Updated ${name} from ${currentValue} (${currentMod}) to ${newValue} (${newMod})`;
};

const actions = {
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

const usage = () => {
  const actionString = Object.keys(actions)
    .map((action) => `!animate ${action}`)
    .join("<br />");
  return `Select a token and type one of:<br />${actionString}`;
};

const process = (msg) => {
  if (msg.type !== "api") return;

  const match = msg.content.match(/!(?<operation>animate)\s*(?<action>.+$)?/);

  if (match === null) return;

  const { action } = match.groups;

  log(msg);
  log(match.groups);

  if (!Object.keys(actions).includes(action)) {
    sChat(msg, `Unknown action '${match.groups.action}'. ${usage()}`);
    return;
  }

  // check for selection
  if (!msg.selected || msg.selected.length === 0) {
    sChat(msg, usage());
    return;
  }

  // iterate selection
  msg.selected.forEach((selection) => {
    const tokenObj = getObj("graphic", selection._id);
    const template = actions[action];

    if (tokenObj === undefined) {
      sChat(msg, `Unable to find graphic for ${selection._id}.`);
      return;
    }

    log(tokenObj);

    const charObj = getObj("character", tokenObj.get("represents"));

    if (charObj === undefined) {
      sChat(
        msg,
        `Token with id ${tokenObj._id} is not correctly linked to a good character.`
      );
      return;
    }

    log(charObj);

    // const attributes = findObjs(
    //   { type: "attribute", _characterid: charObj.id },
    //   { caseInsensitive: true }
    // );

    // log(attributes);

    // Update the character according to https://homebrewery.naturalcrit.com/share/HJMdrpxOx
    const messages = [];

    const currentName = charObj.get("name");
    const newName = `${template.name} ${charObj.get("name")}`;
    charObj.set({ name: newName });
    messages.push(`Updated name from ${currentName} to ${newName}`);

    // Step 1: Ability scores
    messages.push(updateAbility(charObj.id, "constitution", 0));
    messages.push(updateAbility(charObj.id, "intelligence", 0));
    messages.push(updateAbility(charObj.id, "wisdom", 10));
    messages.push(updateAbility(charObj.id, "charisma", 10));
    messages.push(
      updateAbility(charObj.id, "strength", template.strength, "add")
    );
    messages.push(
      updateAbility(charObj.id, "dexterity", template.dexterity, "add")
    );

    // Step 2: Hit dice and natural armor
    const hdRoll = findObjs({
      type: "attribute",
      _characterid: charObj.id,
      name: "hd_roll",
    })[0];

    const currentHdRoll = hdRoll.get("current");

    log(currentHdRoll);

    // This matching 4d8+12 notation and parses out the 3 numbers
    const matchResult = currentHdRoll.match(
      /(?<level>\d+)d(?<size>\d+)(?:\+(?<bonus>\d+))?/
    );

    if (matchResult === null) {
      sChat(
        msg,
        `Cannot parse hd_roll field: '${currentHdRoll}'. Skipping hit points`
      );
    } else {
      const currentLevel = castToNumber(matchResult.groups.level);
      const newLevel = currentLevel + calculateBonusHd(charObj.id);
      const newSize = 8;
      const newBonus =
        newLevel * castToNumber(getAttrByName(charObj.id, "charisma_mod"));

      let newHdRoll = `${newLevel}d${newSize}`;

      if (newBonus > 0) {
        newHdRoll = `${newHdRoll}+${newBonus}`;
      }

      hdRoll.set({ current: newHdRoll });
      messages.push(`Updated hd_roll from ${currentHdRoll} to ${newHdRoll}`);

      // actually roll the hitpoints
      const hp = findObjs({
        type: "attribute",
        _characterid: charObj.id,
        name: "hp",
      })[0];

      sendChat(
        "animate",
        `/roll ${newHdRoll}`,
        (result) => {
          log(result);

          const currentMaxHp = hp.get("max");
          const newHp = JSON.parse(result[0].content).total;

          hp.set({ current: newHp, max: newHp });
          sChat(msg, `Updated hp from ${currentMaxHp} to ${newHp}`);
        },
        { noarchive: true }
      );
    }

    // calculate ac: 10 + armor bonus + shield bonus + dext modifier + natural armor - size modifier
    // 10 + -1 (size)
    // current 17
    // also ac_touch, ac_flatfooted
    // parse the ac_notes
    // const ac = findObjs({
    //   type: "attribute",
    //   _characterid: charObj.id,
    //   name: "ac",
    // })[0];

    // // current
    const acNotes = findObjs({
      type: "attribute",
      _characterid: charObj.id,
      name: "ac_notes",
    })[0];

    const newNaturalAc = calculateNaturalAc(
      charObj.id,
      template.naturalArmorBonus
    );

    sChat(
      msg,
      `MANUALLY update current ac '${acNotes.get(
        "current"
      )}' REPLACING natural armor bonus to +${newNaturalAc}.`
    );

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

    sChat(msg, messages.join("<br />"));
  });
};

on("ready", () => {
  on("chat:message", process);
});
