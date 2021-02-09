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
def("ogreCharacter", () => createCharacter({ name: "Ogre" }));
def("goblinCharacter", () => createObj("character", { name: "Goblin" }));
def("goblinAttribute", () =>
  createObj("attribute", {
    name: "Strength",
    current: "10",
    _characterid: $goblinCharacter.id,
  })
);

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
  $goblinAttribute;
});

const characters = (args = {}) =>
  Roll20.findObjs({
    _type: "character",
    ...args,
  });

const attributes = (character) =>
  Roll20.findObjs({
    _type: "attribute",
    _characterid: character.id,
  });

describe("execute", () => {
  subject(() => new Cli($context).execute());

  it("duplicates the character", () => {
    expect(characters().length).to.eq(2);
    expect(Roll20.duplicateOfCharacter($ogreCharacter)).to.have.lengthOf(0);

    $subject;

    expect(characters().length).to.eq(3);
    expect(Roll20.duplicateOfCharacter($ogreCharacter)).to.have.lengthOf(1);
  });

  it("duplicates the attributes", () => {
    $subject;

    const duplicates = Roll20.duplicateOfCharacter($ogreCharacter);
    expect(duplicates).to.have.lengthOf(1);

    expect(attributes($ogreCharacter)).to.have.lengthOf(881);
    expect(attributes(duplicates[0])).to.have.lengthOf(950);
  });

  it("assigns the duplicate to the given player", () => {
    $subject;

    expect(
      Roll20.duplicateOfCharacter($ogreCharacter)[0].get("controlledby")
    ).to.eq($player.id);
  });

  it("Animates the duplicated character", () => {
    $subject;

    expect(characters({ name: "Skeleton Ogre" })).to.have.lengthOf(1);

    const duplicate = characters({ name: "Skeleton Ogre" })[0];

    const duplicateAttributes = Roll20.characterAttributes(duplicate);
    const originalAttributes = Roll20.characterAttributes($ogreCharacter);

    expect(originalAttributes).to.have.lengthOf(881);
    expect(duplicateAttributes).to.have.lengthOf(950);
  });

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
