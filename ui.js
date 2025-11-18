// js/ui.js
// DOM rendering & UI helpers

const ROLE_GOAL_TEXT = {
  Noble: "Score 1 point per 🟡 Gold you finish with.",
  Knight: "Score 1 point per 🛡️ Shield you finish with.",
  Witch: "Score 1 point per 🧪 Potion you finish with.",
  Assassin: "Score 1 point per 🗡️ Dagger plus a +1 bonus if anyone else is knocked out."
};

function getRoleGoalText(role) {
  return ROLE_GOAL_TEXT[role] ||
    "Roles: Noble (Gold), Knight (Shield), Witch (Potion), Assassin (Daggers + knockout bonus). Protect your best resources and avoid ☠️ Poison to win.";
}

let cachedRulesHtml = null;
let rulesLoadPromise = null;

function renderGame() {
  debugLog("renderGame:start", "render triggered", getDebugSnapshot());
  if (!gameState) {
    document.getElementById("current-player-label").textContent = "–";
    document.getElementById("phase-label").textContent = "–";
    document.getElementById("players-container").innerHTML = "";
    const pileDiv = document.getElementById("draw-pile");
    if (pileDiv) pileDiv.innerHTML = "";
    renderPlayerInfoPanel();
    renderControls();
    return;
  }

  const players = gameState.players;
  const current = getCurrentPlayer();

  // Status
  document.getElementById("current-player-label").textContent =
    current ? playerLabel(current) : "–";
  document.getElementById("phase-label").textContent = gameState.phase;

  renderPlayerInfoPanel();

  // Players
  const container = document.getElementById("players-container");
  container.innerHTML = "";

  players.forEach(p => {
    const cardDiv = document.createElement("div");
    let cls = "player-card";
    if (p.index === gameState.currentPlayerIdx && !gameState.gameOver) cls += " active";
    if (p.knockedOut) cls += " knocked";
    if (p.isHuman) cls += " human";
    cardDiv.className = cls;

    const header = document.createElement("div");
    header.className = "player-header";

    const titleRow = document.createElement("div");
    titleRow.className = "player-title-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    nameSpan.textContent = playerLabel(p);
    const roleSpan = document.createElement("span");
    roleSpan.className = "role";
    const showRole = p.isHuman || p.knockedOut || gameState.gameOver;
    if (!showRole) roleSpan.classList.add("hidden-role");
    roleSpan.textContent = showRole
      ? (roleIcon(p.role) ? roleIcon(p.role) + " " : "") + p.role
      : "Hidden role";
    titleRow.appendChild(nameSpan);
    titleRow.appendChild(roleSpan);
    header.appendChild(titleRow);

    const aiTag = document.createElement("span");
    aiTag.className = "ai-tag";
    aiTag.textContent = p.isHuman ? "Human" : p.aiType ? `${p.aiType} AI` : "AI";
    header.appendChild(aiTag);
    cardDiv.appendChild(header);

    const cardsList = document.createElement("div");
    cardsList.className = "card-list";
    p.hand.forEach((card, idx) => {
      const cDiv = document.createElement("div");
      const actuallyRevealed = p.revealed[idx] || gameState.gameOver;
      const privateView = p.isHuman && !gameState.gameOver && !p.revealed[idx];
      cDiv.className = "card";
      if (actuallyRevealed) {
        cDiv.classList.add("revealed");
        const typeClass = cardClass(card.type);
        if (typeClass) cDiv.classList.add(typeClass);
      } else if (privateView) {
        cDiv.classList.add("in-hand");
        const typeClass = cardClass(card.type);
        if (typeClass) cDiv.classList.add(typeClass);
      }

      const left = document.createElement("span");
      const right = document.createElement("span");

      const pendingLock = Boolean(
        gameState.challengeContext && gameState.challengeContext.card === card
      );

      if (actuallyRevealed) {
        left.textContent = cardText(card);
        right.textContent = pendingLock ? "Resolving challenge" : "👁️ Revealed";
        if (pendingLock) cDiv.classList.add("pending-lock");
      } else if (privateView) {
        left.textContent = cardText(card);
        right.innerHTML = "<em>In hand</em>";
      } else {
        left.textContent = "Hidden";
        right.innerHTML = "<em>In hand</em>";
        cDiv.classList.add("hidden");
      }
      cDiv.appendChild(left);
      cDiv.appendChild(right);
      cardsList.appendChild(cDiv);
    });

    cardDiv.appendChild(cardsList);
    container.appendChild(cardDiv);
  });

  // Draw pile
  const pileDiv = document.getElementById("draw-pile");
  if (pileDiv) {
    pileDiv.innerHTML = "";
    const count = document.createElement("div");
    count.textContent = `Cards remaining: ${gameState.deck.length}`;
    pileDiv.appendChild(count);
  }

  // Log
  const logEl = document.getElementById("log-entry");
  const logContainer = document.getElementById("log");
  const nearBottom =
    logContainer.scrollHeight - logContainer.scrollTop - logContainer.clientHeight < 40;

  if (logEl) {
    logEl.innerHTML = "";
    const fragment = document.createDocumentFragment();
    gameState.log.forEach(entry => {
      const lineEl = document.createElement("div");
      lineEl.className = "log-line";
      const indentMatch = entry.match(/^( +)/);
      const indentSpaces = indentMatch ? indentMatch[1].length : 0;
      const actualIndentLevel = Math.floor(indentSpaces / 2);
      const classIndentLevel = Math.min(5, actualIndentLevel);
      lineEl.classList.add(`indent-${classIndentLevel}`);
      const trimmedEntry = actualIndentLevel > 0 ? entry.slice(actualIndentLevel * 2) : entry;
      lineEl.textContent = trimmedEntry;
      fragment.appendChild(lineEl);
    });
    logEl.appendChild(fragment);
  }

  if (nearBottom) {
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  renderControls();
  debugLog("renderGame:end", "render complete", getDebugSnapshot());
  if (typeof scheduleAutoActionCheck === "function") {
    scheduleAutoActionCheck();
  }
}

function renderPlayerInfoPanel() {
  const infoBlock = document.getElementById("player-info-block");
  if (!infoBlock) return;

  if (!gameState) {
    infoBlock.innerHTML = "<p class='muted'>Choose a seat and start a new game to learn your role.</p>";
    return;
  }

  const humanIdx = gameState.humanPlayerIdx;
  const you = humanIdx >= 0 ? gameState.players[humanIdx] : null;
  if (!you) {
    infoBlock.innerHTML = "<p class='muted'>Spectating this match. Use the log to follow every play.</p>";
    return;
  }

  const roleLabel = (roleIcon(you.role) ? roleIcon(you.role) + " " : "") + you.role;
  const handCount = you.hand.length;
  const unrevealed = you.hand.filter((_, idx) => !you.revealed[idx]).length;
  const revealed = handCount - unrevealed;

  infoBlock.innerHTML = `
    <p>You are <strong>${playerLabel(you)}</strong>, playing as the ${roleLabel}.</p>
    <p class="role-badge">${roleLabel}</p>
    <p class="score-tip">${getRoleGoalText(you.role)}</p>
    <p class="score-tip">Hand: ${handCount} cards (${unrevealed} hidden, ${revealed} revealed). Revealing ☠️ Poison at any time knocks you out.</p>
  `;
}

function renderControls() {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";
  controls.classList.remove("stacked");

  debugLog("renderControls", "start", getDebugSnapshot());

  if (!gameState || gameState.gameOver) {
    const info = document.createElement("div");
    info.className = "info";
    if (!gameState) {
      info.textContent = "No game yet.";
    } else {
      info.textContent = "Game is over. Start a new game to play again.";
    }
    controls.appendChild(info);

    if (gameState && gameState.gameOver && Array.isArray(gameState.finalResults)) {
      const showResultsBtn = document.createElement("button");
      showResultsBtn.textContent = "Show Results";
      showResultsBtn.className = "primary";
      showResultsBtn.onclick = () => showGameOverOverlay(gameState.finalResults);
      controls.appendChild(showResultsBtn);
    }
    debugLog("renderControls", "no active game", { gameOver: Boolean(gameState && gameState.gameOver) });
    return;
  }

  const actorInfo = typeof getPhaseActorInfo === "function" ? getPhaseActorInfo() : null;
  const phase = gameState.phase;
  const turnStep = gameState.turnStep || "draw";

  if (phase === "awaitAdvance") {
    const upcoming = typeof gameState.nextPlayerIdx === "number"
      ? gameState.players[gameState.nextPlayerIdx]
      : null;
    const justFinished = typeof gameState.lastFinishedPlayerIdx === "number"
      ? gameState.players[gameState.lastFinishedPlayerIdx]
      : null;
    const info = document.createElement("div");
    info.className = "info";
    const summaryParts = [];
    if (justFinished) {
      summaryParts.push(`<strong>${playerLabel(justFinished)}</strong>'s turn is complete.`);
    } else {
      summaryParts.push("Turn complete.");
    }
    if (upcoming) {
      summaryParts.push(`Next up: <strong>${playerLabel(upcoming)}</strong>.`);
    }
    info.innerHTML = summaryParts.join(" ");
    controls.appendChild(info);

    const btn = document.createElement("button");
    btn.textContent = "Advance Turn";
    btn.className = "primary";
    btn.onclick = resumeNextTurn;
    controls.appendChild(btn);
    debugLog("renderControls", "awaitAdvance controls", getDebugSnapshot());
    return;
  }

  if (!actorInfo) {
    const info = document.createElement("div");
    info.className = "info";
    info.textContent = "Waiting...";
    controls.appendChild(info);
    debugLog("renderControls", "no actor info", getDebugSnapshot());
    return;
  }

  const actor = actorInfo.player;

  if (phase === "turnStart") {
    if (!actor.isHuman) {
      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `Waiting for <strong>${playerLabel(actor)}</strong> to take their turn.`;
      controls.appendChild(info);
      return;
    }

    if (turnStep === "draw") {
      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `Step 1: <strong>${playerLabel(actor)}</strong> draws a card.`;
      controls.appendChild(info);

      const drawBtn = document.createElement("button");
      drawBtn.textContent = gameState.deck.length ? "Draw Card" : "Deck Empty";
      drawBtn.className = "primary";
      drawBtn.disabled = gameState.deck.length === 0;
      drawBtn.onclick = () => drawCardForCurrentPlayer();
      controls.appendChild(drawBtn);
      debugLog("renderControls", "turnStart draw step", getDebugSnapshot());
      return;
    }

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `Step 2: <strong>${playerLabel(actor)}</strong> must make an offer.`;
    controls.appendChild(info);

    const offerBtn = document.createElement("button");
    offerBtn.textContent = "Make Offer";
    offerBtn.className = "primary";
    offerBtn.onclick = showOfferUI;
    controls.appendChild(offerBtn);
    debugLog("renderControls", "turnStart offer step", getDebugSnapshot());
    return;
  }

  if (phase === "awaitResponse" && gameState.pendingOffer && !gameState.challengeContext) {
    const offer = gameState.pendingOffer;
    const from = gameState.players[offer.fromIndex];
    const to = gameState.players[offer.toIndex];

    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML =
      `${playerLabel(from)} offers a card to <strong>${playerLabel(to)}</strong>, declaring it is ` +
      `<strong>${resourceIcon(offer.claimType)} ${offer.claimType}</strong>. ` +
      `${playerLabel(to)} must accept or challenge.`;
    controls.appendChild(info);

    if (!to.isHuman) {
      const waiting = document.createElement("div");
      waiting.className = "info";
      waiting.textContent = `Waiting for ${playerLabel(to)}...`;
      controls.appendChild(waiting);
      return;
    }

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = `As ${playerLabel(to)}, accept trade`;
    acceptBtn.className = "primary";
    acceptBtn.onclick = showAcceptUI;
    controls.appendChild(acceptBtn);

    const challengeBtn = document.createElement("button");
    challengeBtn.textContent = `As ${playerLabel(to)}, challenge`;
    challengeBtn.className = "danger";
    challengeBtn.onclick = () => resolveChallenge();
    controls.appendChild(challengeBtn);
    debugLog("renderControls", "awaitResponse controls", getDebugSnapshot());
    return;
  }

  if (phase === "awaitChallengeChoice" && gameState.challengeContext) {
    const ctx = gameState.challengeContext;
    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = ctx.text;
    controls.appendChild(info);

    const actorPlayer = gameState.players[ctx.actorIndex];
    if (!actorPlayer.isHuman) {
      const waiting = document.createElement("div");
      waiting.className = "info";
      waiting.textContent = `Waiting for ${playerLabel(actorPlayer)}...`;
      controls.appendChild(waiting);
      return;
    }

    ctx.options.forEach(opt => {
      const btn = document.createElement("button");
      if (opt.primary) btn.classList.add("primary");
      if (opt.danger) btn.classList.add("danger");
      btn.textContent = opt.label;
      btn.onclick = () => ctx.handler(opt.id);
      controls.appendChild(btn);
    });
    debugLog("renderControls", "awaitChallengeChoice controls", getDebugSnapshot());
  }
}

function showOfferUI() {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";
  controls.classList.remove("stacked");
  const p = getCurrentPlayer();

  const info = document.createElement("div");
  info.className = "info";
  info.innerHTML = `Choose a card from ${playerLabel(p)}'s hand, what you declare it is, and a target player.`;
  controls.appendChild(info);

  const unrevealed = p.hand.map((card, idx) => ({ card, idx })).filter(c => !p.revealed[c.idx]);
  if (!unrevealed.length) {
    info.textContent = `${playerLabel(p)} has no unrevealed cards. Turn ends.`;
    return;
  }

  const offerLabel = document.createElement("label");
  offerLabel.textContent = "Card to offer:";
  const offerSelect = document.createElement("select");
  offerSelect.id = "offer-card-select";
  unrevealed.forEach(c => {
    const opt = document.createElement("option");
    opt.value = String(c.idx);
    opt.textContent = cardText(c.card);
    offerSelect.appendChild(opt);
  });
  offerLabel.appendChild(offerSelect);
  controls.appendChild(offerLabel);

  const claimLabel = document.createElement("label");
  claimLabel.textContent = "Declare this card is:";
  const claimSelect = document.createElement("select");
  claimSelect.id = "offer-claim-select";
  RESOURCE_TYPES.forEach(type => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = `${resourceIcon(type)} ${type}`;
    claimSelect.appendChild(opt);
  });
  claimLabel.appendChild(claimSelect);
  controls.appendChild(claimLabel);

  const targetLabel = document.createElement("label");
  targetLabel.textContent = "Target player:";
  const targetSelect = document.createElement("select");
  targetSelect.id = "offer-target-select";
  gameState.players.forEach(pl => {
    if (pl.knockedOut) return;
    if (pl.index === p.index) return;
    const opt = document.createElement("option");
    opt.value = String(pl.index);
    opt.textContent = playerLabel(pl);
    targetSelect.appendChild(opt);
  });
  targetLabel.appendChild(targetSelect);
  controls.appendChild(targetLabel);

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Confirm Offer";
  confirmBtn.className = "primary";
  confirmBtn.onclick = () => {
    const cardIdx = parseInt(offerSelect.value, 10);
    const claimType = claimSelect.value;
    const targetIdx = parseInt(targetSelect.value, 10);
    makeOffer(p.index, targetIdx, cardIdx, claimType);
  };
  controls.appendChild(confirmBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = renderGame;
  controls.appendChild(cancelBtn);
}

function showAcceptUI() {
  const controls = document.getElementById("controls");
  controls.innerHTML = "";
  controls.classList.remove("stacked");

  const offer = gameState.pendingOffer;
  if (!offer) {
    renderGame();
    return;
  }

  const to = gameState.players[offer.toIndex];
  const giveOptions = getTradeReturnOptions(to);
  let selectedGiveIdx = giveOptions.length ? giveOptions[0].idx : null;
  const info = document.createElement("div");
  info.className = "info";
  const hasChoice = giveOptions.length > 1;

  if (!giveOptions.length) {
    info.textContent = `${playerLabel(to)} has no cards and will take the offered card.`;
  } else if (hasChoice) {
    info.textContent = `${playerLabel(to)} can choose which card to return.`;
    controls.classList.add("stacked");
  } else {
    const onlyOption = giveOptions[0];
    const detail = onlyOption.revealed ? "their revealed card" : "a card from their hand";
    info.textContent = `${playerLabel(to)} will trade ${detail}: ${cardText(onlyOption.card)}.`;
  }
  controls.appendChild(info);

  if (hasChoice) {
    const selectLabel = document.createElement("label");
    selectLabel.textContent = "Choose a card to give back:";
    controls.appendChild(selectLabel);

    const select = document.createElement("select");
    giveOptions.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = String(opt.idx);
      const suffix = opt.revealed ? " (revealed)" : " (in hand)";
      optionEl.textContent = `${cardText(opt.card)}${suffix}`;
      select.appendChild(optionEl);
    });
    select.value = String(selectedGiveIdx);
    select.onchange = () => {
      const parsed = parseInt(select.value, 10);
      selectedGiveIdx = Number.isNaN(parsed) ? selectedGiveIdx : parsed;
    };
    controls.appendChild(select);
  }

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Confirm Accept";
  confirmBtn.className = "primary";
  confirmBtn.onclick = () => resolveTrade(selectedGiveIdx);
  controls.appendChild(confirmBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = renderGame;
  controls.appendChild(cancelBtn);
}

// Overlays

function showRulesOverlay() {
  const overlay = document.getElementById("rules-overlay");
  const body = document.getElementById("rules-body");
  const inlineContent = document.getElementById("rules-inline-content");
  const frame = document.getElementById("rules-frame");
  if (!overlay || !body) return;
  overlay.classList.remove("hidden");
  body.classList.remove("iframe-mode");
  if (inlineContent) {
    inlineContent.innerHTML = "<p class='muted'>Loading rules…</p>";
    inlineContent.classList.remove("is-hidden");
  }
  if (frame) {
    frame.classList.add("is-hidden");
    frame.removeAttribute("src");
  }
  loadRulesHtml()
    .then(html => {
      if (inlineContent) {
        inlineContent.innerHTML = html;
        inlineContent.classList.remove("is-hidden");
      }
      if (frame) {
        frame.classList.add("is-hidden");
      }
      body.classList.remove("iframe-mode");
    })
    .catch(err => {
      console.warn("Failed to fetch rules.html", err);
      if (frame) {
        if (inlineContent) {
          inlineContent.classList.add("is-hidden");
        }
        body.classList.add("iframe-mode");
        if (!frame.getAttribute("src")) {
          const cacheBust = Date.now().toString(36);
          frame.setAttribute("src", `rules.html?view=${cacheBust}`);
        }
        frame.classList.remove("is-hidden");
      } else if (inlineContent) {
        inlineContent.innerHTML = `<p class='error'>Failed to load rules: ${err.message}</p>`;
        inlineContent.classList.remove("is-hidden");
      }
    });
}

function showChangelogOverlay() {
  const overlay = document.getElementById("changelog-overlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

function hideChangelogOverlay() {
  const overlay = document.getElementById("changelog-overlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function loadRulesHtml() {
  if (cachedRulesHtml) {
    return Promise.resolve(cachedRulesHtml);
  }
  if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
    return Promise.reject(new Error("Rules file cannot be fetched from file://"));
  }
  if (!rulesLoadPromise) {
    rulesLoadPromise = fetch("rules.html")
      .then(resp => {
        if (!resp.ok) {
          throw new Error("Rules file missing");
        }
        return resp.text();
      })
      .then(html => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const content = doc.querySelector("[data-rules-content]") || doc.body;
          cachedRulesHtml = content ? content.innerHTML : html;
        } catch (err) {
          cachedRulesHtml = html;
        }
        return cachedRulesHtml;
      });
  }
  return rulesLoadPromise;
}

function hideRulesOverlay() {
  document.getElementById("rules-overlay").classList.add("hidden");
}

function showGameOverOverlay(results) {
  const overlay = document.getElementById("gameover-overlay");
  const content = document.getElementById("gameover-content");

  const turns = gameState.turnCount;
  const rounds = Math.ceil(turns / gameState.numPlayers);
  const winners = results.filter(r => r.result === "WIN");

  if (content && !content.classList.contains("gameover-content")) {
    content.classList.add("gameover-content");
  }

  let html = `
    <div class="gameover-header">
      <h2>Game Over</h2>
      <div class="gameover-meta">
        <div class="meta-item">
          <span class="meta-label">Rounds</span>
          <span>${rounds} (turns: ${turns})</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Result</span>
          <span>${winners.length > 1
            ? `Tie: ${winners.map(w => playerLabel(w.player)).join(", ")}`
            : winners.length === 1
              ? `${playerLabel(winners[0].player)} wins`
              : "Game complete"}</span>
        </div>
      </div>
    </div>
    <div class="gameover-players">
      <h3>Players</h3>
      <div class="gameover-table-wrapper">
        <table class="gameover-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Role</th>
              <th>Result</th>
              <th>Score</th>
              <th>Resources</th>
            </tr>
          </thead>
          <tbody>
  `;

  results.forEach(r => {
    const p = r.player;
    let resultLabel = "";
    if (r.result === "WIN") {
      resultLabel = "<span class=\"result-pill win\">🏆 WIN</span>";
    } else if (r.result.startsWith("LOSE")) {
      resultLabel = "<span class=\"result-pill lose\">LOSE</span>";
    } else {
      resultLabel = `<span class=\"result-pill neutral\">${r.result}</span>`;
    }

    const resTexts = p.hand.map(cardText);
    const aiTag = p.isHuman ? "Human" : `${p.aiType || "AI"} AI`;
    const roleLabel = `${roleIcon(p.role) ? roleIcon(p.role) + " " : ""}${p.role}`;

    html += `
      <tr>
        <td>
          <div class="gameover-player-cell">
            <span class="gameover-player-name">${playerLabel(p)}</span>
            <span class="player-pill">${aiTag}</span>
          </div>
        </td>
        <td><span class="gameover-role">${roleLabel}</span></td>
        <td><span class="gameover-result">${resultLabel}</span></td>
        <td><span class="score-pill">Score ${r.score}</span></td>
        <td><span class="resource-list">${resTexts.length ? resTexts.join(", ") : "None"}</span></td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
    <div class="overlay-actions">
      <button id="close-gameover-btn">Close</button>
    </div>
  `;

  content.innerHTML = html;
  overlay.classList.remove("hidden");

  document.getElementById("close-gameover-btn").onclick = () => {
    overlay.classList.add("hidden");
  };
}
