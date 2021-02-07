export default class Context {
  constructor(messageObject, action) {
    this._messageObject = messageObject;
    this._chatName = "animate";
    this.action = action;
  }

  info(text) {
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
