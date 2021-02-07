import Cli from "../../animate/Cli";
import Context from "../../lib/Context";
import Roll20 from "../../lib/Roll20";

def("content", () => "!animate skeleton player2 Ogre");
def("type", () => "api");
def("message", () => ({
  content: $content,
  playerid: "-MQH0Xoy7G0TZOrwJnqR",
  selected: [
    {
      _id: "-MSwV06iICMAVS3-_FWE",
      _type: "graphic",
    },
  ],
  type: $type,
  who: "player1 (GM)",
}));
def("context", () => new Context("animate", $message));

subject(() => Cli.process($context));

context("when the content starts with !animate", () => {
  def("content", () => "!animate");

  beforeEach(() => {
    sinon.stub(Roll20, "sendChat");
  });

  it("prints the script usage", () => {
    $subject;

    expect(Roll20.sendChat).to.have.been.calledOnce;
    expect(Roll20.sendChat).to.have.been.calledWith(
      "animate",
      sinon.match(/\!animate <sheet> <template> <player>/)
    );
  });
});

context("with unrelated message type", () => {
  def("type", () => "foo");

  it("does not execute", () => {
    expect($subject).to.eq(false);
  });
});

context("with unrelated message context", () => {
  def("content", () => "!random message");

  it("does not execute", () => {
    expect($subject).to.eq(false);
  });
});
