const assert = require("assert");
const { AI_BEHAVIOR_PROFILES, aiChooseTurnAction } = require("../js/ai-logic");

function withFixedRandom(value, fn) {
  const original = Math.random;
  Math.random = () => value;
  try {
    fn();
  } finally {
    Math.random = original;
  }
}

function makePlayer(role, types) {
  return {
    role,
    hand: types.map((type, idx) => ({ id: `${type}-${idx}`, type })),
    revealed: types.map(() => false)
  };
}

// Risky profiles should still push trades when the random roll is under their swap chance.
withFixedRandom(0.1, () => {
  const player = makePlayer("Noble", ["Gold", "Poison"]);
  const decision = aiChooseTurnAction(player, AI_BEHAVIOR_PROFILES.Risky);
  assert.strictEqual(decision.action, "swap");
});

// Conservative profiles guard valuable cards and will keep when swap probability drops below the random roll.
withFixedRandom(0.18, () => {
  const player = makePlayer("Noble", ["Gold"]);
  const decision = aiChooseTurnAction(player, AI_BEHAVIOR_PROFILES.Conservative);
  assert.strictEqual(decision.action, "keep");
});

// Balanced profiles with junk in hand should lean into swapping to improve their position.
withFixedRandom(0.5, () => {
  const player = makePlayer("Noble", ["Poison", "Shield"]);
  const decision = aiChooseTurnAction(player, AI_BEHAVIOR_PROFILES.Balanced);
  assert.strictEqual(decision.action, "swap");
});

console.log("AI turn action tests passed.");
