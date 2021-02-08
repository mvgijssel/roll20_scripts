import Cli from "../../animate/Cli";
import Context from "../../lib/Context";
import Roll20 from "../../lib/Roll20";

def("type", () => "api");
def("gm", () =>
  createObj("player", { _displayname: "playerGm" }, { MOCK20override: true })
);
def("player", () =>
  createObj("player", { _displayname: "player1" }, { MOCK20override: true })
);
def("content", () => `!animate skeleton player1 Ogre`);
def("ogreCharacter", () => createObj("character", { name: "Ogre" }));
def("goblinCharacter", () => createObj("character", { name: "Goblin" }));

def("message", () => ({
  content: $content,
  playerid: $gm.id,
  selected: [],
  type: $type,
  who: "playerGm (GM)",
}));
def("context", () => new Context("animate", $message));

beforeEach(() => {
  $gm;
  $player;
  $ogreCharacter;
  $goblinCharacter;
});

describe("process", () => {
  subject(() => Cli.process($context));

  context("with an unknown character sheet", () => {
    def("content", () => "!animate skeleton player1 unknownSheet");

    beforeEach(() => {
      sinon.stub(Roll20, "sendChat");
    });

    it("prints available sheets", () => {
      expect($subject).to.eq(false);

      expect(Roll20.sendChat).to.have.been.calledOnce;
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/Ogre, Goblin/)
      );
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/unknownSheet/)
      );
    });
  });

  context("with an unknown player", () => {
    def("content", () => "!animate skeleton unknownPlayer Ogre");

    beforeEach(() => {
      sinon.stub(Roll20, "sendChat");
    });

    it("prints available players", () => {
      expect($subject).to.eq(false);

      expect(Roll20.sendChat).to.have.been.calledOnce;
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/playerGm, player1/)
      );
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/unknownPlayer/)
      );
    });
  });

  context("with an unknown template", () => {
    def("content", () => "!animate unknownTemplate player2 Ogre");

    beforeEach(() => {
      sinon.stub(Roll20, "sendChat");
    });

    it("prints available templates", () => {
      expect($subject).to.eq(false);

      expect(Roll20.sendChat).to.have.been.calledOnce;
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/skeleton, zombie/)
      );
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/unknownTemplate/)
      );
    });
  });

  context("when the content starts with !animate", () => {
    def("content", () => "!animate");

    beforeEach(() => {
      sinon.stub(Roll20, "sendChat");
    });

    it("prints the script usage", () => {
      expect($subject).to.eq(false);
      expect(Roll20.sendChat).to.have.been.calledOnce;
      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/!animate template player sheet/)
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
});
