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

chai.use(sinonChai);

global.expect = expect;
global.sinon = sinon;

afterEach(() => {
  sinon.restore();
  Campaign().MOCK20reset();
});
