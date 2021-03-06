import { expect } from "chai";
import Cli from "../../src/animate/Cli";
import Context from "../../src/lib/Context";
import Roll20 from "../../src/lib/Roll20";

def("type", () => "api");
def("gm", () =>
  createObj("player", { _displayname: "playerGm" }, { MOCK20override: true })
);
def("player", () =>
  createObj("player", { _displayname: "player1" }, { MOCK20override: true })
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
});

subject(() => new Cli($context).execute());

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

describe("cli", () => {
  describe("remove", () => {
    def("content", () => `!animate remove Ogre`);
    def("ogreCharacter", () => createCharacter({ name: "Ogre" }));
    def("otherCharacter", () => createCharacter({ name: "Other Ogre" }));

    beforeEach(() => {
      $ogreCharacter;
      $otherCharacter;
    });

    it("removes duplicates from the target sheet", () => {
      expect(characters().length).to.eq(2);

      Roll20.duplicateCharacter($ogreCharacter);
      Roll20.duplicateCharacter($otherCharacter);

      expect(characters().length).to.eq(4);
      expect(Roll20.duplicateOfCharacter($ogreCharacter)).to.have.length(1);
      expect(Roll20.duplicateOfCharacter($otherCharacter)).to.have.length(1);

      $subject;

      expect(characters().length).to.eq(3);
      expect(Roll20.duplicateOfCharacter($ogreCharacter)).to.have.length(0);
      expect(Roll20.duplicateOfCharacter($otherCharacter)).to.have.length(1);
    });

    it("prints a message", () => {
      sinon.stub(Roll20, "sendChat");

      const duplicate = Roll20.duplicateCharacter($ogreCharacter);
      Roll20.assignPlayerToCharacter($player, duplicate);

      $subject;

      expect(Roll20.sendChat).to.have.been.calledWith(
        "animate",
        sinon.match(/Removed character 'Ogre' for player\(s\) 'player1'/)
      );
    });

    context("with an unknown character sheet", () => {
      def("content", () => `!animate remove unknownSheet`);

      beforeEach(() => {
        sinon.stub(Roll20, "sendChat");
      });

      it("prints available sheets", () => {
        expect($subject).to.eq(true);

        expect(Roll20.sendChat).to.have.been.calledOnce;
        expect(Roll20.sendChat).to.have.been.calledWith(
          "animate",
          sinon.match(/Ogre, Other Ogre/)
        );
        expect(Roll20.sendChat).to.have.been.calledWith(
          "animate",
          sinon.match(/unknownSheet/)
        );
      });
    });
  });

  describe("new", () => {
    def("ogreCharacter", () => createCharacter({ name: "Ogre" }));
    def("goblinCharacter", () => createObj("character", { name: "Goblin" }));
    def("goblinAttribute", () =>
      createObj("attribute", {
        name: "Strength",
        current: "10",
        _characterid: $goblinCharacter.id,
      })
    );

    beforeEach(() => {
      $ogreCharacter;
      $goblinCharacter;
      $goblinAttribute;
    });

    def(
      "content",
      () => `!animate new Ogre --template skeleton --player player1`
    );

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
      expect(attributes(duplicates[0])).to.have.lengthOf(953);
    });

    it("assigns the duplicate to the given player", () => {
      $subject;

      expect(
        Roll20.duplicateOfCharacter($ogreCharacter)[0].get("controlledby")
      ).to.eq($player.id);

      expect(
        Roll20.duplicateOfCharacter($ogreCharacter)[0].get("inplayerjournals")
      ).to.eq($player.id);
    });

    it("Animates the duplicated character", () => {
      $subject;

      expect(characters({ name: "Skeleton Ogre" })).to.have.lengthOf(1);

      const duplicate = characters({ name: "Skeleton Ogre" })[0];

      const duplicateAttributes = Roll20.characterAttributes(duplicate);
      const originalAttributes = Roll20.characterAttributes($ogreCharacter);

      expect(originalAttributes).to.have.lengthOf(881);
      expect(duplicateAttributes).to.have.lengthOf(953);
    });

    context("with desecrate flag", () => {
      def(
        "content",
        () =>
          `!animate new Ogre --template skeleton --player player1 --desecrate`
      );

      it("works with the desecrate flag", () => {
        $subject;

        expect(characters({ name: "Skeleton Ogre" })).to.have.lengthOf(1);

        const duplicate = characters({ name: "Skeleton Ogre" })[0];
        const hdRoll = Roll20.findAttributeByName(duplicate.id, "hd_roll");

        expect(hdRoll.get("current")).to.eq("6d8+6");
      });
    });

    context("with an unknown character sheet", () => {
      def(
        "content",
        () => `!animate new unknownSheet --template skeleton --player player1`
      );

      beforeEach(() => {
        sinon.stub(Roll20, "sendChat");
      });

      it("prints available sheets", () => {
        expect($subject).to.eq(true);

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
      def(
        "content",
        () => `!animate new Ogre --template skeleton --player unknownPlayer`
      );

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
      def(
        "content",
        () => `!animate new Ogre --template unknownTemplate --player player1`
      );

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
          sinon.match(/Usage:/)
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
});
