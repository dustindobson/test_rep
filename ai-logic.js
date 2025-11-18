(function(){
  // AI decision: choose whether to keep or offer (refactored)
  // This file replaces/updates the aiChooseTurnAction entrypoint so that
  // AI heuristics cannot legally return "keep" when the player has
  // any unrevealed cards. It preserves existing heuristic hooks.

  function aiChooseTurnAction(player, behavior) {
    // Basic sanity checks
    if (!player || !player.hand || !player.hand.length) {
      return { action: "keep", reason: "noCards" }; 
    }

    const unrevealed = player.hand
      .map((card, idx) => ({ card, idx, value: resourceValueForPlayer(player, card.type), revealed: player.revealed[idx] }))
      .filter(entry => !entry.revealed);

    // If there are no unrevealed cards, the AI must keep (nothing to offer).
    if (!unrevealed.length) {
      return { action: "keep", reason: "noOfferable" }; 
    }

    // Preserve earlier heuristic computations where possible.
    const highest = unrevealed.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), unrevealed[0]);
    const lowest = unrevealed.reduce((acc, cur) => (cur.value < acc.value ? cur : acc), unrevealed[0]);

    let swapProb = typeof behavior.swapChance === "number" ? behavior.swapChance : 0.5;
    const takeThreshold = typeof behavior.takeThreshold === "number" ? behavior.takeThreshold : Infinity;

    // Determine if the AI heuristics prefer to keep. This is a *preference*, not
    // a rules-based permission to skip offering. We'll convert any "keep"
    // preference into an offer if there are unrevealed cards.
    let preferKeep = false;
    if (typeof behavior.keepThreshold === "number") {
      // If even the weakest unrevealed card is high-value, prefer to keep
      preferKeep = lowest.value >= behavior.keepThreshold;
    }

    // Other behavior flags can influence preference (preserve old behavior hooks)
    if (behavior && behavior.cautious) {
      // Cautious AIs may prefer to keep higher-value hands
      preferKeep = preferKeep || lowest.value >= (behavior.cautiousThreshold || 2);
    }

    // Default decision based on heuristics
    let decision = preferKeep ? { action: "keep", reason: "heuristic_preferKeep" } : { action: "offer", reason: "heuristic_offer" };

    // Defensive rule: If decision says keep but there are unrevealed cards,
    // convert to an offer and mark it forced by rules. This prevents AIs from
    // bypassing the mandatory Offer step.
    if (decision.action === "keep" && unrevealed.length) {
      decision = { action: "offer", reason: "forcedByRules_keep_not_allowed_with_unrevealed" };
      debugLog("ai", "aiChooseTurnAction_forcedOffer", { player: playerLabel(player), originalReason: "heuristic_preferKeep" });
    }

    return decision;
  }

  // Export to global scope for existing callers
  window.aiChooseTurnAction = aiChooseTurnAction;
})();