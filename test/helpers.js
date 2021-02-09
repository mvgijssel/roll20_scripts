process.env.NODE_ENV = "test";

import chai, { expect } from "chai";
import Campaign from "mock20/Functions/API_Objects/Campaign";
import sinon from "sinon";
import sinonChai from "sinon-chai";

require("mock20");
import MOCK20object from "mock20/Objects/Mock20_object";

Object.defineProperty(MOCK20object.prototype, "attributes", {
  get() {
    return this.MOCK20data;
  },
});

MOCK20object.prototype.setWithWorker = function (...args) {
  this.set(...args);
};

chai.use(sinonChai);

global.expect = expect;
global.sinon = sinon;

afterEach(() => {
  sinon.restore();
  Campaign().MOCK20reset();
});

const allAttributes = require("./fixtures/ogre_attributes.json");

global.createCharacter = (overrides) => {
  const character = createObj("character", overrides);
  allAttributes.forEach((attribute) => {
    createObj("attribute", {
      ...attribute,
      _characterid: character.id,
    });
  });
  return character;
};
