/* global sendChat, log */

export default class Roll20 {}

if (process.env.NODE_ENV === "test") {
  Roll20.sendChat = () => {};
  Roll20.log = () => {};
} else {
  Roll20.sendChat = sendChat;
  Roll20.log = log;
}
