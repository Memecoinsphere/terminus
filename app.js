/* Terminus — static PWA, fake local terminal (cosmetic / local only).
 *
 * IMPORTANT: This is a SIMULATION. No real shell, no system access,
 * no network calls (CSP connect-src 'none'), no analytics.
 */

// ===== PASSCODE (change here) =====
const PASSCODE = "6767";
// ==================================

const decoyEl = document.getElementById("decoy");
const lockEl = document.getElementById("lock");
const panelEl = document.getElementById("panel");
const dotsEl = document.getElementById("dots");
const errorEl = document.getElementById("lockError");
const keypadEl = document.getElementById("keypad");
const lockPanelBtn = document.getElementById("lockPanelBtn");
const decoyTimeEl = document.getElementById("decoyTime");
const decoyDateEl = document.getElementById("decoyDate");

const termOutputEl = document.getElementById("termOutput");
const termFormEl = document.getElementById("termForm");
const termInputEl = document.getElementById("termInput");

let entered = "";
let view = "decoy"; // decoy | lock | panel

/* ---------- Terminal (SwiftUI TerminalView parity) ---------- */
const INITIAL_LINES = ["terminus v1 — local sandbox", "type help"];
let lines = [...INITIAL_LINES];

function render() {
  termOutputEl.textContent = "";
  const frag = document.createDocumentFragment();
  for (const l of lines) {
    const p = document.createElement("p");
    p.className = "term-line" + (l.startsWith("$") ? " cmd" : "");
    p.textContent = l;
    frag.appendChild(p);
  }
  termOutputEl.appendChild(frag);
  termOutputEl.scrollTop = termOutputEl.scrollHeight;
}

function run(raw) {
  const line = raw.trim();
  if (!line) return;
  lines.push("$ " + line);
  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  switch (cmd) {
    case "help":
      lines.push("cmds: help, clear, date, whoami, echo, uname, ls, pwd, id, history");
      break;
    case "clear":
      lines = [];
      break;
    case "date":
      lines.push(new Date().toString());
      break;
    case "whoami":
      lines.push("mobile");
      break;
    case "uname":
      lines.push("Darwin iPadOS 26.7.1 arm64");
      break;
    case "pwd":
      lines.push("/var/mobile");
      break;
    case "id":
      lines.push("uid=501(mobile) gid=501(mobile)");
      break;
    case "ls":
      lines.push("Documents  Library  tmp  Containers");
      break;
    case "echo":
      lines.push(args.join(" "));
      break;
    case "history":
      lines.push(lines.filter((l) => l.startsWith("$")).join("\n"));
      break;
    default:
      lines.push("command not found: " + cmd);
  }
  render();
}

termFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = termInputEl.value;
  termInputEl.value = "";
  run(v);
});

/* ---------- Views ---------- */
function show(name) {
  view = name;
  decoyEl.hidden = name !== "decoy";
  lockEl.hidden = name !== "lock";
  panelEl.hidden = name !== "panel";
  decoyEl.setAttribute("aria-hidden", name === "decoy" ? "false" : "true");
  if (name === "lock") {
    entered = "";
    updateDots();
    errorEl.hidden = true;
  }
  if (name === "panel") {
    render();
    termInputEl.focus({ preventScroll: true });
  } else {
    termInputEl.blur();
  }
}

function updateDots() {
  const dots = dotsEl.querySelectorAll(".dot");
  dots.forEach((d, i) => {
    d.classList.toggle("filled", i < entered.length);
  });
}

function onDigit(d) {
  if (view !== "lock" || entered.length >= 4) return;
  errorEl.hidden = true;
  entered += d;
  updateDots();
  if (entered.length === 4) {
    if (entered === PASSCODE) {
      show("panel");
    } else {
      errorEl.hidden = false;
      entered = "";
      setTimeout(updateDots, 180);
    }
  }
}

function onDelete() {
  if (view !== "lock" || !entered.length) return;
  entered = entered.slice(0, -1);
  errorEl.hidden = true;
  updateDots();
}

keypadEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-k]");
  if (!btn) return;
  const k = btn.getAttribute("data-k");
  if (k === "del") onDelete();
  else onDigit(k);
});

lockPanelBtn.addEventListener("click", () => {
  show("decoy");
});

/* ---------- Hidden gesture: double-tap in top ~15% strip ---------- */
const TOP_STRIP_RATIO = 0.15;
const DOUBLE_TAP_MS = 350;
let lastTopTapAt = 0;

function isTopStrip(clientY) {
  const h = window.innerHeight || document.documentElement.clientHeight;
  return clientY <= h * TOP_STRIP_RATIO;
}

function onPointerDown(e) {
  if (view !== "decoy") return;
  // Prefer primary pointer; ignore multi-touch extras.
  if (typeof e.button === "number" && e.button !== 0) return;
  const y = e.clientY;
  if (!isTopStrip(y)) {
    lastTopTapAt = 0;
    return;
  }
  const now = performance.now();
  if (lastTopTapAt && now - lastTopTapAt <= DOUBLE_TAP_MS) {
    lastTopTapAt = 0;
    show("lock");
  } else {
    lastTopTapAt = now;
  }
}

// Use pointerdown so it works for mouse (headless) and touch.
decoyEl.addEventListener("pointerdown", onPointerDown, { passive: true });

/* ---------- Decoy clock ---------- */
const FR_DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function pad2(n) { return String(n).padStart(2, "0"); }

function tickClock() {
  const now = new Date();
  decoyTimeEl.textContent = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
  decoyDateEl.textContent =
    FR_DAYS[now.getDay()] + " " + now.getDate() + " " + FR_MONTHS[now.getMonth()];
}

tickClock();
setInterval(tickClock, 15000);

/* ---------- Boot ---------- */
show("decoy");

/* PWA service worker (app-shell only, same-origin) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  });
}
