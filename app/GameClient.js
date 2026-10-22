"use client";

import { useEffect, useRef } from "react";

export default function GameClient({ username }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const PLAYER_NAME = username;
    const LS_KEY = "miller-life-game-v1";

    const DEFAULT_QUESTS = [
      { id: "wake", icon: "🌅", label: "Wake up early", xp: 10 },
      { id: "workout", icon: "🏋️", label: "Workout / Exercise", xp: 20 },
      { id: "study", icon: "🎯", label: "Study / Deep Work session", xp: 25 },
      { id: "skill", icon: "🛠️", label: "Skill practice", xp: 20 },
      { id: "med", icon: "🧘", label: "Meditation", xp: 10 },
      { id: "shower", icon: "🚿", label: "Cold shower", xp: 10 },
      { id: "read", icon: "📖", label: "Reading 15 min", xp: 10 },
      { id: "food", icon: "🥗", label: "Healthy meals", xp: 10 },
      { id: "water", icon: "💧", label: "Drink 3L water", xp: 10 },
      { id: "nojunk", icon: "🚫", label: "No junk food", xp: 10 },
      { id: "plan", icon: "🗓️", label: "Plan tomorrow", xp: 10 },
      { id: "sleep", icon: "🌙", label: "Sleep before 11 PM", xp: 15 },
    ];

    const RANKS = [
      { lv: 1, title: "Rookie" },
      { lv: 3, title: "Awakened" },
      { lv: 5, title: "Grinder" },
      { lv: 8, title: "Focused" },
      { lv: 10, title: "Disciplined" },
      { lv: 15, title: "Warrior" },
      { lv: 20, title: "Machine" },
      { lv: 30, title: "Relentless" },
      { lv: 40, title: "Elite" },
      { lv: 50, title: "Unstoppable" },
    ];

    /* Cumulative XP needed to REACH level L: 100, 300, 600, 1000, 1500, ... */
    function xpToReachLevel(L) {
      return L <= 1 ? 0 : (100 * (L - 1) * L) / 2;
    }
    function levelFromXp(xp) {
      let lv = 1;
      while (xpToReachLevel(lv + 1) <= xp) lv++;
      return lv;
    }
    function rankForLevel(lv) {
      let cur = RANKS[0],
        next = null;
      for (let i = 0; i < RANKS.length; i++) {
        if (RANKS[i].lv <= lv) cur = RANKS[i];
        else {
          next = RANKS[i];
          break;
        }
      }
      return { current: cur, next };
    }

    /* ==================== STATE ==================== */
    function dateKey(d) {
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + day;
    }
    function todayKey() {
      return dateKey(new Date());
    }
    function shiftKey(key, deltaDays) {
      const p = key.split("-");
      const d = new Date(+p[0], +p[1] - 1, +p[2]);
      d.setDate(d.getDate() + deltaDays);
      return dateKey(d);
    }
    function normalizeState(s) {
      if (s && typeof s === "object" && s.days && typeof s.days === "object" && Array.isArray(s.custom)) {
        return { custom: s.custom, days: s.days };
      }
      return null;
    }
    function hasProgress(s) {
      if (!s) return false;
      if (s.custom && s.custom.length) return true;
      for (const k in s.days || {}) {
        const rec = s.days[k];
        if (rec && ((rec.xp || 0) > 0 || Object.keys(rec.done || {}).length > 0)) return true;
      }
      return false;
    }
    function loadLocal() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return normalizeState(JSON.parse(raw));
      } catch {}
      return null;
    }

    let state = { custom: [], days: {} };
    let hydrated = false;

    /* ---- persistence: localStorage mirror + debounced server save ---- */
    let saveTimer = null;
    async function pushServer() {
      const payload = JSON.stringify({ state });
      try {
        const r = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (!r.ok) throw new Error("save failed");
      } catch {
        try {
          await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        } catch {}
      }
    }
    function saveState() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {}
      if (!hydrated) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(pushServer, 600);
    }

    function allQuests() {
      return DEFAULT_QUESTS.concat(state.custom);
    }
    function questById(id) {
      const qs = allQuests();
      for (let i = 0; i < qs.length; i++) if (qs[i].id === id) return qs[i];
      return null;
    }
    function dayRec(key) {
      if (!state.days[key]) state.days[key] = { done: {}, xp: 0, total: allQuests().length };
      return state.days[key];
    }
    function syncTodayTotal() {
      dayRec(todayKey()).total = allQuests().length;
    }
    function totalXp() {
      let sum = 0;
      for (const k in state.days) sum += state.days[k].xp || 0;
      return sum;
    }
    function dayPct(key) {
      const rec = state.days[key];
      if (!rec || !rec.total) return 0;
      return Math.round((Object.keys(rec.done).length / rec.total) * 100);
    }
    function streakEndingAt(key) {
      let n = 0,
        k = key;
      while (state.days[k] && Object.keys(state.days[k].done).length > 0) {
        n++;
        k = shiftKey(k, -1);
      }
      return n;
    }
    function currentStreak() {
      const t = todayKey();
      const rec = state.days[t];
      if (rec && Object.keys(rec.done).length > 0) return streakEndingAt(t);
      return streakEndingAt(shiftKey(t, -1)); /* morning grace */
    }
    function bestStreak() {
      let best = 0;
      for (const k in state.days) {
        if (Object.keys(state.days[k].done).length > 0) {
          const s = streakEndingAt(k);
          if (s > best) best = s;
        }
      }
      return best;
    }

    /* ==================== RENDER ==================== */
    const $ = (id) => document.getElementById(id);

    function motiveFor(pct, doneCount) {
      if (doneCount === 0) return "Every legend starts with Day One. Clear your first quest, Player One.";
      if (pct < 30) return "Warming up. Momentum is built one quest at a time — keep pushing.";
      if (pct < 60) return "Solid pace. The grind is real, and so is the progress.";
      if (pct < 100) return "Strong day, " + PLAYER_NAME + ". A few quests left — finish the run.";
      return "PERFECT DAY. Full clear. This is what the top 1% looks like.";
    }

    function renderPlayer(animateLevel) {
      const xp = totalXp();
      const lv = levelFromXp(xp);
      const base = xpToReachLevel(lv);
      const nextAt = xpToReachLevel(lv + 1);
      const into = xp - base,
        need = nextAt - base;
      const rank = rankForLevel(lv);
      const t = todayKey(),
        trec = dayRec(t);
      const pct = dayPct(t);

      $("playerName").textContent = PLAYER_NAME;
      $("avatarLetter").textContent = (PLAYER_NAME || "P").charAt(0).toUpperCase();
      $("levelNum").textContent = lv;
      $("rankTitle").textContent = rank.current.title;
      $("rankNext").textContent = rank.next ? "Lv " + rank.next.lv + " " + rank.next.title : "MAX RANK";
      $("xpInto").textContent = into;
      $("xpNeed").textContent = need;
      $("xpNextLv").textContent = lv + 1;
      $("totalXp").textContent = xp;
      $("todayXp").textContent = trec.xp || 0;
      $("streakNow").textContent = "🔥 " + currentStreak();
      $("bestStreak").textContent = bestStreak();
      $("motiveLine").textContent = motiveFor(pct, Object.keys(trec.done).length);

      requestAnimationFrame(() => {
        $("xpFill").style.width = (need ? (into / need) * 100 : 100) + "%";
      });

      if (animateLevel) {
        const card = $("playerCard"),
          toast = $("levelToast");
        toast.textContent = "⬆ LEVEL UP! You reached Level " + lv + " — " + rank.current.title;
        toast.classList.add("show");
        card.classList.remove("levelup");
        void card.offsetWidth;
        card.classList.add("levelup");
        setTimeout(() => toast.classList.remove("show"), 4200);
      }
    }

    function toggleQuest(id, rowEl) {
      const q = questById(id);
      if (!q) return;
      const rec = dayRec(todayKey());
      const before = levelFromXp(totalXp());
      if (rec.done[id]) {
        rec.xp -= rec.done[id];
        delete rec.done[id];
      } else {
        rec.done[id] = q.xp;
        rec.xp += q.xp;
        if (rowEl) {
          const f = document.createElement("span");
          f.className = "xp-float";
          f.textContent = "+" + q.xp + " XP";
          rowEl.appendChild(f);
          setTimeout(() => f.remove(), 1050);
        }
      }
      const after = levelFromXp(totalXp());
      renderAll(after > before);
    }

    function deleteCustomQuest(id) {
      const rec = dayRec(todayKey());
      if (rec.done[id]) {
        rec.xp -= rec.done[id];
        delete rec.done[id];
      }
      state.custom = state.custom.filter((q) => q.id !== id);
      renderAll(false);
    }

    function renderQuests() {
      const t = todayKey(),
        rec = dayRec(t);
      const qs = allQuests();
      const list = $("questList");
      list.innerHTML = "";
      qs.forEach((q) => {
        const done = !!rec.done[q.id];
        const row = document.createElement("div");
        row.className = "quest" + (done ? " done" : "");
        row.setAttribute("role", "checkbox");
        row.setAttribute("aria-checked", done ? "true" : "false");

        const icon = document.createElement("span");
        icon.className = "icon";
        icon.textContent = q.icon || "⭐";
        const lab = document.createElement("span");
        lab.className = "qlabel";
        lab.textContent = q.label;
        const chip = document.createElement("span");
        chip.className = "xpchip";
        chip.textContent = "+" + q.xp + " XP";
        const box = document.createElement("span");
        box.className = "box";
        box.textContent = "✓";
        row.appendChild(icon);
        row.appendChild(lab);
        row.appendChild(chip);
        row.appendChild(box);

        if (q.custom) {
          const del = document.createElement("button");
          del.className = "del";
          del.textContent = "×";
          del.title = "Delete quest";
          del.addEventListener("click", (ev) => {
            ev.stopPropagation();
            deleteCustomQuest(q.id);
          });
          row.appendChild(del);
        }
        row.addEventListener("click", () => toggleQuest(q.id, row));
        list.appendChild(row);
      });
      $("doneCount").textContent = Object.keys(rec.done).length + "/" + qs.length;
      $("todayPct").textContent = dayPct(t) + "%";
    }

    function renderStats() {
      const t = todayKey();
      $("statToday").textContent = dayPct(t) + "%";
      let sum7 = 0;
      for (let i = 0; i < 7; i++) sum7 += dayPct(shiftKey(t, -i));
      $("statWeek").textContent = Math.round(sum7 / 7) + "%";
      const pcts = [];
      let active = 0;
      for (const k in state.days) {
        if (state.days[k].total) {
          pcts.push(dayPct(k));
          active++;
        }
      }
      $("statAll").textContent =
        (pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0) + "%";
      $("statDays").textContent = active;
      renderChart(t);
    }

    function renderChart(today) {
      const W = 560,
        H = 190,
        PL = 34,
        PR = 10,
        PT = 14,
        PB = 26;
      const iw = W - PL - PR,
        ih = H - PT - PB;
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const key = shiftKey(today, -i);
        days.push({ key, pct: dayPct(key) });
      }
      const X = (i) => PL + (iw * i) / 13;
      const Y = (p) => PT + ih - (ih * p) / 100;

      let s =
        '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="Consistency chart, last 14 days">';
      s +=
        '<defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#38bdf8" stop-opacity=".32"/>' +
        '<stop offset="100%" stop-color="#38bdf8" stop-opacity=".02"/></linearGradient></defs>';
      [0, 50, 100].forEach((g) => {
        s +=
          '<line x1="' + PL + '" y1="' + Y(g) + '" x2="' + (W - PR) + '" y2="' + Y(g) +
          '" stroke="rgba(255,255,255,.08)" stroke-dasharray="3 4"/>';
        s +=
          '<text x="' + (PL - 6) + '" y="' + (Y(g) + 4) +
          '" fill="#8fa3c8" font-size="9" text-anchor="end">' + g + "%</text>";
      });
      const line = days
        .map((d, i) => (i === 0 ? "M" : "L") + X(i).toFixed(1) + "," + Y(d.pct).toFixed(1))
        .join(" ");
      const area = line + " L" + X(13).toFixed(1) + "," + Y(0) + " L" + X(0).toFixed(1) + "," + Y(0) + " Z";
      s += '<path d="' + area + '" fill="url(#areaFill)"/>';
      s += '<path d="' + line + '" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      days.forEach((d, i) => {
        const isToday = i === 13;
        s +=
          '<circle cx="' + X(i) + '" cy="' + Y(d.pct) + '" r="' + (isToday ? 4.4 : 3) +
          '" fill="' + (isToday ? "#7dd3fc" : "#0b1e4b") + '" stroke="#38bdf8" stroke-width="2"><title>' +
          d.key + ": " + d.pct + "%</title></circle>";
        if (i % 2 === 0 || isToday) {
          const p = d.key.split("-");
          s +=
            '<text x="' + X(i) + '" y="' + (H - 8) + '" fill="' + (isToday ? "#7dd3fc" : "#8fa3c8") +
            '" font-size="9" text-anchor="middle">' + (+p[2]) + "/" + (+p[1]) + "</text>";
        }
      });
      s += "</svg>";
      $("chart").innerHTML = s;
    }

    function fmtDate(key) {
      const p = key.split("-");
      const d = new Date(+p[0], +p[1] - 1, +p[2]);
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return names[d.getDay()] + ", " + (+p[2]) + " " + months[+p[1] - 1];
    }

    function renderHistory() {
      const t = todayKey();
      const keys = Object.keys(state.days)
        .filter((k) => k !== t)
        .sort()
        .reverse();
      const box = $("historyList");
      if (!keys.length) {
        box.innerHTML =
          '<div class="empty-note">No past days yet. Your history starts building from tomorrow — make today count.</div>';
        return;
      }
      box.innerHTML = "";
      keys.slice(0, 30).forEach((k) => {
        const rec = state.days[k];
        const pct = dayPct(k);
        const row = document.createElement("div");
        row.className = "hist-row";
        const left = document.createElement("div");
        left.className = "hist-date";
        left.innerHTML = '<div class="d"></div><div class="xp"></div>';
        left.querySelector(".d").textContent = fmtDate(k);
        left.querySelector(".xp").textContent =
          "+" + (rec.xp || 0) + " XP · " + Object.keys(rec.done).length + "/" + rec.total + " quests";
        const bar = document.createElement("div");
        bar.className = "hist-bar";
        const fill = document.createElement("div");
        fill.className = "hist-fill";
        fill.style.width = pct + "%";
        bar.appendChild(fill);
        const pc = document.createElement("div");
        pc.className = "hist-pct mono" + (pct === 100 ? " perfect" : "");
        pc.textContent = pct + "%";
        row.appendChild(left);
        row.appendChild(bar);
        row.appendChild(pc);
        box.appendChild(row);
      });
    }

    function renderAll(animateLevel) {
      syncTodayTotal();
      renderPlayer(animateLevel);
      renderQuests();
      renderStats();
      renderHistory();
      saveState();
    }

    /* ==================== ACTIONS ==================== */
    function addCustomQuest() {
      const labelEl = $("newQuestLabel"),
        xpEl = $("newQuestXp");
      const label = (labelEl.value || "").trim();
      if (!label) {
        labelEl.focus();
        return;
      }
      let xp = parseInt(xpEl.value, 10);
      if (isNaN(xp) || xp < 1) xp = 15;
      if (xp > 500) xp = 500;
      state.custom.push({
        id: "c" + Date.now().toString(36),
        icon: "⭐",
        label,
        xp,
        custom: true,
      });
      labelEl.value = "";
      renderAll(false);
    }

    $("addQuestBtn").addEventListener("click", addCustomQuest);
    $("newQuestLabel").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addCustomQuest();
    });
    $("resetBtn").addEventListener("click", () => {
      if (
        confirm(
          "Reset ALL progress? This clears every quest log, all XP and streaks on your account. This cannot be undone."
        )
      ) {
        state = { custom: [], days: {} };
        renderAll(false);
      }
    });
    $("logoutBtn").addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/login";
    });

    /* ==================== INIT ==================== */
    (async function init() {
      const now = new Date();
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      $("topDate").textContent =
        names[now.getDay()] + " · " + now.getDate() + " " + months[now.getMonth()] + " " + now.getFullYear();

      let serverState = null;
      let serverOk = false;
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        if (r.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (r.ok) {
          const data = await r.json();
          serverState = normalizeState(data.state);
          serverOk = true;
        }
      } catch {}

      const local = loadLocal();
      let imported = false;
      if (serverOk && hasProgress(serverState)) {
        state = serverState;
      } else if (local && hasProgress(local)) {
        state = local; /* one-time import of v1 device data (or offline fallback) */
        imported = true;
      } else if (serverOk && serverState) {
        state = serverState;
      } else if (local) {
        state = local;
      }
      hydrated = true;
      dayRec(todayKey());
      renderAll(false);
      if (imported && serverOk) pushServer();

      /* Day rollover while the page stays open: re-render at midnight */
      setInterval(() => {
        if (!state.days[todayKey()]) renderAll(false);
      }, 60000);
    })();
  }, [username]);

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="logo">
          ⚔️ LIFE <span>GAME</span>
        </div>
        <div className="topbar-right">
          <div className="topdate mono" id="topDate">
            —
          </div>
          <button className="logout-btn" id="logoutBtn" type="button">
            Log out
          </button>
        </div>
      </div>

      {/* PLAYER CARD */}
      <section className="panel player" id="playerCard">
        <div className="player-top">
          <div className="avatar" id="avatarLetter">
            P
          </div>
          <div className="player-id">
            <div className="player-name" id="playerName">
              Player
            </div>
            <div className="player-title">Player One</div>
            <div className="rank-line">
              Rank: <b id="rankTitle">Rookie</b> · Next: <b id="rankNext">—</b>
            </div>
          </div>
          <div className="level-badge">
            <div className="lv mono" id="levelNum">
              1
            </div>
            <div className="lvlabel">LEVEL</div>
          </div>
        </div>
        <div className="xpbar-wrap">
          <div className="xpbar-head">
            <span>XP PROGRESS</span>
            <span>
              <b id="xpInto">0</b> / <b id="xpNeed">100</b> XP to Level <b id="xpNextLv">2</b>
            </span>
          </div>
          <div className="xpbar">
            <div className="xpfill" id="xpFill"></div>
          </div>
        </div>
        <div className="player-stats">
          <div className="pstat">
            <div className="num mono" id="totalXp">
              0
            </div>
            <div className="lab">Total XP</div>
          </div>
          <div className="pstat">
            <div className="num" id="streakNow">
              🔥 0
            </div>
            <div className="lab">Day Streak</div>
          </div>
          <div className="pstat">
            <div className="num mono" id="todayXp">
              0
            </div>
            <div className="lab">XP Today</div>
          </div>
          <div className="pstat">
            <div className="num mono" id="bestStreak">
              0
            </div>
            <div className="lab">Best Streak</div>
          </div>
        </div>
        <div className="motive" id="motiveLine">
          Loading your quest log…
        </div>
        <div className="levelup-toast" id="levelToast">
          ⬆ LEVEL UP!
        </div>
      </section>

      {/* DAILY QUESTS */}
      <section className="panel">
        <h2>Daily Quests</h2>
        <div className="quest-progress">
          <span>
            Completed <b id="doneCount">0/0</b>
          </span>
          <span>
            Today: <b id="todayPct">0%</b>
          </span>
        </div>
        <div id="questList"></div>
        <div className="addquest">
          <input type="text" id="newQuestLabel" placeholder="Add a custom quest…" maxLength={60} />
          <input type="number" id="newQuestXp" placeholder="XP" min={1} max={500} defaultValue={15} />
          <button className="btn" id="addQuestBtn" type="button">
            + Add Quest
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="panel">
        <h2>Stats &amp; Consistency</h2>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="num mono" id="statToday">
              0%
            </div>
            <div className="lab">Today</div>
          </div>
          <div className="stat-tile">
            <div className="num mono" id="statWeek">
              0%
            </div>
            <div className="lab">7-Day Average</div>
          </div>
          <div className="stat-tile">
            <div className="num mono" id="statAll">
              0%
            </div>
            <div className="lab">All-Time Rate</div>
          </div>
          <div className="stat-tile">
            <div className="num mono" id="statDays">
              0
            </div>
            <div className="lab">Active Days</div>
          </div>
        </div>
        <div className="chart-box">
          <div className="chart-title">Last 14 Days — Daily Completion %</div>
          <div id="chart"></div>
        </div>
      </section>

      {/* HISTORY */}
      <section className="panel">
        <h2>History</h2>
        <div id="historyList"></div>
      </section>

      <div className="footer">
        <div className="note">
          Progress is saved to your account automatically — open Life Game on any device, log in, and pick up
          right where you left off.
        </div>
        <button className="reset-btn" id="resetBtn" type="button">
          Reset All Progress
        </button>
      </div>
    </div>
  );
}
