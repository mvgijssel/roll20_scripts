process.env.NODE_ENV = "test";

import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

global.expect = expect;
global.sinon = sinon;

// This mimics the global log method available in roll20
global.log = (content) => console.log(content);

// after(async () => {
//   await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
// });

// beforeEach(async () => {
//   await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
// });
