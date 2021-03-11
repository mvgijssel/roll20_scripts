import Roll20 from "./Roll20";

export default class Context {
  constructor(name, message) {
    this.name = name;
    this.message = message;
    this.data = null;
  }

  info(text) {
    const updatedText = text.split("\n").join("<br />");

    Roll20.sendChat(
      this.name,
      `/w ${this.message.who.replace(
        " (GM)",
        ""
      )} <div style="color: #993333;">${updatedText}</div>`,
      null,
      { noarchive: true }
    );
  }

  warn(text) {
    this.info(text);
  }
}
