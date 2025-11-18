// js/state.js
// Game state & pure helpers

let gameState = null;

// Debug logging helpers
const DEBUG_LOG_MAX = 2000;
let debugLogEntries = [];
let debugLoggingEnabled = true;
let debugLogCounter = 0;
let debugLogToConsole = false;

function debugLog(source, message = "", data = null) {
  if (!debugLoggingEnabled) return;
  const iso = new Date().toISOString();
  const perf = typeof performance !== "undefined" && performance.now ? performance.now().toFixed(2) : "0";
  const parts = [`#${++debugLogCounter}`, iso, `${perf}ms`, source];
  if (message) parts.push(message);
  if (data) {
    try {
      parts.push(JSON.stringify(data));
    } catch (_err) {
      parts.push("[unserializable data]");
    }
  }
  const line = parts.join(" | ");
  debugLogEntries.push(line);
  if (debugLogEntries.length > DEBUG_LOG_MAX) {
    debugLogEntries = debugLogEntries.slice(-DEBUG_LOG_MAX);
  }
  if (debugLogToConsole && typeof console !== "undefined" && console.debug) {
    console.debug(line);
  }
}

function getDebugSnapshot() {
  if (!gameState) {
    return { phase: "no-game" };
  }
  const actorInfo = typeof getPhaseActorInfo === "function" ? getPhaseActorInfo() : null;
  return {
    phase: gameState.phase,
    turn: gameState.turnCount,
    round: gameState.roundNumber,
    turnInRound: gameState.turnInRound,
    currentPlayerIdx: gameState.currentPlayerIdx,
    pendingOffer: Boolean(gameState.pendingOffer),
    challengeContext: Boolean(gameState.challengeContext),
    actor: actorInfo ? actorInfo.player?.displayName || actorInfo.player?.name : null,
    actorType: actorInfo ? actorInfo.type : null,
    pendingAdvance: gameState.nextPlayerIdx,
    humanPlayers: gameState.humanPlayers,
    turnStep: gameState.turnStep
  };
}

function downloadDebugLog() {
  const headerLines = [
    "Poison Traders debug log",
    `Generated: ${new Date().toISOString()}`,
    `Entries: ${debugLogEntries.length}`,
    ""
  ];
  const blob = new Blob([headerLines.concat(debugLogEntries).join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `poisontraders-debug-${Date.now()}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function setDebugLoggingEnabled(enabled) {
  debugLoggingEnabled = Boolean(enabled);
  debugLog("debug", `logging ${enabled ? "enabled" : "disabled"}`);
}

function setDebugConsoleEnabled(enabled) {
  debugLogToConsole = Boolean(enabled);
  debugLog("debug", `console mirroring ${enabled ? "enabled" : "disabled"}`);
}

function randomAIType() {
  if (!AI_TYPE_LIST || !AI_TYPE_LIST.length) return "Balanced";
  const idx = Math.floor(Math.random() * AI_TYPE_LIST.length);
  return AI_TYPE_LIST[idx];
}

function createInitialGameState(numPlayers, humanSeatIdx = null, aiSelections = [], humanPlayers = 1) {
  const resolvedHumanIdx = typeof humanSeatIdx === "number" ? humanSeatIdx : -1;
  const rolesPool = shuffle(ROLE_DEFS);
  const assignedRoles = rolesPool.slice(0, numPlayers);

  let deck = shuffle(makeDeck());

  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    const hand = [];
    const revealed = [];

    const isHuman = resolvedHumanIdx >= 0 && i === resolvedHumanIdx;
    const aiType = isHuman ? null : (aiSelections[i] || randomAIType());
    const baseName = `Player ${i + 1}`;
    const displayName = isHuman
      ? `${baseName} (You)`
      : `${baseName} (AI)`;

    players.push({
      index: i,
      name: baseName,
      displayName,
      isHuman,
      aiType,
      role: assignedRoles[i].name,
      roleType: assignedRoles[i].type,
      wants: assignedRoles[i].wants,
      hand,
      revealed,
      knockedOut: false,
      bluffStats: { claims: 0, bluffs: 0, truths: 0 }
    });
  }

  return {
    numPlayers,
    players,
    deck,
    currentPlayerIdx: 0,
    humanPlayerIdx: resolvedHumanIdx,
    humanPlayers: Math.max(0, humanPlayers),
    log: [],
    phase: "turnStart", // "turnStart", "awaitResponse", "awaitChallengeChoice", "gameOver"
    pendingOffer: null,
    challengeContext: null,
    turnStep: "draw",
    gameOver: false,
    turnCount: 0,
    roundNumber: 1,
    turnInRound: 1,
    nextPlayerIdx: null,
    lastFinishedPlayerIdx: null,
    finalResults: null
  };
}

function logMessage(msg, indentLevel = 1) {
  if (!gameState) return;
  const prefix = indentLevel > 0 ? "  ".repeat(indentLevel) : "";
  gameState.log.push(`${prefix}${msg}`);
}

function logRoundStart() {
  if (!gameState) return;
  logMessage(`ROUND ${gameState.roundNumber}`, 0);
}

function logTurnStart(player) {
  if (!gameState || !player) return;
  const currentTurnNumber = typeof gameState.turnInRound === "number" ? gameState.turnInRound : 1;
  logMessage(`Turn ${currentTurnNumber}: ${playerLabel(player)}`, 0);
  gameState.turnInRound = currentTurnNumber + 1;
}

function getCurrentPlayer() {
  return gameState.players[gameState.currentPlayerIdx];
}

function playerLabel(player) {
  if (!player) return "Unknown";
  return player.displayName || player.name;
}

function livingPlayers() {
  return gameState.players.filter(p => !p.knockedOut);
}

function playerRevealedThresholdMet(p) {
  if (p.knockedOut) return false;
  const revealedCount = p.revealed.filter(Boolean).length;
  return revealedCount >= 3;
}

function anyPlayerFinished() {
  return gameState.players.some(playerRevealedThresholdMet);
}

function findNextLivingPlayerIdx(startIdx) {
  if (!gameState || !gameState.players.length) return -1;
  const n = gameState.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (startIdx + step) % n;
    if (!gameState.players[idx].knockedOut) {
      return idx;
    }
  }
  return -1;
}

function knockOutPlayer(player, reason) {
  if (player.knockedOut) return;
  player.knockedOut = true;
  logMessage(`${playerLabel(player)} is knocked out (${reason}).`);
  const returnedCards = player.hand.slice();
  if (returnedCards.length) {
    gameState.deck = shuffle(gameState.deck.concat(returnedCards));
    logMessage(`${playerLabel(player)}'s cards return to the draw deck and the deck is reshuffled.`);
  }
  player.hand = [];
  player.revealed = [];
}

function chooseUnrevealedIndex(player) {
  const options = [];
  player.hand.forEach((card, idx) => {
    if (!player.revealed[idx]) options.push(idx);
  });
  if (!options.length) return -1;
  return options[0]; // simple: choose first; UI can override for human
}
