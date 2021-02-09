/* global sendChat, log, findObjs, createObj, _ */

export default class Roll20 {}

Roll20.sendChat = sendChat;
Roll20.log = log;
Roll20.findObjs = findObjs;
Roll20.createObj = createObj;
Roll20.duplicateOfCharacter = (character) => {
  const characterIds = Roll20.findObjs({
    name: "duplicateOf",
    current: String(character.id),
    _type: "attribute",
  }).map((att) => att.get("_characterid"));

  return Roll20.findObjs({
    _type: "character",
  }).filter((char) => characterIds.includes(char.id));
};
Roll20.isTest =
  _.get(this, ["process", "env", "NODE_ENV"], "production") === "test";
