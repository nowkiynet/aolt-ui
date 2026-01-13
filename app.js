(() => {
  // =========================
  // 1) Constants (match Java)
  // =========================
  const WINDOW_W = 252, WINDOW_H = 140;
  const INSIDE_X = 9, INSIDE_Y = 18;
  const INSIDE_W = 234, INSIDE_H = 113;
  const TITLE_X = 8, TITLE_Y = 6;

  // Detail panels (match Java)
  const PANEL_COLS = 9;
  const SLOT_SIZE = 18;
  const PANEL_HEADER_H = 12;
  const PANEL_PADDING = 4;
  const PANEL_SPACING = 8;

  // Overview widgets (match Java grid spacing)
  const GRID_COLS = 5;
  const WIDGET_W = 26; // icon size
  const WIDGET_STEP_X = 28;
  const WIDGET_STEP_Y = 27;

  // Hold-to-select (optional)
  const HOLD_MS = 1500;

  // Tab distribution like your ChallengeTabType
  const TAB_TYPES = [
    { name: "ABOVE", width: 28, height: 32, max: 8, getX: i => (28 + 4) * i, getY: _ => -32 + 4 },
    { name: "BELOW", width: 28, height: 32, max: 8, getX: i => (28 + 4) * i, getY: _ => 136 },
    { name: "LEFT",  width: 32, height: 28, max: 5, getX: _ => -32 + 4,    getY: i => 28 * i },
    { name: "RIGHT", width: 32, height: 28, max: 5, getX: _ => 248,        getY: i => 28 * i },
  ];

  // =========================
  // 2) Canvas setup
  // =========================
  const canvas = document.getElementById("ui");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = "top";

  function applyScale() {
    const maxW = Math.min(window.innerWidth - 40, 1100);
    const maxH = window.innerHeight - 120;
    const s = Math.max(2, Math.min(6, Math.floor(maxW / WINDOW_W), Math.floor(maxH / WINDOW_H)));
    canvas.style.width = (WINDOW_W * s) + "px";
    canvas.style.height = (WINDOW_H * s) + "px";
  }
  applyScale();
  window.addEventListener("resize", applyScale);

  // =========================
  // 3) Asset loading
  // =========================
  const ASSETS = {
    window: "./assets/ui/window.png",
    slot: "./assets/ui/slot.png",
    confirm: "./assets/ui/confirm.png",
    bgDefault: "./assets/bg/deepslate_tiles.png",
    // optional: tab sprites if you have them
    // tab_above_left: ...
  };

  const imgs = new Map();
  function loadImage(url) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
  }
  async function loadAssets() {
    for (const [k, url] of Object.entries(ASSETS)) {
      imgs.set(k, await loadImage(url));
    }
  }

  // =========================
  // 4) Data models
  // =========================
  // definitions.json: all challenges + categories + items
  // state.json: activeId, completed[], counters, collected per item
  let defs = null;
  let state = null;

  // runtime ui state (mirrors ChallengeScreen + ChallengeTab)
  const ui = {
    tabs: [],          // computed tabs with assigned tab types/index
    selectedTab: null,
    detailChallengeId: null,
    detailScrollY: 0,
    isDragging: false,
    dragLast: null,
    hover: { type: null, payload: null }, // tooltip target
    overview: {
      scrollX: 0, scrollY: 0,
      centered: false,
      minX: 999999, minY: 999999, maxX: -999999, maxY: -999999,
      fade: 0,
      holding: null, // {challengeId,startMs}
    }
  };

  // =========================
  // 5) Helpers: formatting & progress
  // =========================
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function fmtCategoryTitle(cat) {
    switch (cat) {
      case "ARCHAEOLOGY": return "Archaeology Category";
      case "INTERACTION": return "Interaction Category";
      case "GENERATED_LOOT": return "Generated Structure Loot Category";
      case "MONSTER": return "Monster Hunt Category";
      case "FISHING": return "Fishing Category";
      case "GIFTS": return "Gift Category";
      case "PIGLIN_BARTERING": return "Piglin Bartering Category";
      default: return cat;
    }
  }

  function fmtLootTable(path) {
    // du hast in Java eine riesige Switch-Liste; im Web kannst du später 1:1 übernehmen.
    // fürs MVP reicht: nice path formatting
    return path.replaceAll("_", " ").replaceAll("/", " / ");
  }

  function getChallengeById(id) {
    return defs?.challenges?.find(c => c.id === id) || null;
  }

  function isChallengeCompleted(id) {
    return (state?.completed || []).includes(id);
  }

  function getAttemptsFor(id) {
    const c = (state?.counters || []).find(x => x.challengeId === id);
    return c ? c.attempts : 0;
  }

  function getActiveId() {
    return state?.activeId || null;
  }

  function getCollectedFor(challengeId, itemKeyStr) {
    // state.progress[challengeId][itemKey] = collected
    const p = state?.progress?.[challengeId];
    return p ? (p[itemKeyStr] ?? 0) : 0;
  }

  function completionRatio(ch) {
    let total = 0, done = 0;
    for (const it of ch.items) {
      total += it.required;
      const have = getCollectedFor(ch.id, it.key);
      done += Math.min(have, it.required);
    }
    return total <= 0 ? 0 : (done / total);
  }

  // =========================
  // 6) Tabs: assign tab types like Java create(...)
  // =========================
  function buildTabsFromDefinitions() {
    const cats = defs.categories || []; // order matters
    const tabs = [];
    let flat = 0;

    for (const cat of cats) {
      const challenges = defs.challenges.filter(c => c.category === cat);
      if (!challenges.length) continue;

      // assign a tabType based on flat index
      let idx = flat;
      let chosen = null;
      for (const t of TAB_TYPES) {
        if (idx < t.max) { chosen = { type: t, index: idx }; break; }
        idx -= t.max;
      }
      if (!chosen) continue;

      tabs.push({
        category: cat,
        title: fmtCategoryTitle(cat),
        type: chosen.type,
        index: chosen.index,
        challenges
      });

      if (!ui.selectedTab) ui.selectedTab = tabs[tabs.length - 1];
      flat++;
    }

    ui.tabs = tabs;
    ui.overview.centered = false;
    ui.overview.scrollX = 0;
    ui.overview.scrollY = 0;
  }

  // =========================
  // 7) Rendering primitives
  // =========================
  function drawTiledBackground(img, x0, y0, w, h, offsetX, offsetY) {
    // tile 16x16 like Minecraft
    const tile = 16;
    const ox = ((offsetX % tile) + tile) % tile;
    const oy = ((offsetY % tile) + tile) % tile;

    for (let y = -1; y <= Math.ceil(h / tile) + 1; y++) {
      for (let x = -1; x <= Math.ceil(w / tile) + 1; x++) {
        ctx.drawImage(img, x0 + ox + x * tile, y0 + oy + y * tile, tile, tile);
      }
    }
  }

  function scissor(x, y, w, h, fn) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    fn();
    ctx.restore();
  }

  // =========================
  // 8) Overview (ChallengeTab + ChallengeWidget)
  // =========================
  function computeWidgetBounds(challenges) {
    // match your addWidget min/max logic
    ui.overview.minX = 999999; ui.overview.minY = 999999;
    ui.overview.maxX = -999999; ui.overview.maxY = -999999;

    challenges.forEach((ch, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * WIDGET_STEP_X;
      const y = row * WIDGET_STEP_Y;
      ui.overview.minX = Math.min(ui.overview.minX, x);
      ui.overview.minY = Math.min(ui.overview.minY, y);
      ui.overview.maxX = Math.max(ui.overview.maxX, x + 28);
      ui.overview.maxY = Math.max(ui.overview.maxY, y + 27);
    });
  }

  function ensureOverviewCentered() {
    if (ui.overview.centered) return;
    const chs = ui.selectedTab?.challenges || [];
    computeWidgetBounds(chs);

    // Java: scrollX = 117 - ((maxX+minX)/2), scrollY = 56 - ((maxY+minY)/2)
    ui.overview.scrollX = 117 - ((ui.overview.maxX + ui.overview.minX) / 2);
    ui.overview.scrollY = 56  - ((ui.overview.maxY + ui.overview.minY) / 2);
    ui.overview.centered = true;
  }

  function drawOverviewInside() {
    if (!ui.selectedTab) return;
    ensureOverviewCentered();

    const bg = imgs.get("bgDefault");
    const k = Math.floor(ui.overview.scrollX);
    const l = Math.floor(ui.overview.scrollY);

    // tiled background inside
    drawTiledBackground(bg, 0, 0, INSIDE_W, INSIDE_H, k, l);

    // widgets
    const challenges = ui.selectedTab.challenges;
    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * WIDGET_STEP_X;
      const y = row * WIDGET_STEP_Y;

      const ratio = completionRatio(ch);
      const active = (getActiveId() === ch.id);
      const completed = isChallengeCompleted(ch.id);

      // Frame: we fake it with rectangles if you don't have sprites
      // (du kannst hier später 1:1 frame sprites nachziehen)
      ctx.fillStyle = (completed || active) ? "#d4af37" : "#3a3a3a";
      ctx.fillRect(k + x + 3, l + y, WIDGET_W, WIDGET_W);
      ctx.fillStyle = "#111";
      ctx.fillRect(k + x + 4, l + y + 1, WIDGET_W - 2, WIDGET_W - 2);

      // Challenge icon (optional)
      // definitions.json should provide iconUrl (your iconTex equivalent)
      if (ch.iconUrl && imgs.has(ch.iconUrl)) {
        ctx.drawImage(imgs.get(ch.iconUrl), k + x + 8, l + y + 5, 16, 16);
      } else {
        // placeholder
        ctx.fillStyle = "#bbb";
        ctx.font = "10px monospace";
        ctx.fillText("?", k + x + 12, l + y + 8);
      }

      // If currently holding select, draw progress bar over icon like Java (vertical fill)
      if (ui.overview.holding?.challengeId === ch.id && !getActiveId() && !completed) {
        const prog = clamp((performance.now() - ui.overview.holding.startMs) / HOLD_MS, 0, 1);
        const filled = Math.floor(16 * prog);
        if (filled > 0) {
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.fillRect(k + x + 8, l + y + 5, 16, filled);
        }
        if (prog >= 1) {
          ui.overview.holding = null;
          // Web kann nicht selecten wie Minecraft – später ggf. per API call.
          // Fürs UI: einfach activeId setzen, wenn du willst:
          // state.activeId = ch.id;
        }
      }
    }
  }

  function hitTestWidget(localX, localY) {
    if (!ui.selectedTab) return null;
    const k = Math.floor(ui.overview.scrollX);
    const l = Math.floor(ui.overview.scrollY);
    const challenges = ui.selectedTab.challenges;

    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = k + col * WIDGET_STEP_X;
      const y = l + row * WIDGET_STEP_Y;
      const x1 = x, x2 = x + WIDGET_W;
      const y1 = y, y2 = y + WIDGET_W;
      if (localX >= x1 && localX <= x2 && localY >= y1 && localY <= y2) {
        return { challenge: ch, screenX: x, screenY: y };
      }
    }
    return null;
  }

  function drawOverviewTooltips(mouseLocalX, mouseLocalY) {
    const hit = hitTestWidget(mouseLocalX, mouseLocalY);
    const hovered = !!hit;

    // fade logic like Java
    if (hovered) ui.overview.fade = clamp(ui.overview.fade + 0.02, 0, 0.3);
    else ui.overview.fade = clamp(ui.overview.fade - 0.04, 0, 1);

    // overlay tint
    if (ui.overview.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${ui.overview.fade})`;
      ctx.fillRect(0, 0, INSIDE_W, INSIDE_H);
    }

    if (!hit) return;

    const ch = hit.challenge;

    // compute progress like your ChallengeWidget.drawHover()
    let total = 0, done = 0;
    for (const it of ch.items) {
      total += it.required;
      const have = getCollectedFor(ch.id, it.key);
      done += Math.min(have, it.required);
    }
    const ratio = total ? done / total : 0;
    const completed = isChallengeCompleted(ch.id);
    const active = (getActiveId() === ch.id);

    let progressText = null;
    if (completed) {
      progressText = `completed (Attempts: ${getAttemptsFor(ch.id)})`;
    } else if (total > 0) {
      const pct = Math.round(ratio * 100);
      progressText = `Items found: ${done}/${total} (${pct}%)`;
    }

    // Tooltip box (simple but Minecraft-ish)
    const title = ch.title;
    ctx.font = "10px monospace";
    const pad = 6;
    const w = Math.max(160, ctx.measureText(title).width + 40, progressText ? ctx.measureText(progressText).width + 12 : 0);
    const h = progressText ? 34 : 24;

    // place like vanilla: try right side, else left
    let bx = hit.screenX + 32;
    let by = hit.screenY + 4;
    if (bx + w > INSIDE_W) bx = hit.screenX - w - 6;
    if (by + h > INSIDE_H) by = INSIDE_H - h - 2;

    ctx.fillStyle = active || completed ? "#2b5fb3" : "#1c3a6b";
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(bx + 1, by + 1, w - 2, h - 2);

    ctx.fillStyle = "#fff";
    ctx.fillText(title, bx + pad, by + 6);
    if (progressText) ctx.fillText(progressText, bx + pad, by + 18);
  }

  // =========================
  // 9) Detail view (ChallengeScreen.renderDetailInside)
  // =========================
  function buildLootPanels(items) {
    // group by lootTableId like your buildLootPanels() :contentReference[oaicite:2]{index=2}
    const out = [];
    let current = [];
    let currentTable = null;

    for (const it of items) {
      const t = it.lootTableId;
      if (currentTable && currentTable !== t) {
        out.push({ tableId: currentTable, items: current.slice() });
        current = [];
      }
      current.push(it);
      currentTable = t;
    }
    if (currentTable && current.length) out.push({ tableId: currentTable, items: current.slice() });
    return out.map(p => {
      const rows = Math.ceil(p.items.length / PANEL_COLS);
      const innerH = rows * SLOT_SIZE;
      const height = PANEL_HEADER_H + PANEL_PADDING + innerH + PANEL_PADDING;
      return { ...p, rows, height };
    });
  }

  function drawDetailInside() {
    const ch = getChallengeById(ui.detailChallengeId);
    if (!ch) return;

    // background tiled
    const bg = imgs.get("bgDefault");
    drawTiledBackground(bg, 0, 0, INSIDE_W, INSIDE_H, 0, 0);

    const panels = buildLootPanels(ch.items);
    let cursorY = 4 + Math.floor(ui.detailScrollY);

    for (const p of panels) {
      const panelW = PANEL_COLS * SLOT_SIZE + PANEL_PADDING * 2;
      const panelX = Math.floor((INSIDE_W - panelW) / 2);
      const panelY = cursorY;

      // panel box
      ctx.fillStyle = "#000"; ctx.fillRect(panelX, panelY, panelW, p.height);
      ctx.fillStyle = "#404040"; ctx.fillRect(panelX + 1, panelY + 1, panelW - 2, p.height - 2);

      // header text
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(fmtLootTable(p.tableId), panelX + 5, panelY + 5);

      const slotsOX = panelX + PANEL_PADDING;
      const slotsOY = panelY + PANEL_HEADER_H + PANEL_PADDING;

      for (let i = 0; i < p.items.length; i++) {
        const it = p.items[i];
        const col = i % PANEL_COLS;
        const row = Math.floor(i / PANEL_COLS);
        const sx = slotsOX + col * SLOT_SIZE;
        const sy = slotsOY + row * SLOT_SIZE;

        // slot sprite
        ctx.drawImage(imgs.get("slot"), sx, sy, 18, 18);

        const have = isChallengeCompleted(ch.id) ? it.required : getCollectedFor(ch.id, it.key);
        const done = have >= it.required;

        // item icon (optional): if you provide it.iconUrl per item
        if (it.iconUrl && imgs.has(it.iconUrl)) {
          ctx.drawImage(imgs.get(it.iconUrl), sx + 1, sy + 1, 16, 16);
        } else {
          ctx.fillStyle = "#ddd";
          ctx.font = "12px monospace";
          ctx.fillText("?", sx + 7, sy + 3);
        }

        if (done) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(sx + 1, sy + 1, 16, 16);
          ctx.drawImage(imgs.get("confirm"), sx + 1, sy - 1, 18, 18);
        }
      }

      cursorY += p.height + PANEL_SPACING;
    }
  }

  function scrollDetail(dy) {
    const ch = getChallengeById(ui.detailChallengeId);
    if (!ch) { ui.detailScrollY = 0; return; }
    const panels = buildLootPanels(ch.items);

    let contentH = 0;
    for (let i = 0; i < panels.length; i++) {
      contentH += panels[i].height;
      if (i < panels.length - 1) contentH += PANEL_SPACING;
    }
    if (contentH <= INSIDE_H) { ui.detailScrollY = 0; return; }

    ui.detailScrollY = clamp(ui.detailScrollY + dy, -(contentH - INSIDE_H), 0);
  }

  function hitTestDetailSlot(mouseX, mouseY) {
    const ch = getChallengeById(ui.detailChallengeId);
    if (!ch) return null;

    const panels = buildLootPanels(ch.items);
    let cursorY = 4 + Math.floor(ui.detailScrollY);

    for (const p of panels) {
      const panelW = PANEL_COLS * SLOT_SIZE + PANEL_PADDING * 2;
      const panelX = Math.floor((INSIDE_W - panelW) / 2);
      const panelY = cursorY;

      const slotsOX = panelX + PANEL_PADDING;
      const slotsOY = panelY + PANEL_HEADER_H + PANEL_PADDING;

      for (let i = 0; i < p.items.length; i++) {
        const it = p.items[i];
        const col = i % PANEL_COLS;
        const row = Math.floor(i / PANEL_COLS);
        const sx = slotsOX + col * SLOT_SIZE;
        const sy = slotsOY + row * SLOT_SIZE;

        // like Java: slot hover area is 16x16
        if (mouseX >= sx && mouseX < sx + 16 && mouseY >= sy && mouseY < sy + 16) {
          return { item: it, tableId: p.tableId, sx, sy, challenge: ch };
        }
      }

      cursorY += p.height + PANEL_SPACING;
    }
    return null;
  }

  function drawDetailTooltips(mouseX, mouseY) {
    const hit = hitTestDetailSlot(mouseX, mouseY);
    if (!hit) return;

    const it = hit.item;
    const ch = hit.challenge;
    const have = isChallengeCompleted(ch.id) ? it.required : getCollectedFor(ch.id, it.key);
    const clamped = Math.min(have, it.required);
    const pct = it.required > 0 ? Math.round((clamped / it.required) * 100) : 0;

    const lines = [
      it.displayName || it.key, // optional field
      "",
      `Benötigt: ${it.required}`,
      `Fortschritt: ${clamped} / ${it.required} (${pct}%)`,
      `Chance: ${it.chance}%`,
      `LootTable: ${hit.tableId}`
    ];

    ctx.font = "10px monospace";
    const pad = 6;
    const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + pad * 2;
    const h = lines.length * 12 + pad * 2;

    let bx = mouseX + 10;
    let by = mouseY + 10;
    if (bx + w > INSIDE_W) bx = INSIDE_W - w - 2;
    if (by + h > INSIDE_H) by = INSIDE_H - h - 2;

    ctx.fillStyle = "rgba(16,16,16,0.92)";
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);

    ctx.fillStyle = "#fff";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + pad, by + pad + i * 12);
    }
  }

  // =========================
  // 10) Window + tabs + back button
  // =========================
  function drawWindow() {
    ctx.drawImage(imgs.get("window"), 0, 0, WINDOW_W, WINDOW_H);

    // window title (like Java)
    ctx.fillStyle = "#3f3f3f";
    ctx.font = "10px monospace";
    const title = ui.detailChallengeId ? "Challenge Details" : (ui.selectedTab?.title || "ALL & ONLY: LootTables");
    ctx.fillText(title, TITLE_X, TITLE_Y);

    // tabs (we draw simplified rectangles unless you have sprite tabs)
    if (ui.tabs.length > 1) {
      for (const t of ui.tabs) {
        const tx = t.type.getX(t.index);
        const ty = t.type.getY(t.index);
        ctx.fillStyle = (t === ui.selectedTab) ? "#2b2b2b" : "#1a1a1a";
        ctx.fillRect(tx, ty, t.type.width, t.type.height);
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.strokeRect(tx + 0.5, ty + 0.5, t.type.width - 1, t.type.height - 1);

        // icon letter placeholder
        ctx.fillStyle = "#ddd";
        ctx.font = "10px monospace";
        ctx.fillText(t.category[0], tx + 8, ty + 10);
      }
    }

    // back button (only in detail)
    if (ui.detailChallengeId) {
      // approximate placement: like your repositionElements sets at x+9, y+19 in window space
      const bx = 9, by = 19;
      ctx.fillStyle = "#222";
      ctx.fillRect(bx, by, 23, 13);
      ctx.fillStyle = "#ddd";
      ctx.font = "10px monospace";
      ctx.fillText("<", bx + 7, by + 2);
    }
  }

  function isOverBackButton(x, y) {
    return ui.detailChallengeId && x >= 9 && x <= 9 + 23 && y >= 19 && y <= 19 + 13;
  }

  function hitTestTab(mx, my) {
    for (const t of ui.tabs) {
      const x = t.type.getX(t.index);
      const y = t.type.getY(t.index);
      if (mx > x && mx < x + t.type.width && my > y && my < y + t.type.height) return t;
    }
    return null;
  }

  // =========================
  // 11) Main render loop
  // =========================
  function render() {
    ctx.clearRect(0, 0, WINDOW_W, WINDOW_H);

    // inside area
    scissor(INSIDE_X, INSIDE_Y, INSIDE_W, INSIDE_H, () => {
      ctx.save();
      ctx.translate(INSIDE_X, INSIDE_Y);

      const mouse = getMouseLocal(); // inside-local
      if (ui.detailChallengeId) {
        drawDetailInside();
        drawDetailTooltips(mouse.x, mouse.y);
      } else {
        drawOverviewInside();
        drawOverviewTooltips(mouse.x, mouse.y);
      }

      ctx.restore();
    });

    drawWindow();

    requestAnimationFrame(render);
  }

  // =========================
  // 12) Mouse mapping helpers
  // =========================
  let lastMouse = { x: 0, y: 0 };
  function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = WINDOW_W / rect.width;
    const sy = WINDOW_H / rect.height;
    lastMouse.x = (e.clientX - rect.left) * sx;
    lastMouse.y = (e.clientY - rect.top) * sy;
  }
  function getMouseLocal() {
    return { x: lastMouse.x - INSIDE_X, y: lastMouse.y - INSIDE_Y };
  }

  // =========================
  // 13) Input (matches Java behavior)
  // =========================
  canvas.addEventListener("mousemove", (e) => {
    updateMouse(e);

    // holding update (right-click hold emulation optional)
    if (ui.overview.holding && !ui.detailChallengeId) {
      const local = getMouseLocal();
      const hit = hitTestWidget(local.x, local.y);
      if (!hit || hit.challenge.id !== ui.overview.holding.challengeId) {
        ui.overview.holding = null;
      }
    }

    if (!ui.isDragging) return;
    const dx = lastMouse.x - ui.dragLast.x;
    const dy = lastMouse.y - ui.dragLast.y;
    ui.dragLast = { x: lastMouse.x, y: lastMouse.y };

    if (ui.detailChallengeId) {
      scrollDetail(dy);
    } else {
      // Java scroll(dx,dy) with clamp based on min/max
      const w = ui.overview.maxX - ui.overview.minX;
      const h = ui.overview.maxY - ui.overview.minY;
      if (w > INSIDE_W) ui.overview.scrollX = clamp(ui.overview.scrollX + dx, -(w - INSIDE_W), 0);
      if (h > INSIDE_H) ui.overview.scrollY = clamp(ui.overview.scrollY + dy, -(h - INSIDE_H), 0);
    }
  });

  canvas.addEventListener("mousedown", (e) => {
    updateMouse(e);

    // tabs click (only left)
    if (e.button === 0) {
      const t = hitTestTab(lastMouse.x, lastMouse.y);
      if (t) {
        ui.selectedTab = t;
        ui.detailChallengeId = null;
        ui.overview.centered = false;
        ui.overview.fade = 0;
        return;
      }
    }

    // back button
    if (e.button === 0 && isOverBackButton(lastMouse.x, lastMouse.y)) {
      ui.detailChallengeId = null;
      ui.detailScrollY = 0;
      return;
    }

    // inside interactions
    const inside = (
      lastMouse.x >= INSIDE_X && lastMouse.x <= INSIDE_X + INSIDE_W &&
      lastMouse.y >= INSIDE_Y && lastMouse.y <= INSIDE_Y + INSIDE_H
    );
    if (!inside) return;

    // Overview click to open detail
    if (!ui.detailChallengeId && e.button === 0) {
      const local = getMouseLocal();
      const hit = hitTestWidget(local.x, local.y);
      if (hit) {
        ui.detailChallengeId = hit.challenge.id;
        ui.detailScrollY = 0;
        return;
      }
    }

    // Start drag (left)
    if (e.button === 0) {
      ui.isDragging = true;
      ui.dragLast = { x: lastMouse.x, y: lastMouse.y };
    }

    // Optional: right click hold to "select" (like Java)
    if (!ui.detailChallengeId && e.button === 2) {
      e.preventDefault();
      const local = getMouseLocal();
      const hit = hitTestWidget(local.x, local.y);
      if (hit && !getActiveId() && !isChallengeCompleted(hit.challenge.id)) {
        ui.overview.holding = { challengeId: hit.challenge.id, startMs: performance.now() };
      }
    }
  });

  canvas.addEventListener("mouseup", () => {
    ui.isDragging = false;
    ui.dragLast = null;
    // right click release cancels hold like Java
    ui.overview.holding = null;
  });

  canvas.addEventListener("wheel", (e) => {
    updateMouse(e);
    const dy = e.deltaY;
    if (ui.detailChallengeId) scrollDetail(-dy * 0.5);
    else {
      // like Java: scroll(dx*16, dy*16) – wheel feels better with scaled values
      const w = ui.overview.maxX - ui.overview.minX;
      const h = ui.overview.maxY - ui.overview.minY;
      if (w > INSIDE_W) ui.overview.scrollX = clamp(ui.overview.scrollX + (-e.deltaX) * 0.5, -(w - INSIDE_W), 0);
      if (h > INSIDE_H) ui.overview.scrollY = clamp(ui.overview.scrollY + (-e.deltaY) * 0.5, -(h - INSIDE_H), 0);
    }
    e.preventDefault();
  }, { passive: false });

  // disable context menu so right click can be used
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // =========================
  // 14) Boot
  // =========================
  async function boot() {
    await loadAssets();

    // load data
    defs = await (await fetch("./data/definitions.json", { cache: "no-store" })).json();
    state = await (await fetch("./data/state.json", { cache: "no-store" })).json();

    // optional: preload icons referenced by URLs in definitions
    const iconUrls = new Set();
    for (const c of defs.challenges) {
      if (c.iconUrl) iconUrls.add(c.iconUrl);
      for (const it of c.items) if (it.iconUrl) iconUrls.add(it.iconUrl);
    }
    for (const url of iconUrls) {
      if (!imgs.has(url)) {
        try { imgs.set(url, await loadImage(url)); } catch {}
      }
    }

    buildTabsFromDefinitions();
    render();
  }

  boot().catch(err => {
    console.error(err);
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText("Boot error. Check console.", 10, 10);
  });
})();
