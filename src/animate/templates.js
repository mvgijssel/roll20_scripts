export default {
  skeleton: {
    name: "Skeleton",
    strength: 0,
    dexterity: +2,
    charisma: 10,
    naturalArmorBonus: {
      tiny: 0,
      small: +1,
      medium: +2,
      large: +2,
      huge: +3,
      gargantuan: +6,
      colossal: +10,
    },
    defensiveAbilities: "",
    dr: "DR 5/bludgeoning",
    immune: "Cold, Undead Traits",
    specialAbilities: [],
  },
  bloody_skeleton: {
    name: "Bloody Skeleton",
    strength: 0,
    dexterity: +2,
    charisma: 14,
    naturalArmorBonus: {
      tiny: 0,
      small: +1,
      medium: +2,
      large: +2,
      huge: +3,
      gargantuan: +6,
      colossal: +10,
    },
    defensiveAbilities: "Channel resistance +4, Deathless",
    dr: "DR 5/bludgeoning",
    immune: "Cold, Undead Traits",
    specialAbilities: [
      {
        name: "Deathless",
        su: "Su",
        description:
          "A bloody skeleton is destroyed when reduced to 0 hit points, but it returns to unlife 1 hour later at 1 hit point, allowing its fast healing thereafter to resume healing it. A bloody skeleton can be permanently destroyed if it is destroyed by positive energy, if it is reduced to 0 hit points in the area of a bless or hallow spell, or if its remains are sprinkled with a vial of holy water.",
      },
    ],
  },
  zombie: {
    name: "Zombie",
    strength: +2,
    dexterity: -2,
    charisma: 10,
    naturalArmorBonus: {
      tiny: 0,
      small: +1,
      medium: +2,
      large: +3,
      huge: +4,
      gargantuan: +7,
      colossal: +11,
    },
    defensiveAbilities: "",
    dr: "DR 5/slashing",
    immune: "Undead Traits",
    specialAbilities: [
      {
        name: "Staggered",
        type: "Ex",
        description:
          "Zombies have poor reflexes and can only perform a single move action or standard action each round. A zombie can move up to its speed and attack in the same round as a charge action. ",
      },
    ],
  },
};
