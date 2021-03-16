import { expect } from "chai";
import animate from "../../src/animate/animate";
import templates from "../../src/animate/templates";
import Roll20 from "../../src/lib/Roll20";
import Context from "../../src/lib/Context";

describe("animate", () => {
  beforeEach(() => {
    sinon.stub($context, "info");
  });

  def("message", () => ({
    content: "some content",
    playerid: "player id",
    selected: [],
    type: "api",
    who: "playerGm (GM)",
  }));
  def("context", () => new Context("animate", $message));

  describe("desecrate", () => {
    const hdRoll = (characterId) =>
      Roll20.findAttributeByName(characterId, "hd_roll").get("current");

    it("adds bonus hit points when animating using the desecrate spell", () => {
      const withDesecrate = createCharacter({ name: "Desecrate Ogre" });
      const withoutDesecrate = createCharacter({
        name: "Without Desecreate Ogre",
      });

      animate($context, withDesecrate, templates.skeleton, { desecrate: true });
      animate($context, withoutDesecrate, templates.skeleton, {
        desecrate: false,
      });

      expect(hdRoll(withoutDesecrate.id)).to.eq("6d8");
      expect(hdRoll(withDesecrate.id)).to.eq("6d8+6");
    });
  });

  describe("update special", () => {
    def("character", () => createCharacter({ name: "Ogre" }));

    const defensiveAbilities = () =>
      Roll20.findAttributeByName($character.id, "defensive_abilities");

    subject(() =>
      animate($context, $character, templates.bloody_skeleton, {
        desecrate: false,
      })
    );

    context("without defensive abilities", () => {
      beforeEach(() => {
        defensiveAbilities().remove();
      });

      it("works", () => {
        $subject;

        expect(defensiveAbilities().get("current")).to.eq(
          "Channel resistance +4, Deathless"
        );
      });
    });
  });

  describe("templates", () => {
    const name = () => Roll20.findCharacterById($character.id).get("name");
    const strength = () =>
      Roll20.findAttributeByName($character.id, "strength").get("current");
    const strengthMod = () =>
      Roll20.findAttributeByName($character.id, "strength_mod").get("current");
    const dexterity = () =>
      Roll20.findAttributeByName($character.id, "dexterity").get("current");
    const dexterityMod = () =>
      Roll20.findAttributeByName($character.id, "dexterity_mod").get("current");
    const charisma = () =>
      Roll20.findAttributeByName($character.id, "charisma").get("current");
    const charismaMod = () =>
      Roll20.findAttributeByName($character.id, "charisma_mod").get("current");
    const ac = () =>
      Roll20.findAttributeByName($character.id, "ac").get("current");
    const acNotes = () =>
      Roll20.findAttributeByName($character.id, "ac_notes").get("current");
    const hdRoll = () =>
      Roll20.findAttributeByName($character.id, "hd_roll").get("current");
    const defensiveAbilities = () =>
      Roll20.findAttributeByName($character.id, "defensive_abilities").get(
        "current"
      );
    const dr = () =>
      Roll20.findAttributeByName($character.id, "npc_dr").get("current");
    const immune = () =>
      Roll20.findAttributeByName($character.id, "immune").get("current");
    const specialAbilities = () =>
      Roll20.findRepeatingAttributeByName(
        $character.id,
        "repeating_abilities"
      ).map((a) => a.name.get("current"));

    def("character", () => createCharacter({ name: "Ogre" }));

    subject(() =>
      animate($context, $character, $template, { desecrate: false })
    );

    describe("skeleton", () => {
      def("template", () => templates.skeleton);

      it("prefixes the name", () => {
        expect(name()).to.eq("Ogre");
        $subject;
        expect(name()).to.eq("Skeleton Ogre");
      });

      it("does not change the strength", () => {
        expect(strength()).to.eq(21);
        expect(strengthMod()).to.eq(5);
        $subject;
        expect(strength()).to.eq(21);
        expect(strengthMod()).to.eq(5);
      });

      it("changes the charisma", () => {
        expect(charisma()).to.eq(7);
        expect(charismaMod()).to.eq(-2);
        $subject;
        expect(charisma()).to.eq(10);
        expect(charismaMod()).to.eq(0);
      });

      it("increases dexterity", () => {
        expect(dexterity()).to.eq(8);
        expect(dexterityMod()).to.eq(-1);
        $subject;
        expect(dexterity()).to.eq(10);
        expect(dexterityMod()).to.eq(0);
      });

      it("reduces the armor", () => {
        expect(ac()).to.eq(17);
        expect(acNotes()).to.eq("+4 Armor, -1 Dex, +5 Natural, -1 Size");
        $subject;
        expect(ac()).to.eq(15);
        expect(acNotes()).to.eq("+4 Armor, +0 Dex, +2 Natural, -1 Size");
      });

      it("updates the hd roll", () => {
        expect(hdRoll()).to.eq("4d8+12");
        $subject;
        expect(hdRoll()).to.eq("6d8");
      });

      it("udates the special qualities", () => {
        expect(defensiveAbilities()).to.eq("");
        expect(dr()).to.eq("");
        expect(immune()).to.eq("");
        expect(specialAbilities()).to.deep.eq([]);
        $subject;
        expect(defensiveAbilities()).to.eq("");
        expect(dr()).to.eq("DR 5/bludgeoning");
        expect(immune()).to.eq("Cold, Undead Traits");
        expect(specialAbilities()).to.deep.eq([]);
      });

      describe("bloody_skeleton", () => {
        def("template", () => templates.bloody_skeleton);

        it("prefixes the name", () => {
          expect(name()).to.eq("Ogre");
          $subject;
          expect(name()).to.eq("Bloody Skeleton Ogre");
        });

        it("changes the charisma", () => {
          expect(charisma()).to.eq(7);
          expect(charismaMod()).to.eq(-2);
          $subject;
          expect(charisma()).to.eq(14);
          expect(charismaMod()).to.eq(2);
        });

        it("gets bonus hit points due to increased charisma", () => {
          expect(hdRoll()).to.eq("4d8+12");
          $subject;

          const characterLevel = 6;
          const bonusHitPointsPerLevel = 2;

          expect(hdRoll()).to.not.eq(`6d8`);
          expect(hdRoll()).to.eq(
            `6d8+${characterLevel * bonusHitPointsPerLevel}`
          );
        });

        it("udates the special qualities", () => {
          expect(defensiveAbilities()).to.eq("");
          expect(dr()).to.eq("");
          expect(immune()).to.eq("");
          expect(specialAbilities()).to.deep.eq([]);
          $subject;
          expect(defensiveAbilities()).to.eq(
            "Channel resistance +4, Deathless"
          );
          expect(dr()).to.eq("DR 5/bludgeoning");
          expect(immune()).to.eq("Cold, Undead Traits");
          expect(specialAbilities()).to.deep.eq(["Deathless"]);
        });
      });
    });

    describe("zombie", () => {
      def("template", () => templates.zombie);

      it("prefixes the name", () => {
        expect(name()).to.eq("Ogre");
        $subject;
        expect(name()).to.eq("Zombie Ogre");
      });

      it("changes the strength", () => {
        expect(strength()).to.eq(21);
        expect(strengthMod()).to.eq(5);
        $subject;
        expect(strength()).to.eq(23);
        expect(strengthMod()).to.eq(6);
      });

      it("changes the charisma", () => {
        expect(charisma()).to.eq(7);
        expect(charismaMod()).to.eq(-2);
        $subject;
        expect(charisma()).to.eq(10);
        expect(charismaMod()).to.eq(0);
      });

      it("reduces the armor", () => {
        expect(ac()).to.eq(17);
        expect(acNotes()).to.eq("+4 Armor, -1 Dex, +5 Natural, -1 Size");
        $subject;
        expect(ac()).to.eq(14);
        expect(acNotes()).to.eq("+4 Armor, -2 Dex, +3 Natural, -1 Size");
      });

      it("updates the hd roll", () => {
        expect(hdRoll()).to.eq("4d8+12");
        $subject;
        expect(hdRoll()).to.eq("6d8");
      });

      it("udates the special qualities", () => {
        expect(defensiveAbilities()).to.eq("");
        expect(dr()).to.eq("");
        expect(immune()).to.eq("");
        expect(specialAbilities()).to.deep.eq([]);
        $subject;
        expect(defensiveAbilities()).to.eq("");
        expect(dr()).to.eq("DR 5/slashing");
        expect(immune()).to.eq("Undead Traits");
        expect(specialAbilities()).to.deep.eq(["Staggered"]);
      });
    });
  });
});
