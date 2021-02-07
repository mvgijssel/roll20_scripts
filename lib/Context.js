import Roll20 from "./Roll20";

export default class Context {
  constructor(name, message) {
    this.name = name;
    this.message = message;
  }

  info(text) {
    Roll20.sendChat(
      this.name,
      `/w ${this.message.who.replace(
        " (GM)",
        ""
      )} <div style="color: #993333;">${text}</div>`,
      null,
      { noarchive: true }
    );
  }

  // roll(text, callback) {
  //   sendChat(this.name, `/roll ${text}`, callback, { noarchive: true });
  // }
}
