/* ============================================================
   Standalone runtime shims — this file replaces the Claude-
   artifact-only bits (ES module imports, window.storage,
   lucide-react) with plain browser equivalents so it can run
   as a normal hosted PWA. Everything else below this block is
   the same app logic.
   ============================================================ */
const { useState, useEffect, useMemo, useCallback, useRef } = React;
const {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, Cell, ReferenceLine, ReferenceArea, LineChart, Line,
} = Recharts;

// window.storage polyfill (Claude artifacts provide this natively;
// here we back it with localStorage, namespaced to this app).
window.storage = {
  async get(key) {
    const v = localStorage.getItem("ygbk:" + key);
    return v == null ? null : { key, value: v, shared: false };
  },
  async set(key, value) {
    localStorage.setItem("ygbk:" + key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem("ygbk:" + key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix) {
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith("ygbk:" + (prefix || "")))
      .map((k) => k.slice(5));
    return { keys, shared: false };
  },
};

/* ---- minimal icon set (plain SVG, no external icon library) ---- */
function Icon({ children, size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" style={style}>
      {children}
    </svg>
  );
}
const Upload = (p) => <Icon {...p}><path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></Icon>;
const Download = (p) => <Icon {...p}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></Icon>;
const ChevronRight = (p) => <Icon {...p}><path d="M9 18l6-6-6-6" /></Icon>;
const X = (p) => <Icon {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Icon>;
const Flag = (p) => <Icon {...p}><path d="M6 3v18" /><path d="M6 4h11l-2.5 4L17 12H6" /></Icon>;
const Target = (p) => <Icon {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.7" fill="currentColor" /></Icon>;
const AlertCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><circle cx="12" cy="16.3" r="0.9" fill="currentColor" /></Icon>;
const Compass = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-2 6-4 2 2-6z" /></Icon>;
const BarChart3 = (p) => <Icon {...p}><path d="M4 20V10" /><path d="M12 20V4" /><path d="M20 20v-7" /></Icon>;
const ClipboardList = (p) => <Icon {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9z" /><path d="M8 11h8" /><path d="M8 15h8" /></Icon>;
const Info = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.7" r="0.9" fill="currentColor" /></Icon>;
const Trash2 = (p) => <Icon {...p}><path d="M4 7h16" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><path d="M10 11v6" /><path d="M14 11v6" /></Icon>;
const CalendarDays = (p) => <Icon {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16" /><path d="M8 3v4" /><path d="M16 3v4" /></Icon>;
const CheckCircle2 = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.3 2.3L16 10" /></Icon>;


/* =========================================================================
   DESIGN TOKENS
   Palette: dusk fairway. A range session at last light — deep pine greens,
   chalk scorecard white, brass flagstick gold, and the two miss directions
   rendered as warm rust (right) / cool teal (left), the way a caddie would
   mark a yardage book in two pencils.
   ========================================================================= */
const COLORS = {
  bg: "#101d16",
  bgGrad: "#0b1610",
  surface: "#182a20",
  surfaceRaised: "#1f3527",
  surfaceHover: "#264030",
  line: "#2c4433",
  lineSoft: "#213626",
  text: "#eee8d8",
  textMuted: "#9fb2a1",
  textFaint: "#6b8071",
  gold: "#cc9f3a",
  goldSoft: "#8a742f",
  rust: "#bd5b3c",
  rustSoft: "#7a4535",
  teal: "#3f8a8f",
  tealSoft: "#2e5c60",
  danger: "#c0554a",
};

const CLUB_ORDER = [
  "driver", "3_wood", "5_wood", "7_wood",
  "2_hybrid", "3_hybrid", "4_hybrid", "5_hybrid",
  "2_iron", "3_iron", "4_iron", "5_iron", "6_iron", "7_iron", "8_iron", "9_iron",
  "pw", "gw", "aw", "sw", "lw",
];

function clubDisplayName(club) {
  if (!club) return "Unknown";
  const c = club.toLowerCase();
  const specialWedges = { pw: "PW", gw: "GW", aw: "AW", sw: "SW", lw: "LW" };
  if (specialWedges[c]) return specialWedges[c];
  return c
    .split("_")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function clubCategory(club) {
  const c = (club || "").toLowerCase();
  if (c === "driver") return "Driver";
  if (c.includes("wood")) return "Woods";
  if (c.includes("hybrid")) return "Hybrids";
  if (["pw", "gw", "aw", "sw", "lw"].includes(c)) return "Wedges";
  if (c.includes("iron")) return "Irons";
  return "Other";
}

const CATEGORY_ORDER = ["Driver", "Woods", "Hybrids", "Irons", "Wedges", "Other"];

function clubSortIndex(club) {
  const i = CLUB_ORDER.indexOf((club || "").toLowerCase());
  return i === -1 ? 999 : i;
}

function missFamily(classification) {
  const c = (classification || "").toLowerCase();
  if (c.includes("hook")) return "left";
  if (c.includes("slice")) return "right";
  if (c.includes("draw")) return "left";
  if (c.includes("fade")) return "right";
  if (c.includes("pull")) return "left";
  if (c.includes("push")) return "right";
  return "straight";
}
function isBigMiss(classification) {
  return (classification || "").toLowerCase().includes("huge");
}
function familyColor(fam) {
  if (fam === "left") return COLORS.teal;
  if (fam === "right") return COLORS.rust;
  return COLORS.gold;
}

// Approximate "good contact" smash factor targets by club family — used only
// as a rough reference point for the strike-quality insight, not a hard rule.
function smashTarget(club) {
  const c = (club || "").toLowerCase();
  if (c === "driver") return 1.48;
  if (c.includes("wood")) return 1.42;
  if (c.includes("hybrid")) return 1.38;
  if (["2_iron", "3_iron", "4_iron", "5_iron"].includes(c)) return 1.37;
  if (["6_iron", "7_iron"].includes(c)) return 1.33;
  if (["8_iron", "9_iron"].includes(c)) return 1.28;
  return 1.22; // wedges
}

// Rough, publicly-cited PGA Tour average proximity-to-target (feet) by carry
// distance (yards), linearly interpolated. Used only to build an
// illustrative, order-of-magnitude strokes-gained-style proxy — see the
// methodology note in the Insights tab. Not a substitute for verified SG data.
const TOUR_PROX_TABLE = [
  [30, 9], [50, 12], [75, 15], [100, 18], [125, 21],
  [150, 25], [175, 30], [200, 38], [225, 44], [250, 50], [280, 58],
];
function tourProximityFt(distanceYds) {
  const t = TOUR_PROX_TABLE;
  if (distanceYds <= t[0][0]) return t[0][1];
  if (distanceYds >= t[t.length - 1][0]) {
    const [x1, y1] = t[t.length - 2], [x2, y2] = t[t.length - 1];
    const slope = (y2 - y1) / (x2 - x1);
    return y2 + slope * (distanceYds - x2);
  }
  for (let i = 0; i < t.length - 1; i++) {
    const [x1, y1] = t[i], [x2, y2] = t[i + 1];
    if (distanceYds >= x1 && distanceYds <= x2) {
      const f = (distanceYds - x1) / (x2 - x1);
      return y1 + f * (y2 - y1);
    }
  }
  return 25;
}

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}
function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function fmt0(n) { return Math.round(n).toString(); }
function fmtSigned1(n) { return (n >= 0 ? "+" : "") + fmt1(n); }

function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(d) {
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ---------- CSV parsing ---------- */
function parseCsvText(text) {
  const result = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const shots = [];
  for (const row of result.data) {
    if (!row.date || !row.type) continue;
    const t = String(row.type);
    shots.push({
      id: String(row.date),
      date: row.date,
      shotNumber: Number(row.shotNumber) || 0,
      club: t,
      carry: Number(row.carry) || 0,
      total: Number(row.total) || 0,
      offline: Number(row.offline) || 0,
      offlineCarry: Number(row.offlineCarry) || 0,
      classification: row.classification || "",
      curve: Number(row.curve) || 0,
      clubSpeed: Number(row.clubSpeed) || 0,
      ballSpeed: Number(row.ballSpeed) || 0,
      smashFactor: Number(row.smashFactor) || 0,
      launchAngle: Number(row.launchAngle) || 0,
      backSpin: Number(row.backSpin) || 0,
      sideSpin: Number(row.sideSpin) || 0,
      totalScore: row.totalScore != null ? Number(row.totalScore) : null,
      landingAngle: Number(row.landingAngle) || 0,
      peakHeight: Number(row.peakHeight) || 0,
    });
  }
  return shots;
}

/* ---------- Session grouping (2hr gap = new session) ---------- */
function groupSessions(shots) {
  const sorted = [...shots].sort((a, b) => new Date(a.date) - new Date(b.date));
  const sessions = [];
  let current = null;
  let prevTime = null;
  for (const s of sorted) {
    const t = new Date(s.date).getTime();
    if (!current || (prevTime != null && t - prevTime > 2 * 60 * 60 * 1000)) {
      current = { id: s.date, start: s.date, end: s.date, shots: [] };
      sessions.push(current);
    }
    current.shots.push(s);
    current.end = s.date;
    prevTime = t;
  }
  return sessions.sort((a, b) => new Date(b.start) - new Date(a.start));
}

/* ---------- Insights engine (fully local, rule-based) ---------- */
function computeClubStats(shots) {
  const byClub = {};
  for (const s of shots) {
    (byClub[s.club] = byClub[s.club] || []).push(s);
  }
  return Object.entries(byClub).map(([club, list]) => {
    const carries = list.map((s) => s.carry).filter((n) => n > 0);
    const totals = list.map((s) => s.total).filter((n) => n > 0);
    const offlines = list.map((s) => s.offline);
    const smashes = list.map((s) => s.smashFactor).filter((n) => n > 0);
    const bigMisses = list.filter((s) => isBigMiss(s.classification));
    const families = list.map((s) => missFamily(s.classification));
    const leftPct = families.filter((f) => f === "left").length / list.length;
    const rightPct = families.filter((f) => f === "right").length / list.length;
    const tally = {};
    list.forEach((s) => {
      const key = s.classification || "Unclassified";
      tally[key] = (tally[key] || 0) + 1;
    });
    const dominant = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return {
      club, count: list.length,
      avgCarry: mean(carries), avgTotal: mean(totals),
      minCarry: carries.length ? Math.min(...carries) : 0,
      maxCarry: carries.length ? Math.max(...carries) : 0,
      stdCarry: stdev(carries),
      avgOffline: mean(offlines), stdOffline: stdev(offlines),
      avgSmash: mean(smashes), smashGoal: smashTarget(club),
      bigMissRate: bigMisses.length / list.length,
      leftPct, rightPct,
      dominantMiss: dominant ? dominant[0] : null,
      dominantMissPct: dominant ? dominant[1] / list.length : 0,
      shots: list,
    };
  }).sort((a, b) => clubSortIndex(a.club) - clubSortIndex(b.club));
}

function computeInsights(clubStats) {
  const issues = [];
  clubStats.forEach((cs) => {
    if (cs.count < 3) return; // not enough signal
    // 1. Directional bias
    const biasThreshold = 8; // yards
    if (Math.abs(cs.avgOffline) >= biasThreshold) {
      const dir = cs.avgOffline > 0 ? "right" : "left";
      const severity = Math.min(100, (Math.abs(cs.avgOffline) / 25) * 100);
      issues.push({
        severity, club: cs.club, category: "Directional bias",
        headline: `${clubDisplayName(cs.club)}: consistent miss ${dir}`,
        detail: `Averaging ${fmt1(Math.abs(cs.avgOffline))}y ${dir} of target across ${cs.count} shots (dominant shot shape: ${cs.dominantMiss || "n/a"}, ${fmt0(cs.dominantMissPct * 100)}% of shots).`,
        drill: dir === "right"
          ? "Work on face-to-path gap at impact — face is likely staying open relative to path. Try gate drills (two alignment sticks framing the ball) focusing on closing the face through impact, and check grip/setup alignment."
          : "Work on face-to-path gap at impact — face is likely closing relative to path. Try gate drills with a slightly stronger focus on holding the face open longer through impact, and check for an over-active release.",
      });
    }
    // 2. Dispersion / control
    const dispersionThreshold = 14; // yards stdev
    if (cs.stdOffline >= dispersionThreshold) {
      const severity = Math.min(100, (cs.stdOffline / 25) * 100);
      issues.push({
        severity, club: cs.club, category: "Dispersion",
        headline: `${clubDisplayName(cs.club)}: wide left-right scatter`,
        detail: `Shot-to-shot lateral spread (std dev) is ${fmt1(cs.stdOffline)}y over ${cs.count} shots — wider than typical for a repeatable strike.`,
        drill: "Prioritize contact consistency over speed for a session: hit half-speed shots focusing on center-face strike (use impact tape or foot spray if available), then rebuild speed once dispersion tightens.",
      });
    }
    // 3. Strike quality (smash factor)
    if (cs.avgSmash > 0) {
      const deficit = cs.smashGoal - cs.avgSmash;
      if (deficit >= 0.05) {
        const severity = Math.min(100, (deficit / 0.15) * 100);
        issues.push({
          severity, club: cs.club, category: "Strike quality",
          headline: `${clubDisplayName(cs.club)}: energy transfer below target`,
          detail: `Average smash factor ${fmt1(cs.avgSmash)} vs a rough target of ~${cs.smashGoal.toFixed(2)} for this club — suggests off-center or inefficient strikes.`,
          drill: "Check low-point control and ball position. Feed forward drills (ball just behind lead heel reference, focus on ball-then-turf contact) tend to help with center strike.",
        });
      }
    }
    // 4. Big miss rate
    if (cs.bigMissRate >= 0.2 && cs.count >= 5) {
      const severity = Math.min(100, cs.bigMissRate * 100);
      issues.push({
        severity, club: cs.club, category: "Blow-up shots",
        headline: `${clubDisplayName(cs.club)}: frequent big misses`,
        detail: `${fmt0(cs.bigMissRate * 100)}% of shots were flagged as a "huge" miss — these are the shots most likely to cost strokes on course.`,
        drill: "Before working on precision, isolate what causes the worst misses specifically (rushed tempo, alignment, grip pressure). A pre-shot routine with a consistent trigger can reduce blow-ups even before mechanics improve.",
      });
    }
  });

  // 5. Club gapping across the bag (only using clubs with data)
  const withDistance = clubStats.filter((c) => c.count >= 2 && c.avgCarry > 0)
    .sort((a, b) => b.avgCarry - a.avgCarry);
  for (let i = 0; i < withDistance.length - 1; i++) {
    const a = withDistance[i], b = withDistance[i + 1];
    const gap = a.avgCarry - b.avgCarry;
    if (gap < 6) {
      issues.push({
        severity: 35, club: `${a.club}|${b.club}`, category: "Bag gapping",
        headline: `${clubDisplayName(a.club)} & ${clubDisplayName(b.club)} overlap in distance`,
        detail: `Average carries are only ${fmt1(gap)}y apart (${fmt0(a.avgCarry)}y vs ${fmt0(b.avgCarry)}y). Worth confirming with more reps — could be a real gapping issue or just session-to-session variance.`,
        drill: "Log a few more sessions with both clubs before changing anything — one data point isn't enough to confirm a true gapping problem.",
      });
    } else if (gap > 28) {
      issues.push({
        severity: 30, club: `${a.club}|${b.club}`, category: "Bag gapping",
        headline: `Distance gap between ${clubDisplayName(a.club)} and ${clubDisplayName(b.club)}`,
        detail: `${fmt0(gap)}y between average carries — larger than the typical ~15-20y per-club gap. Could leave an awkward yardage in between on course.`,
        drill: "Consider whether a hybrid, extra wedge, or half-swing version of one of these clubs could fill the gap.",
      });
    }
  }

  return issues.sort((a, b) => b.severity - a.severity);
}

// Simplified, clearly-labeled strokes-gained-style proxy per club.
function computeSgProxy(clubStats) {
  return clubStats
    .filter((cs) => cs.count >= 3 && cs.avgCarry > 0)
    .map((cs) => {
      const perShot = cs.shots.map((s) => {
        const dist = s.carry;
        const tourProxFt = tourProximityFt(dist);
        const yourProxFt = Math.abs(s.offline) * 3;
        const deltaFt = tourProxFt - yourProxFt; // positive = better than tour avg
        const strokes = Math.max(-0.5, Math.min(0.5, deltaFt * 0.013));
        return strokes;
      });
      return { club: cs.club, avgSg: mean(perShot), count: cs.count };
    })
    .sort((a, b) => b.avgSg - a.avgSg);
}

/* =========================================================================
   UI PRIMITIVES
   ========================================================================= */
function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="chip" style={{
      background: active ? COLORS.gold : "transparent",
      color: active ? "#101d16" : COLORS.textMuted,
      borderColor: active ? COLORS.gold : COLORS.line,
    }}>
      {children}
    </button>
  );
}

function SeverityBadge({ severity }) {
  let label = "Low", color = COLORS.textFaint;
  if (severity >= 66) { label = "High"; color = COLORS.rust; }
  else if (severity >= 33) { label = "Medium"; color = COLORS.gold; }
  else { color = COLORS.teal; }
  return (
    <span className="badge" style={{ borderColor: color, color }}>{label}</span>
  );
}

function EmptyState({ onUploadClick }) {
  return (
    <div className="empty-state">
      <Flag size={30} color={COLORS.gold} strokeWidth={1.5} />
      <div className="empty-title">No shots logged yet</div>
      <div className="empty-sub">Upload a Trackman session CSV to start building your yardage book.</div>
      <button className="btn-primary" onClick={onUploadClick}>
        <Upload size={15} /> Upload CSV
      </button>
    </div>
  );
}

/* =========================================================================
   MAIN APP
   ========================================================================= */
function App() {
  const [shots, setShots] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [category, setCategory] = useState("All");
  const [club, setClub] = useState("All");
  const [dispersionClub, setDispersionClub] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("yardagebook-shots-v1");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setShots(parsed);
        }
      } catch (e) {
        // no data yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try {
      await window.storage.set("yardagebook-shots-v1", JSON.stringify(next));
    } catch (e) {
      console.error("Storage save failed", e);
      setToast({ type: "error", msg: "Couldn't save — your device storage may be full." });
    }
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3200);
  };

  const mergeShots = useCallback((incoming) => {
    setShots((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      let added = 0;
      for (const s of incoming) {
        if (!byId.has(s.id)) { byId.set(s.id, s); added++; }
      }
      const next = Array.from(byId.values());
      persist(next);
      showToast("success", added > 0 ? `Added ${added} new shot${added === 1 ? "" : "s"}.` : "No new shots found — already logged.");
      return next;
    });
  }, [persist]);

  const handleCsvFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseCsvText(String(evt.target.result));
        if (!parsed.length) { showToast("error", "No valid shots found in that file."); return; }
        mergeShots(parsed);
      } catch (err) {
        showToast("error", "Couldn't read that CSV.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), shots }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yardage-book-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("success", "Backup downloaded.");
  };

  const handleImportBackup = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(String(evt.target.result));
        const arr = Array.isArray(data) ? data : data.shots;
        if (!Array.isArray(arr)) throw new Error("bad format");
        mergeShots(arr);
      } catch (err) {
        showToast("error", "That doesn't look like a valid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const deleteSession = (sessionId) => {
    setShots((prev) => {
      const next = prev.filter((s) => {
        const sess = sessionsAll.find((se) => se.id === sessionId);
        return !sess || !sess.shots.some((sh) => sh.id === s.id);
      });
      persist(next);
      return next;
    });
    showToast("success", "Session removed.");
  };

  const sessionsAll = useMemo(() => groupSessions(shots), [shots]);

  const availableClubs = useMemo(() => {
    const set = new Set(shots.map((s) => s.club));
    return Array.from(set).sort((a, b) => clubSortIndex(a) - clubSortIndex(b));
  }, [shots]);

  const availableCategories = useMemo(() => {
    const set = new Set(shots.map((s) => clubCategory(s.club)));
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [shots]);

  const filteredShots = useMemo(() => {
    return shots.filter((s) => {
      if (category !== "All" && clubCategory(s.club) !== category) return false;
      if (club !== "All" && s.club !== club) return false;
      return true;
    });
  }, [shots, category, club]);

  const clubStats = useMemo(() => computeClubStats(filteredShots), [filteredShots]);
  const allClubStats = useMemo(() => computeClubStats(shots), [shots]);
  const insights = useMemo(() => computeInsights(allClubStats), [allClubStats]);
  const sgProxy = useMemo(() => computeSgProxy(allClubStats), [allClubStats]);

  useEffect(() => {
    if (!dispersionClub && availableClubs.length) setDispersionClub(availableClubs[0]);
  }, [availableClubs, dispersionClub]);

  if (!loaded) {
    return <div className="app-shell"><GlobalStyle /><div className="boot">Loading your yardage book…</div></div>;
  }

  return (
    <div className="app-shell">
      <GlobalStyle />
      <header className="header">
        <div>
          <div className="header-eyebrow">SIMULATOR JOURNAL</div>
          <div className="header-title">Yardage Book</div>
        </div>
        <button className="icon-btn" onClick={() => setPanelOpen(true)} aria-label="Manage data">
          <Upload size={18} />
        </button>
      </header>

      {shots.length === 0 ? (
        <EmptyState onUploadClick={() => fileInputRef.current && fileInputRef.current.click()} />
      ) : (
        <main className="main">
          {(availableCategories.length > 1 || availableClubs.length > 1) && tab !== "insights" && (
            <div className="filter-row">
              <div className="chip-row">
                <Chip active={category === "All"} onClick={() => { setCategory("All"); setClub("All"); }}>All</Chip>
                {availableCategories.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => { setCategory(c); setClub("All"); }}>{c}</Chip>
                ))}
              </div>
              {category !== "All" && (
                <div className="chip-row">
                  <Chip active={club === "All"} onClick={() => setClub("All")}>All {category}</Chip>
                  {availableClubs.filter((c) => clubCategory(c) === category).map((c) => (
                    <Chip key={c} active={club === c} onClick={() => setClub(c)}>{clubDisplayName(c)}</Chip>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "overview" && (
            <OverviewTab shots={filteredShots} allShots={shots} sessions={sessionsAll} clubStats={clubStats} insights={insights} onGoInsights={() => setTab("insights")} />
          )}
          {tab === "bag" && <BagTab clubStats={clubStats} />}
          {tab === "dispersion" && (
            <DispersionTab
              clubStats={clubStats}
              dispersionClub={dispersionClub}
              setDispersionClub={setDispersionClub}
              availableClubs={availableClubs}
            />
          )}
          {tab === "misses" && <MissesTab shots={filteredShots} clubStats={clubStats} />}
          {tab === "insights" && <InsightsTab insights={insights} sgProxy={sgProxy} />}
        </main>
      )}

      <nav className="tabbar">
        <TabButton icon={<Compass size={19} />} label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton icon={<BarChart3 size={19} />} label="Bag" active={tab === "bag"} onClick={() => setTab("bag")} />
        <TabButton icon={<Target size={19} />} label="Dispersion" active={tab === "dispersion"} onClick={() => setTab("dispersion")} />
        <TabButton icon={<Compass size={19} style={{ transform: "rotate(45deg)" }} />} label="Misses" active={tab === "misses"} onClick={() => setTab("misses")} />
        <TabButton icon={<ClipboardList size={19} />} label="Insights" active={tab === "insights"} onClick={() => setTab("insights")} />
      </nav>

      {panelOpen && (
        <DataPanel
          onClose={() => setPanelOpen(false)}
          onUpload={() => fileInputRef.current && fileInputRef.current.click()}
          onExport={handleExportBackup}
          onImport={() => backupInputRef.current && backupInputRef.current.click()}
          sessions={sessionsAll}
          onDeleteSession={deleteSession}
          totalShots={shots.length}
        />
      )}

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleCsvFile} />
      <input ref={backupInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleImportBackup} />

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button className="tab-btn" onClick={onClick} style={{ color: active ? COLORS.gold : COLORS.textFaint }}>
      {icon}
      <span style={{ fontSize: 10.5, marginTop: 3, letterSpacing: "0.02em" }}>{label}</span>
    </button>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ shots, allShots, sessions, clubStats, insights, onGoInsights }) {
  const dateRange = useMemo(() => {
    if (!allShots.length) return null;
    const dates = allShots.map((s) => new Date(s.date).getTime());
    return [new Date(Math.min(...dates)), new Date(Math.max(...dates))];
  }, [allShots]);

  const mostPracticed = useMemo(() => {
    if (!clubStats.length) return null;
    return [...clubStats].sort((a, b) => b.count - a.count)[0];
  }, [clubStats]);

  const sessionChartData = useMemo(() => {
    return sessions.slice(0, 10).reverse().map((s) => ({
      label: fmtDate(s.start),
      shots: s.shots.length,
    }));
  }, [sessions]);

  const topIssue = insights[0];

  return (
    <div className="tab-pane">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-num">{shots.length}</div>
          <div className="kpi-label">Shots logged</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num">{sessions.length}</div>
          <div className="kpi-label">Sessions</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-num" style={{ fontSize: 16 }}>{mostPracticed ? clubDisplayName(mostPracticed.club) : "—"}</div>
          <div className="kpi-label">Most practiced</div>
        </div>
      </div>

      {dateRange && (
        <div className="section-sub">
          <CalendarDays size={13} /> {fmtDate(dateRange[0])} — {fmtDate(dateRange[1])}
        </div>
      )}

      {sessionChartData.length > 1 && (
        <div className="card">
          <div className="card-title">Shots per session</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={sessionChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.lineSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: COLORS.text }} />
              <Line type="monotone" dataKey="shots" stroke={COLORS.gold} strokeWidth={2} dot={{ r: 3, fill: COLORS.gold }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {topIssue && (
        <button className="focus-callout" onClick={onGoInsights}>
          <div className="focus-callout-eyebrow">TOP FOCUS FOR YOUR NEXT SESSION</div>
          <div className="focus-callout-title">{topIssue.headline}</div>
          <div className="focus-callout-cta">See all insights <ChevronRight size={14} /></div>
        </button>
      )}
    </div>
  );
}

/* ---------------- Bag (yardage ladder) ---------------- */
function BagTab({ clubStats }) {
  const data = useMemo(() => {
    return [...clubStats]
      .filter((c) => c.avgCarry > 0)
      .sort((a, b) => b.avgCarry - a.avgCarry)
      .map((c) => ({
        name: clubDisplayName(c.club),
        carry: Math.round(c.avgCarry),
        range: [Math.round(c.minCarry), Math.round(c.maxCarry)],
        total: Math.round(c.avgTotal),
        count: c.count,
        club: c.club,
      }));
  }, [clubStats]);

  if (!data.length) return <div className="tab-pane"><NoDataNote /></div>;

  return (
    <div className="tab-pane">
      <div className="card">
        <div className="card-title">Yardage ladder — avg carry</div>
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={COLORS.lineSoft} horizontal={false} />
            <XAxis type="number" tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: COLORS.text, fontSize: 11.5 }} axisLine={false} tickLine={false} width={68} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: COLORS.text }}
              formatter={(val, name, props) => [`${val}y (range ${props.payload.range[0]}–${props.payload.range[1]}y)`, "Avg carry"]}
            />
            <Bar dataKey="carry" radius={[0, 4, 4, 0]} fill={COLORS.gold} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "14px 14px 6px" }}>Club averages</div>
        <table className="data-table">
          <thead>
            <tr><th>Club</th><th>Carry</th><th>Total</th><th>Roll</th><th>Shots</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.club}>
                <td>{d.name}</td>
                <td>{d.carry}y</td>
                <td>{d.total}y</td>
                <td>{d.total - d.carry}y</td>
                <td className="muted">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Dispersion (signature top-down view) ---------------- */
function DispersionTab({ clubStats, dispersionClub, setDispersionClub, availableClubs }) {
  const cs = clubStats.find((c) => c.club === dispersionClub) || clubStats[0];

  const points = useMemo(() => {
    if (!cs) return [];
    return cs.shots.map((s) => ({
      x: s.offline,
      y: s.carry,
      fam: missFamily(s.classification),
      big: isBigMiss(s.classification),
      classification: s.classification,
    }));
  }, [cs]);

  const maxCarry = points.length ? Math.max(...points.map((p) => p.y)) * 1.12 : 100;
  const maxOffline = points.length ? Math.max(20, Math.max(...points.map((p) => Math.abs(p.x))) * 1.25) : 20;

  if (!availableClubs.length) return <div className="tab-pane"><NoDataNote /></div>;

  return (
    <div className="tab-pane">
      <div className="chip-row" style={{ marginBottom: 10 }}>
        {availableClubs.map((c) => (
          <Chip key={c} active={dispersionClub === c} onClick={() => setDispersionClub(c)}>{clubDisplayName(c)}</Chip>
        ))}
      </div>

      {cs && (
        <div className="card range-card">
          <div className="card-title">{clubDisplayName(cs.club)} — looking downrange</div>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id="fairwayFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1c3324" />
                  <stop offset="100%" stopColor="#132419" />
                </linearGradient>
              </defs>
              <ReferenceArea x1={-maxOffline} x2={maxOffline} y1={0} y2={maxCarry} fill="url(#fairwayFade)" />
              <CartesianGrid stroke={COLORS.lineSoft} />
              <XAxis type="number" dataKey="x" domain={[-maxOffline, maxOffline]} tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={{ stroke: COLORS.line }} tickLine={false} label={{ value: "offline (y)", position: "insideBottom", fill: COLORS.textFaint, fontSize: 10, dy: 12 }} />
              <YAxis type="number" dataKey="y" domain={[0, maxCarry]} tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={{ stroke: COLORS.line }} tickLine={false} width={38} />
              <ReferenceLine x={0} stroke={COLORS.gold} strokeDasharray="3 5" strokeWidth={1.5} />
              <Tooltip
                cursor={{ stroke: COLORS.line }}
                contentStyle={tooltipStyle}
                formatter={(val, name, props) => {
                  if (name === "y") return [`${fmt1(props.payload.y)}y carry`, "Carry"];
                  return [`${fmt1(props.payload.x)}y`, "Offline"];
                }}
                labelFormatter={() => ""}
              />
              <Scatter data={points} shape={(props) => <DotShape {...props} />} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="legend-row">
            <LegendDot color={COLORS.teal} label="Left miss" />
            <LegendDot color={COLORS.gold} label="Straight" />
            <LegendDot color={COLORS.rust} label="Right miss" />
          </div>
          <div className="stat-strip">
            <div><span className="stat-num">{fmtSigned1(cs.avgOffline)}y</span><span className="stat-lbl">avg bias</span></div>
            <div><span className="stat-num">{fmt1(cs.stdOffline)}y</span><span className="stat-lbl">spread (σ)</span></div>
            <div><span className="stat-num">{fmt0(cs.bigMissRate * 100)}%</span><span className="stat-lbl">big misses</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DotShape({ cx, cy, payload }) {
  const color = familyColor(payload.fam);
  const r = payload.big ? 5.5 : 3.8;
  return <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={payload.big ? 0.95 : 0.75} stroke={payload.big ? COLORS.text : "none"} strokeWidth={payload.big ? 1 : 0} />;
}
function LegendDot({ color, label }) {
  return <div className="legend-dot"><span style={{ background: color }} />{label}</div>;
}

/* ---------------- Misses ---------------- */
function MissesTab({ shots, clubStats }) {
  const tally = useMemo(() => {
    const t = {};
    shots.forEach((s) => {
      const key = s.classification || "Unclassified";
      t[key] = (t[key] || 0) + 1;
    });
    return Object.entries(t)
      .map(([name, count]) => ({ name, count, fam: missFamily(name) }))
      .sort((a, b) => b.count - a.count);
  }, [shots]);

  const bias = useMemo(() => {
    const families = shots.map((s) => missFamily(s.classification));
    const left = families.filter((f) => f === "left").length;
    const right = families.filter((f) => f === "right").length;
    const straight = families.filter((f) => f === "straight").length;
    const n = shots.length || 1;
    return { left: left / n, right: right / n, straight: straight / n, leftN: left, rightN: right, straightN: straight };
  }, [shots]);

  if (!shots.length) return <div className="tab-pane"><NoDataNote /></div>;

  return (
    <div className="tab-pane">
      <div className="card">
        <div className="card-title">Directional tendency</div>
        <div className="bias-bar">
          <div style={{ width: `${bias.left * 100}%`, background: COLORS.teal }} />
          <div style={{ width: `${bias.straight * 100}%`, background: COLORS.gold }} />
          <div style={{ width: `${bias.right * 100}%`, background: COLORS.rust }} />
        </div>
        <div className="bias-legend">
          <span><span className="dot" style={{ background: COLORS.teal }} />Left {fmt0(bias.left * 100)}%</span>
          <span><span className="dot" style={{ background: COLORS.gold }} />Straight {fmt0(bias.straight * 100)}%</span>
          <span><span className="dot" style={{ background: COLORS.rust }} />Right {fmt0(bias.right * 100)}%</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Shot shapes, most to least common</div>
        <ResponsiveContainer width="100%" height={Math.max(140, tally.length * 30)}>
          <BarChart data={tally} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={COLORS.lineSoft} horizontal={false} />
            <XAxis type="number" tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={{ stroke: COLORS.line }} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: COLORS.text, fontSize: 10.5 }} axisLine={false} tickLine={false} width={100} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Shots"]} labelStyle={{ color: COLORS.text }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {tally.map((entry, i) => <Cell key={i} fill={familyColor(entry.fam)} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "14px 14px 6px" }}>By club</div>
        <table className="data-table">
          <thead><tr><th>Club</th><th>Dominant miss</th><th>Bias</th></tr></thead>
          <tbody>
            {clubStats.filter((c) => c.count >= 2).sort((a, b) => clubSortIndex(a.club) - clubSortIndex(b.club)).map((c) => (
              <tr key={c.club}>
                <td>{clubDisplayName(c.club)}</td>
                <td>{c.dominantMiss || "—"} <span className="muted">({fmt0(c.dominantMissPct * 100)}%)</span></td>
                <td style={{ color: Math.abs(c.avgOffline) < 4 ? COLORS.textMuted : familyColor(c.avgOffline > 0 ? "right" : "left") }}>
                  {fmtSigned1(c.avgOffline)}y
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Insights ---------------- */
function InsightsTab({ insights, sgProxy }) {
  const [showMethod, setShowMethod] = useState(false);

  if (!insights.length) {
    return (
      <div className="tab-pane">
        <div className="card" style={{ textAlign: "center", padding: "28px 16px" }}>
          <Flag size={22} color={COLORS.gold} style={{ marginBottom: 8 }} />
          <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 4 }}>Not enough data yet</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Log at least a few shots per club across a session or two, and focus areas will show up here — ranked biggest issue first.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-pane">
      <div className="section-sub" style={{ marginBottom: 10 }}>Ranked biggest issue first — work top to bottom</div>
      {insights.slice(0, 8).map((iss, i) => (
        <div className="insight-card" key={i}>
          <div className="insight-top">
            <span className="insight-rank">{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="insight-cat">{iss.category}</div>
              <div className="insight-headline">{iss.headline}</div>
            </div>
            <SeverityBadge severity={iss.severity} />
          </div>
          <div className="insight-detail">{iss.detail}</div>
          <div className="insight-drill"><strong>Try this:</strong> {iss.drill}</div>
        </div>
      ))}

      {sgProxy.length > 0 && (
        <div className="card" style={{ marginTop: 6 }}>
          <div className="card-title-row">
            <div className="card-title">Approx. strokes-gained proxy</div>
            <button className="info-btn" onClick={() => setShowMethod((v) => !v)}><Info size={14} /></button>
          </div>
          {showMethod && (
            <div className="method-note">
              This is a rough, illustrative proxy — not true Strokes Gained. It compares your lateral miss distance to a rough, publicly-known PGA Tour average proximity-to-target by distance, per shot, and converts the gap to an approximate stroke value. It ignores actual on-course outcomes, putting, and doesn't know your real target distance — treat it as directional, not authoritative.
            </div>
          )}
          <ResponsiveContainer width="100%" height={Math.max(120, sgProxy.length * 34)}>
            <BarChart data={sgProxy.map((s) => ({ name: clubDisplayName(s.club), val: Math.round(s.avgSg * 100) / 100 }))} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid stroke={COLORS.lineSoft} horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.textFaint, fontSize: 10 }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
              <ReferenceLine x={0} stroke={COLORS.line} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtSigned1(v), "Approx SG / shot"]} labelStyle={{ color: COLORS.text }} />
              <Bar dataKey="val" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {sgProxy.map((s, i) => <Cell key={i} fill={s.avgSg >= 0 ? COLORS.teal : COLORS.rust} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ---------------- Data management panel ---------------- */
function DataPanel({ onClose, onUpload, onExport, onImport, sessions, onDeleteSession, totalShots }) {
  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-title">Data</div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="panel-actions">
          <button className="btn-primary" onClick={onUpload}><Upload size={15} /> Upload session CSV</button>
          <div className="panel-actions-row">
            <button className="btn-secondary" onClick={onExport}><Download size={14} /> Export backup</button>
            <button className="btn-secondary" onClick={onImport}><Upload size={14} /> Import backup</button>
          </div>
        </div>

        <div className="panel-sub">{totalShots} total shots · {sessions.length} sessions</div>

        <div className="session-list">
          {sessions.map((s) => (
            <div className="session-row" key={s.id}>
              <div>
                <div className="session-date">{fmtDateTime(s.start)}</div>
                <div className="session-meta">{s.shots.length} shots · {Array.from(new Set(s.shots.map((sh) => clubDisplayName(sh.club)))).join(", ")}</div>
              </div>
              <button className="icon-btn danger" onClick={() => onDeleteSession(s.id)} aria-label="Delete session">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && <div className="panel-sub" style={{ padding: "16px 0" }}>No sessions yet.</div>}
        </div>
      </div>
    </div>
  );
}

function NoDataNote() {
  return <div className="card"><div className="card-title" style={{ marginBottom: 0 }}>No shots match this filter</div></div>;
}

const tooltipStyle = {
  background: COLORS.surfaceRaised,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  fontSize: 12,
  color: COLORS.text,
};

/* =========================================================================
   GLOBAL STYLE
   ========================================================================= */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

      * { box-sizing: border-box; }
      .app-shell {
        min-height: 100vh;
        background: radial-gradient(ellipse at 50% -10%, ${COLORS.bg}, ${COLORS.bgGrad} 70%);
        color: ${COLORS.text};
        font-family: 'Inter', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        max-width: 480px;
        margin: 0 auto;
        position: relative;
        padding-bottom: 64px;
      }
      .boot { padding: 40px 20px; color: ${COLORS.textMuted}; font-size: 14px; }

      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 18px 18px 14px; border-bottom: 1px solid ${COLORS.lineSoft};
      }
      .header-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.14em; color: ${COLORS.goldSoft}; margin-bottom: 2px; }
      .header-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 24px; letter-spacing: -0.01em; color: ${COLORS.text}; }
      .icon-btn {
        background: ${COLORS.surface}; border: 1px solid ${COLORS.line}; color: ${COLORS.text};
        width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      }
      .icon-btn.danger { border-color: ${COLORS.rustSoft}; color: ${COLORS.rust}; background: transparent; }
      .icon-btn:active { background: ${COLORS.surfaceHover}; }

      .main { flex: 1; padding: 14px 14px 8px; }
      .tab-pane { display: flex; flex-direction: column; gap: 12px; }

      .filter-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
      .chip-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
      .chip {
        flex: 0 0 auto; padding: 6px 12px; border-radius: 100px; border: 1px solid;
        font-size: 12.5px; font-weight: 500; white-space: nowrap; cursor: pointer;
      }

      .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .kpi-card { background: ${COLORS.surface}; border: 1px solid ${COLORS.lineSoft}; border-radius: 12px; padding: 12px 8px; text-align: center; }
      .kpi-num { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; color: ${COLORS.gold}; }
      .kpi-label { font-size: 10.5px; color: ${COLORS.textMuted}; margin-top: 2px; }

      .section-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${COLORS.textMuted}; }

      .card { background: ${COLORS.surface}; border: 1px solid ${COLORS.lineSoft}; border-radius: 14px; padding: 14px; }
      .card-title { font-size: 13px; font-weight: 600; color: ${COLORS.text}; margin-bottom: 8px; }
      .card-title-row { display: flex; align-items: center; justify-content: space-between; }
      .info-btn { background: none; border: none; color: ${COLORS.textFaint}; cursor: pointer; padding: 2px; }
      .method-note { font-size: 11.5px; color: ${COLORS.textMuted}; background: ${COLORS.bg}; border: 1px solid ${COLORS.lineSoft}; border-radius: 8px; padding: 8px 10px; margin: 6px 0 10px; line-height: 1.5; }

      .range-card { padding-bottom: 10px; }
      .legend-row { display: flex; gap: 14px; justify-content: center; margin-top: 4px; }
      .legend-dot { display: flex; align-items: center; gap: 5px; font-size: 11px; color: ${COLORS.textMuted}; }
      .legend-dot span { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      .stat-strip { display: flex; justify-content: space-around; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${COLORS.lineSoft}; }
      .stat-strip > div { display: flex; flex-direction: column; align-items: center; }
      .stat-num { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; color: ${COLORS.text}; }
      .stat-lbl { font-size: 10px; color: ${COLORS.textFaint}; margin-top: 2px; }

      .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .data-table th { text-align: left; font-size: 10.5px; color: ${COLORS.textFaint}; font-weight: 500; padding: 6px 14px; border-bottom: 1px solid ${COLORS.lineSoft}; }
      .data-table td { padding: 9px 14px; border-bottom: 1px solid ${COLORS.lineSoft}; color: ${COLORS.text}; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
      .data-table td:first-child { font-family: 'Inter', sans-serif; font-weight: 500; }
      .data-table tr:last-child td { border-bottom: none; }
      .muted { color: ${COLORS.textFaint}; }

      .bias-bar { display: flex; height: 10px; border-radius: 100px; overflow: hidden; margin-bottom: 10px; }
      .bias-legend { display: flex; justify-content: space-between; font-size: 11px; color: ${COLORS.textMuted}; flex-wrap: wrap; gap: 6px; }
      .bias-legend .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 4px; }

      .focus-callout {
        background: linear-gradient(135deg, ${COLORS.surfaceRaised}, ${COLORS.surface});
        border: 1px solid ${COLORS.goldSoft}; border-radius: 14px; padding: 14px; text-align: left; cursor: pointer;
      }
      .focus-callout-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.1em; color: ${COLORS.gold}; margin-bottom: 6px; }
      .focus-callout-title { font-size: 14px; font-weight: 600; color: ${COLORS.text}; line-height: 1.35; }
      .focus-callout-cta { display: flex; align-items: center; gap: 2px; font-size: 12px; color: ${COLORS.goldSoft}; margin-top: 8px; }

      .insight-card { background: ${COLORS.surface}; border: 1px solid ${COLORS.lineSoft}; border-radius: 14px; padding: 14px; }
      .insight-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
      .insight-rank {
        font-family: 'Fraunces', serif; font-weight: 600; font-size: 15px; color: ${COLORS.gold};
        background: ${COLORS.bg}; border: 1px solid ${COLORS.goldSoft}; border-radius: 8px;
        width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
      }
      .insight-cat { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: ${COLORS.textFaint}; margin-bottom: 2px; }
      .insight-headline { font-size: 14px; font-weight: 600; color: ${COLORS.text}; line-height: 1.3; }
      .insight-detail { font-size: 12.5px; color: ${COLORS.textMuted}; line-height: 1.5; margin-bottom: 8px; }
      .insight-drill { font-size: 12.5px; color: ${COLORS.text}; background: ${COLORS.bg}; border-radius: 8px; padding: 9px 10px; line-height: 1.5; }
      .insight-drill strong { color: ${COLORS.gold}; }
      .badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 100px; border: 1px solid; white-space: nowrap; }

      .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px; gap: 8px; }
      .empty-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; color: ${COLORS.text}; margin-top: 6px; }
      .empty-sub { font-size: 13px; color: ${COLORS.textMuted}; max-width: 260px; line-height: 1.5; margin-bottom: 10px; }

      .btn-primary {
        display: flex; align-items: center; justify-content: center; gap: 7px;
        background: ${COLORS.gold}; color: #101d16; border: none; border-radius: 10px;
        padding: 11px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; width: 100%;
      }
      .btn-secondary {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        background: transparent; color: ${COLORS.text}; border: 1px solid ${COLORS.line}; border-radius: 10px;
        padding: 9px 12px; font-size: 12.5px; font-weight: 500; cursor: pointer; flex: 1;
      }

      .tabbar {
        position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
        width: 100%; max-width: 480px; display: flex; justify-content: space-around;
        background: ${COLORS.surface}; border-top: 1px solid ${COLORS.lineSoft};
        padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
      }
      .tab-btn { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 4px 8px; }

      .panel-overlay { position: fixed; inset: 0; background: rgba(8,14,10,0.6); display: flex; align-items: flex-end; z-index: 50; }
      .panel {
        background: ${COLORS.surfaceRaised}; border-top: 1px solid ${COLORS.line}; border-radius: 18px 18px 0 0;
        width: 100%; max-width: 480px; margin: 0 auto; padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
        max-height: 78vh; overflow-y: auto;
      }
      .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
      .panel-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; }
      .panel-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
      .panel-actions-row { display: flex; gap: 8px; }
      .panel-sub { font-size: 11.5px; color: ${COLORS.textFaint}; margin-bottom: 8px; }
      .session-list { display: flex; flex-direction: column; gap: 6px; }
      .session-row { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${COLORS.surface}; border: 1px solid ${COLORS.lineSoft}; border-radius: 10px; }
      .session-date { font-size: 12.5px; font-weight: 500; color: ${COLORS.text}; }
      .session-meta { font-size: 11px; color: ${COLORS.textMuted}; margin-top: 2px; }

      .toast {
        position: fixed; bottom: 74px; left: 50%; transform: translateX(-50%);
        background: ${COLORS.surfaceRaised}; border: 1px solid ${COLORS.line}; border-radius: 10px;
        padding: 9px 14px; font-size: 12.5px; display: flex; align-items: center; gap: 7px;
        color: ${COLORS.text}; z-index: 60; max-width: 90%;
      }
      .toast.success { border-color: ${COLORS.teal}; }
      .toast.error { border-color: ${COLORS.rust}; }
    `}</style>
  );
}

const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);

