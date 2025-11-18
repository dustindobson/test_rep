(function(){
// NOTE: This is a partial file replacement containing the primary functions
// touched by the ai-enforce-offer change. Other functions remain unchanged.

// --- Existing helper functions (assumed to exist elsewhere in file) ---
// playerLabel, debugLog, getAIBehavior, aiChooseOffer, makeOffer, finishTurn,
// drawCardForCurrentPlayer, logMessage, getCurrentPlayer, renderGame

// --- AI turn flow (modified aiTakeTurn) ---
function aiTakeTurn(player) {
  if (!gameState || gameState.phase !== "turnStart") return;
  const behavior = getAIBehavior(player);
  const turnStep = gameState.turnStep || "draw";

  if (turnStep === "draw") {
    drawCardForCurrentPlayer({ auto: true, skipRender: true });
  }

  // Only proceed to offer logic if we're actually at the offer step.
  if (gameState.turnStep !== "offer") return;

  const turnAction = aiChooseTurnAction(player, behavior);

  // Defensive rule enforcement:
  // Offer is mandatory when the player has any unrevealed cards.
  const hasUnrevealed =
    player &&
    Array.isArray(player.hand) &&
    player.hand.some((_, idx) => !player.revealed[idx]);

  if (turnAction && turnAction.action === "keep" && hasUnrevealed) {
    // Log for debugging so we can see when heuristics try to skip the offer.
    debugLog("ai", "overrideKeep", {
      player: playerLabel(player),
      reason: "hasUnrevealed_cards_must_offer",
      aiDecision: turnAction
    });

    // Attempt to force an offer decision from the AI offer chooser.
    const forcedOffer = aiChooseOffer(player, behavior);
    if (!forcedOffer) {
      // If there's somehow no valid offer (shouldn't happen), fallback to keep.
      logMessage(`${playerLabel(player)} keeps their cards this turn.`);
      gameState.phase = "endTurn";
      finishTurn();
      return;
    }
    makeOffer(player.index, forcedOffer.targetIndex, forcedOffer.cardIdx, forcedOffer.claimType);
    return;
  }

  // If AI legitimately chooses to keep (no cards or no offerable cards), end turn.
  if (turnAction && turnAction.action === "keep") {
    logMessage(`${playerLabel(player)} keeps their cards this turn.`);
    gameState.phase = "endTurn";
    finishTurn();
    return;
  }

  // Normal offer flow
  const offer = aiChooseOffer(player, behavior);
  if (!offer) {
    logMessage(`${playerLabel(player)} has no valid cards to offer and ends their turn.`);
    gameState.phase = "endTurn";
    finishTurn();
    return;
  }

  makeOffer(player.index, offer.targetIndex, offer.cardIdx, offer.claimType);
}

// Expose for existing code
window.aiTakeTurn = aiTakeTurn;
})();
