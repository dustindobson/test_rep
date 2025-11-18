// js/config.js
// Static config: roles, deck, rules text, icons

// Roles:
// Noble -> wants Gold
// Knight -> wants Shield
// Witch  -> wants Potion
// Assassin -> 1 pt per Dagger +1 if anyone knocked out

const ROLE_DEFS = [
  { name: "Noble", wants: "Gold", type: "simple" },
  { name: "Knight", wants: "Shield", type: "simple" },
  { name: "Witch", wants: "Potion", type: "simple" },
  { name: "Assassin", wants: "Dagger", type: "assassin" }
];

// Resources: 3 Gold, 3 Shield, 3 Potion, 2 Dagger, 2 Poison
function makeDeck() {
  const deck = [];
  for (let i = 0; i < 3; i++) deck.push({ id: "G" + i, type: "Gold" });
  for (let i = 0; i < 3; i++) deck.push({ id: "S" + i, type: "Shield" });
  for (let i = 0; i < 3; i++) deck.push({ id: "P" + i, type: "Potion" });
  for (let i = 0; i < 2; i++) deck.push({ id: "D" + i, type: "Dagger" });
  for (let i = 0; i < 2; i++) deck.push({ id: "X" + i, type: "Poison" });
  return deck;
}

const RESOURCE_TYPES = ["Gold", "Shield", "Potion", "Dagger", "Poison"];
const RESOURCE_TOTALS = {
  Gold: 3,
  Shield: 3,
  Potion: 3,
  Dagger: 2,
  Poison: 2
};

const AI_TYPE_LIST = ["Risky", "Conservative", "Balanced", "Smart", "Chaotic"];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function resourceIcon(type) {
  switch (type) {
    case "Gold": return "🟡";
    case "Shield": return "🛡️";
    case "Potion": return "🧪";
    case "Dagger": return "🗡️";
    case "Poison": return "☠️";
    default: return "";
  }
}

function cardClass(type) {
  const map = {
    Gold: "gold",
    Potion: "potion",
    Shield: "shield",
    Poison: "poison",
    Dagger: "dagger"
  };
  return map[type] || "";
}

function cardText(card) {
  if (!card) return "";
  if (card.type === "Poison") return "☠️ Poison";
  return resourceIcon(card.type) + " " + card.type;
}

function roleIcon(name) {
  const map = {
    Noble: "🟡",
    Knight: "🛡️",
    Witch: "🧪",
    Assassin: "🥷🏽"
  };
  return map[name] || "";
}

