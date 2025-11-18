# Changelog

## v0.07 — 2025-11-18
- Fix: Enforce Offer step after Draw for all players (including AI). AI can no longer skip the Offer step when they have unrevealed cards; defensive guards and AI logic changes ensure game rules are followed.
- Improvement: Refactored AI decision entrypoint to prevent "keep" decisions when an Offer is legally possible. This centralizes rule enforcement and reduces future regressions.
- Logging: Added debug logging for cases where AI heuristics would have skipped an Offer so behavior can be analyzed and tuned.
- Tests: Added lightweight regression checks to ensure Draw -> Offer is enforced when appropriate (unit/integration tests to be included in follow-up if desired).
- Minor: Updated changelog entries to reflect prior AI work and the current fix.

## v0.06 — AI improvements and behavior tuning
- Extracted AI decision logic into a dedicated module (js/ai-logic.js) to centralize heuristics and make behavior profiles easier to tune.
- Implemented AI turn logic:
  - AI draws automatically at the start of its turn and then proceeds to the Offer step.
  - AI evaluates unrevealed cards and chooses whether to offer, what to offer, which player to target, and what claim to make.
  - AI can also decide to "keep" (end the turn early) when no valid unrevealed offers exist.
- Added AI response logic:
  - AI can Accept or Challenge offers using probabilistic heuristics, bluff history, and behavior flags.
  - AI chooses trade-back cards when accepting or when forced to give cards after challenges.
- Introduced per-AI behavior profiles and parameters (bluffChance, swapChance, takeThreshold, chaotic, etc.) to vary play styles.
- Bluff tracking:
  - AI records bluff outcomes (claims vs actual) and uses that history to inform future challenge probabilities.
- UI/UX integration and logging:
  - UI shows waiting messages for AI responses.
  - Added debug logging and debug snapshots to help diagnose AI decisions and turn flow.
- Known / future work:
  - Validate and harden the Offer enforcement so AIs always perform an Offer step when rules allow (now addressed in v0.07).