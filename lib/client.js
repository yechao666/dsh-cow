window.__ModuleLoader__.load({
  id: "dsh-cow",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client-src/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);
var h = React.createElement;
var stateUrl = () => new URL("api/cow/state", document.baseURI).toString();
var activityUrl = (limit = 100) => new URL(`api/cow/activity?limit=${limit}`, document.baseURI).toString();
var api = (path) => new URL(`api/cow/${path}`, document.baseURI).toString();
var S = {
  wrap: { padding: "0 0 24px", color: "var(--dsw-alias-label-primary)" },
  lead: { margin: "0 0 16px", fontSize: 12, color: "var(--dsw-alias-label-secondary)", lineHeight: 1.7 },
  card: { border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "var(--dsw-radius-md, 8px)", padding: "14px 16px", marginBottom: 12, background: "var(--dsw-alias-bg-l1)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 600 },
  formGrid: { display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", columnGap: 12, rowGap: 10, alignItems: "start" },
  formLabel: { fontSize: 12, color: "var(--dsw-alias-label-secondary)", paddingTop: 7, whiteSpace: "nowrap" },
  formValue: { display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0, flexWrap: "wrap" },
  inputFlex: { flex: "1 1 auto", minWidth: 120, boxSizing: "border-box", padding: "7px 10px", borderRadius: "var(--dsw-radius-sm, 6px)", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", fontSize: 12, outline: "none" },
  textarea: { flex: "1 1 auto", minWidth: 120, minHeight: 56, boxSizing: "border-box", padding: "7px 10px", borderRadius: "var(--dsw-radius-sm, 6px)", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", fontSize: 12, outline: "none", resize: "vertical" },
  button: { border: "1px solid var(--dsw-alias-button-primary-fill)", background: "var(--dsw-alias-button-primary-fill)", color: "var(--dsw-alias-label-primary-foreground)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  secondary: { border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)", lineHeight: 1.6 },
  meta: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" },
  err: { fontSize: 12, color: "var(--dsw-alias-label-error)" },
  ok: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
  row: { display: "flex", gap: 8, alignItems: "center", minWidth: 0, flexWrap: "wrap" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11 }
};
var SettingsBoundary = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return h(
        "div",
        { style: { padding: 16, color: "var(--dsw-alias-label-error)", fontSize: 12 } },
        `dsh-cow \u8BBE\u7F6E\u52A0\u8F7D\u5931\u8D25\uFF1A${this.state.error?.message || this.state.error}`
      );
    }
    return this.props.children;
  }
};
var ACTIVITY_KIND = {
  message: { label: "\u6D88\u606F", short: "\u6D88", color: "#4f8df7" },
  peer: { label: "\u8282\u70B9", short: "\u8282", color: "#34c38f" },
  file: { label: "\u6587\u4EF6", short: "\u6587", color: "#f59e0b" },
  question: { label: "\u8BE2\u95EE", short: "\u95EE", color: "#a78bfa" },
  answer: { label: "\u56DE\u7B54", short: "\u7B54", color: "#22d3ee" },
  error: { label: "\u9519\u8BEF", short: "\u9519", color: "#ef4444" },
  info: { label: "\u4FE1\u606F", short: "\u4FE1", color: "#8a8f9c" }
};
var PANEL = {
  page: {
    ...S.wrap,
    padding: "22px 24px 44px",
    height: "100%",
    overflowY: "auto",
    boxSizing: "border-box",
    background: "radial-gradient(900px 260px at 20% -80px, color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent), transparent 70%)"
  },
  header: { display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, var(--dsw-alias-brand-primary), color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, #7c5cff))",
    color: "#fff",
    boxShadow: "0 6px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent)"
  },
  title: { margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.25px" },
  subtitle: { ...S.hint, margin: "3px 0 0", fontSize: 12 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 10, marginBottom: 14 },
  card: { border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 12, padding: "14px 16px", background: "var(--dsw-alias-bg-l1)", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.035)", marginBottom: 12 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 650, letterSpacing: "-0.1px" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 12 },
  kvRow: { display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 10, fontSize: 12, lineHeight: 1.65, padding: "2px 0" },
  kvKey: { ...S.meta, fontSize: 11.5 },
  kvVal: { wordBreak: "break-all" },
  empty: { ...S.hint, padding: "18px 0", textAlign: "center", fontSize: 12 },
  chip: { display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 999, border: "1px solid var(--dsw-alias-border-l2)", fontSize: 10.5, fontWeight: 600 }
};
function PanelChip({ children, tone = "neutral" }) {
  const tones = {
    neutral: { ...PANEL.chip, color: "var(--dsw-alias-label-secondary)", background: "var(--dsw-alias-bg-l2)" },
    on: { ...PANEL.chip, color: "#2f855a", borderColor: "rgba(47, 133, 90, 0.3)", background: "rgba(47, 133, 90, 0.1)" },
    off: { ...PANEL.chip, color: "var(--dsw-alias-label-secondary)" },
    brand: { ...PANEL.chip, color: "var(--dsw-alias-brand-primary)", borderColor: "color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent)", background: "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)" }
  };
  return h("span", { style: tones[tone] ?? tones.neutral }, children);
}
function PanelKV({ rows }) {
  return h("div", { style: { display: "grid", gap: 1 } }, rows.map(([key, value]) => h(
    "div",
    { key, style: PANEL.kvRow },
    h("span", { style: PANEL.kvKey }, key),
    h("span", { style: PANEL.kvVal }, value ?? "-")
  )));
}
var PANEL_ACCENTS = [
  { main: "#4f8df7", soft: "rgba(79,141,247,0.14)", border: "rgba(79,141,247,0.32)" },
  { main: "#34c38f", soft: "rgba(52,195,143,0.14)", border: "rgba(52,195,143,0.30)" },
  { main: "#a78bfa", soft: "rgba(167,139,250,0.16)", border: "rgba(167,139,250,0.34)" },
  { main: "#f59e0b", soft: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.32)" },
  { main: "#f472b6", soft: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.30)" },
  { main: "#22d3ee", soft: "rgba(34,211,238,0.14)", border: "rgba(34,211,238,0.30)" }
];
function panelAccent(label = "") {
  let sum = 0;
  for (const char of String(label)) sum = (sum + char.codePointAt(0)) % 9973;
  return PANEL_ACCENTS[sum % PANEL_ACCENTS.length];
}
function PanelIcon({ name: name2, size = 15 }) {
  const paths = {
    cube: ["M12 3l7 4v10l-7 4-7-4V7l7-4z", "M12 3v14", "M5 7l7 4 7-4"],
    network: ["M12 5v5", "M7 19l5-5 5 5", "M12 10a2 2 0 100-4 2 2 0 000 4z", "M6 21a2 2 0 100-4 2 2 0 000 4z", "M18 21a2 2 0 100-4 2 2 0 000 4z"],
    users: ["M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2", "M9 11a4 4 0 100-8 4 4 0 000 8z", "M17 3a4 4 0 010 8", "M21 21v-2a4 4 0 00-3-3.87"],
    activity: ["M3 12h4l3-8 4 16 3-8h4"],
    alert: ["M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
    lock: ["M6 11V8a6 6 0 1112 0v3", "M5 11h14v10H5z"],
    clock: ["M12 8v4l3 2", "M21 12a9 9 0 11-18 0 9 9 0 0118 0z"]
  };
  return h(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    (paths[name2] ?? paths.cube).map((d) => h("path", { key: d, d }))
  );
}
function E2EChip({ compact = false, enabled = true }) {
  const color = enabled ? "#34c38f" : "var(--dsw-alias-label-secondary)";
  return h(
    "span",
    {
      title: enabled ? "AES-256-GCM \u7AEF\u5230\u7AEF\u52A0\u5BC6" : "\u672A\u542F\u7528\u7AEF\u5230\u7AEF\u52A0\u5BC6",
      style: {
        ...PANEL.chip,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color,
        borderColor: enabled ? "rgba(52,195,143,0.35)" : "var(--dsw-alias-border-l2)",
        background: enabled ? "rgba(52,195,143,0.10)" : "var(--dsw-alias-bg-l2)",
        whiteSpace: "nowrap"
      }
    },
    h(PanelIcon, { name: "lock", size: 10 }),
    h("span", null, enabled ? compact ? "E2E" : "E2E \u52A0\u5BC6" : "\u672A\u52A0\u5BC6")
  );
}
function StatCard({ label, value, sub, accent, icon }) {
  return h(
    "div",
    {
      style: {
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${accent.border}`,
        borderRadius: 12,
        padding: "11px 13px 10px",
        background: `linear-gradient(145deg, ${accent.soft}, var(--dsw-alias-bg-l1) 72%)`
      }
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
      h("span", { style: { ...S.meta, fontSize: 11, color: accent.main, fontWeight: 600 } }, label),
      h("span", { style: { width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", color: accent.main, background: accent.soft } }, h(PanelIcon, { name: icon }))
    ),
    h("div", { style: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.4px", marginTop: 2 } }, value),
    sub ? h("div", { style: { ...S.meta, fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, sub) : null
  );
}
function PanelDonut({ segments, size = 120, thickness = 14, centerValue, centerLabel }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let offset = 0;
  return h(
    "div",
    { style: { position: "relative", width: size, height: size, flex: "0 0 auto" } },
    h(
      "svg",
      { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { transform: "rotate(-90deg)" } },
      h("circle", { cx: size / 2, cy: size / 2, r: radius, fill: "none", stroke: "var(--dsw-alias-bg-l2)", strokeWidth: thickness }),
      total > 0 ? segments.map((item) => {
        const length = Number(item.value) / total * circumference;
        const dash = `${Math.max(0, length - 2)} ${circumference}`;
        const el = h("circle", {
          key: item.label,
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: "none",
          stroke: item.color,
          strokeWidth: thickness,
          strokeLinecap: "round",
          strokeDasharray: dash,
          strokeDashoffset: -offset
        });
        offset += length;
        return el;
      }) : null
    ),
    h(
      "div",
      { style: { position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", gap: 1 } },
      h("div", { style: { fontSize: 19, fontWeight: 700, lineHeight: 1.1 } }, centerValue),
      h("div", { style: { ...S.meta, fontSize: 10 } }, centerLabel)
    )
  );
}
function PanelBars({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return h(
    "div",
    { style: { display: "grid", gap: 8 } },
    rows.map((row) => h(
      "div",
      { key: row.label, style: { display: "grid", gap: 3 } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11.5 } },
        h(
          "span",
          { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
          h("span", { style: { width: 7, height: 7, borderRadius: 99, background: row.color } }),
          h("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, row.label)
        ),
        h("span", { style: { fontWeight: 650 } }, row.value)
      ),
      h(
        "div",
        { style: { height: 5, borderRadius: 99, background: "var(--dsw-alias-bg-l2)", overflow: "hidden" } },
        h("div", { style: { height: "100%", width: `${Math.round(row.value / max * 100)}%`, background: row.color, borderRadius: 99, opacity: row.value ? 1 : 0 } })
      )
    ))
  );
}
function roleSurface(role) {
  if (role === "self") {
    return { background: "color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-l1))", border: "color-mix(in srgb, var(--dsw-alias-brand-primary) 38%, var(--dsw-alias-border-l2))" };
  }
  if (role === "parent") {
    return { background: "color-mix(in srgb, #6366f1 5%, var(--dsw-alias-bg-l1))", border: "color-mix(in srgb, #6366f1 22%, var(--dsw-alias-border-l2))" };
  }
  return { background: "color-mix(in srgb, #14b8a6 4%, var(--dsw-alias-bg-l1))", border: "color-mix(in srgb, #14b8a6 20%, var(--dsw-alias-border-l2))" };
}
function CowActivityIcon({ size = 16 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.65,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M8.2 6.7C7.4 5.5 7.2 4.4 7.7 3.4c1.2.5 2.1 1.5 2.6 2.8" }),
    h("path", { d: "M15.8 6.7c.8-1.2 1-2.3.5-3.3-1.2.5-2.1 1.5-2.6 2.8" }),
    h("path", { d: "M5.2 10.8C3.8 10.6 2.8 10 2.3 9.1c1.1-.5 2.3-.5 3.4 0" }),
    h("path", { d: "M18.8 10.8c1.4-.2 2.4-.8 2.9-1.7-1.1-.5-2.3-.5-3.4 0" }),
    h("path", { d: "M6 11.2a6 6 0 0 1 12 0v2.4a6 6 0 0 1-12 0z" }),
    h("circle", { cx: 9.7, cy: 10.8, r: 0.95, fill: "currentColor", stroke: "none" }),
    h("circle", { cx: 14.3, cy: 10.8, r: 0.95, fill: "currentColor", stroke: "none" }),
    h("rect", { x: 9, y: 14.1, width: 6, height: 4.6, rx: 2.3 }),
    h("circle", { cx: 10.9, cy: 16.3, r: 0.58, fill: "currentColor", stroke: "none" }),
    h("circle", { cx: 13.1, cy: 16.3, r: 0.58, fill: "currentColor", stroke: "none" })
  );
}
function CowTopology({ state }) {
  const STORAGE_KEY = "dsh-cow:topology:v3";
  const NODE_W = 236;
  const [positions, setPositions] = React.useState(() => {
    try {
      if (typeof window === "undefined") return {};
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  });
  const [view, setView] = React.useState({ x: 0, y: 0, zoom: 0.9 });
  const drag = React.useRef(null);
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {
    }
  }, [positions]);
  React.useEffect(() => {
    const move = (event) => {
      const current = drag.current;
      if (!current) return;
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (current.kind === "pan") {
        setView((value) => ({ ...value, x: current.origin.x + dx, y: current.origin.y + dy }));
        return;
      }
      setPositions((value) => ({
        ...value,
        [current.key]: {
          x: Math.max(0, Math.min(current.bounds.width - NODE_W, current.origin.x + dx / current.zoom)),
          y: Math.max(0, Math.min(current.bounds.height - 90, current.origin.y + dy / current.zoom))
        }
      }));
    };
    const up = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);
  if (!state) return null;
  const instance = state.instance ?? {};
  const peers = state.peers ?? [];
  const parent = peers.find((peer) => peer.relation === "parent") ?? null;
  const children = peers.filter((peer) => peer.relation !== "parent");
  const gap = 28;
  const childTotalWidth = children.length ? children.length * NODE_W + (children.length - 1) * gap : NODE_W;
  const canvasWidth = Math.max(760, childTotalWidth + 80);
  const canvasHeight = 470;
  const childStartX = (canvasWidth - childTotalWidth) / 2;
  const defaults = {
    self: { x: (canvasWidth - NODE_W) / 2, y: 150 },
    ...parent ? { [`parent:${parent.label}`]: { x: (canvasWidth - NODE_W) / 2, y: 20 } } : {},
    ...Object.fromEntries(children.map((child, index) => [`child:${child.label}`, { x: childStartX + index * (NODE_W + gap), y: 340 }]))
  };
  const positionOf = (key) => positions[key] ?? defaults[key] ?? { x: 20, y: 20 };
  const startDrag = (event, key) => {
    event.stopPropagation();
    drag.current = {
      kind: "node",
      key,
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...positionOf(key) },
      zoom: view.zoom,
      bounds: { width: canvasWidth, height: canvasHeight }
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const startPan = (event) => {
    if (event.target?.closest?.("[data-node]")) return;
    drag.current = { kind: "pan", startX: event.clientX, startY: event.clientY, origin: { ...view } };
  };
  const resetLayout = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
    setPositions({});
    setView({ x: 0, y: 0, zoom: 0.9 });
  };
  const nodeCard = (key, label, meta, options = {}) => {
    const accent = panelAccent(label);
    const position = positionOf(key);
    const tone = roleSurface(options.self ? "self" : options.role ?? "child");
    return h(
      "div",
      {
        key,
        "data-node": "true",
        onPointerDown: (event) => startDrag(event, key),
        onDoubleClick: () => setPositions((value) => {
          const next = { ...value };
          delete next[key];
          return next;
        }),
        title: "\u62D6\u52A8\u8C03\u6574\u4F4D\u7F6E\uFF1B\u53CC\u51FB\u6062\u590D\u9ED8\u8BA4\u4F4D\u7F6E",
        style: {
          position: "absolute",
          left: position.x,
          top: position.y,
          width: NODE_W,
          border: `1px solid ${tone.border}`,
          borderRadius: 12,
          padding: "10px 12px",
          cursor: "grab",
          userSelect: "none",
          background: tone.background,
          boxShadow: options.self ? "0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent), 0 10px 24px rgba(0,0,0,0.10)" : "0 6px 18px rgba(0,0,0,0.06)",
          display: "grid",
          gap: 5
        }
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 } },
        h("span", { style: { width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: accent.main, fontSize: 11, fontWeight: 700, flex: "0 0 auto" } }, String(label || "?").slice(0, 1)),
        h("span", { style: { fontSize: 12.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, label || "\u672A\u547D\u540D\u8282\u70B9"),
        options.self ? h(PanelChip, { tone: "brand" }, "\u5F53\u524D") : null
      ),
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } },
        h("span", { style: { width: 6, height: 6, borderRadius: 99, background: options.connected ? "#34c38f" : "var(--dsw-alias-label-tertiary)" } }),
        h(PanelChip, { tone: options.connected ? "on" : "off" }, options.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"),
        meta.version ? h(PanelChip, null, `v${meta.version}`) : null,
        meta.encrypted ? h(E2EChip, { compact: true }) : null
      ),
      meta.note ? h("div", { style: { ...S.meta, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, meta.note) : null
    );
  };
  const edges = [];
  if (parent) {
    const from = positionOf(`parent:${parent.label}`);
    const to = positionOf("self");
    edges.push({ key: "p", d: `M ${from.x + NODE_W / 2} ${from.y + 78} C ${from.x + NODE_W / 2} ${from.y + 110}, ${to.x + NODE_W / 2} ${to.y - 30}, ${to.x + NODE_W / 2} ${to.y}` });
  }
  for (const child of children) {
    const from = positionOf("self");
    const to = positionOf(`child:${child.label}`);
    const fromX = from.x + NODE_W / 2;
    const toX = to.x + NODE_W / 2;
    edges.push({ key: child.label, d: `M ${fromX} ${from.y + 82} C ${fromX} ${from.y + 128}, ${toX} ${to.y - 48}, ${toX} ${to.y}` });
  }
  return h(
    "div",
    { style: { ...PANEL.card, background: "linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, var(--dsw-alias-bg-l1)), var(--dsw-alias-bg-l1))" } },
    h(
      "div",
      { style: PANEL.cardHead },
      h(
        "div",
        { style: { display: "grid", gap: 1 } },
        h("h3", { style: PANEL.cardTitle }, "\u8282\u70B9\u62D3\u6251"),
        h("span", { style: { ...S.meta, fontSize: 11 } }, "\u4E0A\u5C42\u4E0A\u7EA7\u3001\u4E2D\u5C42\u5F53\u524D\u3001\u4E0B\u5C42\u5B50\u8282\u70B9\uFF1B\u62D6\u52A8\u8282\u70B9\u8C03\u6574\uFF0C\u62D6\u7A7A\u767D\u5E73\u79FB")
      ),
      h(
        "div",
        { style: { display: "flex", gap: 6, alignItems: "center" } },
        h(PanelChip, { tone: "brand" }, `${children.filter((child) => child.connected).length}/${children.length} \u5B50\u8282\u70B9\u5728\u7EBF`),
        h("button", { type: "button", style: { ...S.secondary, height: 26, padding: "0 8px", fontSize: 11 }, onClick: () => setView((value) => ({ ...value, zoom: Math.min(1.5, value.zoom + 0.1) })) }, "+"),
        h("span", { style: { ...S.meta, minWidth: 34, textAlign: "center" } }, `${Math.round(view.zoom * 100)}%`),
        h("button", { type: "button", style: { ...S.secondary, height: 26, padding: "0 8px", fontSize: 11 }, onClick: () => setView((value) => ({ ...value, zoom: Math.max(0.6, value.zoom - 0.1) })) }, "\u2212"),
        h("button", { type: "button", style: { ...S.secondary, height: 26, padding: "0 8px", fontSize: 11 }, onClick: resetLayout }, "\u91CD\u7F6E\u5E03\u5C40")
      )
    ),
    h(
      "div",
      {
        onPointerDown: startPan,
        style: {
          position: "relative",
          height: 430,
          overflow: "hidden",
          borderRadius: 10,
          border: "1px solid var(--dsw-alias-border-l2)",
          backgroundImage: "radial-gradient(circle, var(--dsw-alias-border-l2) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          cursor: "grab",
          touchAction: "none"
        }
      },
      h(
        "div",
        { style: { position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, width: canvasWidth, height: canvasHeight } },
        h(
          "svg",
          { width: canvasWidth, height: canvasHeight, style: { position: "absolute", left: 0, top: 0, pointerEvents: "none" } },
          edges.map((edge) => h("path", { key: edge.key, d: edge.d, fill: "none", stroke: "var(--dsw-alias-brand-primary)", strokeWidth: 1.4, strokeOpacity: 0.35, strokeDasharray: "4 5" }))
        ),
        parent ? nodeCard(`parent:${parent.label}`, parent.label, { version: parent.version, encrypted: parent.encrypted, note: parent.description }, { connected: parent.connected, role: "parent" }) : null,
        nodeCard("self", instance.displayName || "\u672C\u673A", { version: instance.version, encrypted: (state.stats?.encrypted ?? 0) > 0, note: instance.endpoint }, { self: true, connected: true }),
        children.map((child) => nodeCard(`child:${child.label}`, child.label, { version: child.version, encrypted: child.encrypted, note: child.description }, { connected: child.connected, role: "child" })),
        !parent ? h("div", { style: { position: "absolute", left: (canvasWidth - 150) / 2, top: 18, ...PANEL.chip, color: "var(--dsw-alias-label-tertiary)", borderStyle: "dashed" } }, "\u65E0\u76F4\u63A5\u4E0A\u7EA7") : null,
        children.length === 0 ? h("div", { style: { position: "absolute", left: (canvasWidth - 150) / 2, top: 332, ...PANEL.chip, color: "var(--dsw-alias-label-tertiary)", borderStyle: "dashed" } }, "\u65E0\u76F4\u63A5\u4E0B\u7EA7") : null
      )
    )
  );
}
function CowActivityPanel() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [toolMessage, setToolMessage] = React.useState("");
  const [section, setSection] = React.useState("overview");
  const [activityFilter, setActivityFilter] = React.useState("all");
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activityResponse, stateResponse] = await Promise.all([
        fetch(activityUrl(200), { credentials: "same-origin" }),
        fetch(stateUrl(), { credentials: "same-origin" })
      ]);
      const activity = await activityResponse.json();
      const state2 = stateResponse.ok ? await stateResponse.json() : null;
      if (!activityResponse.ok) throw new Error(activity?.error?.message || `HTTP ${activityResponse.status}`);
      setData({ activity, state: state2 });
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 4e3);
    return () => clearInterval(timer);
  }, [load]);
  const runDoctor = async () => {
    setToolMessage("\u6B63\u5728\u751F\u6210\u8BCA\u65AD\u5305\u2026");
    try {
      const response = await fetch(api("doctor"), { credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setToolMessage(`\u8BCA\u65AD\u5305\uFF1A${payload?.path ?? ""}`);
    } catch (doctorError) {
      setError(doctorError.message);
      setToolMessage("");
    }
  };
  const state = data?.state ?? {};
  const instance = state.instance ?? {};
  const config = state.config ?? {};
  const peers = state.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== "parent");
  const parentPeer = peers.find((peer) => peer.relation === "parent") ?? null;
  const parent = state.parent ?? {};
  const stats = state.stats ?? {};
  const pending = state.pendingAsks ?? [];
  const items = data?.activity?.items ?? [];
  const connectedCount = stats.connected ?? peers.filter((peer) => peer.connected).length;
  const encryptedCount = stats.encrypted ?? peers.filter((peer) => peer.encrypted).length;
  const roleLabel = instance.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH";
  const endpoint = instance.endpoint ? `${String(instance.endpoint).replace(/^http/, "ws")}/channel` : "\u672A\u5C31\u7EEA";
  const parentVersion = parentPeer?.version || parent.node?.version || "";
  const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("zh-CN", { hour12: false });
  };
  const dateOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("zh-CN", { hour12: false });
  };
  const connectionOf = (label) => (state.connections ?? []).find((item) => item.peer === label) ?? null;
  const activityKind = (item) => ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info;
  const activityMatch = (item) => activityFilter === "all" || activityFilter === "message" && item.kind === "message" || activityFilter === "peer" && item.kind === "peer" || activityFilter === "file" && item.kind === "file";
  const visibleItems = items.filter(activityMatch);
  const activityKinds = ["message", "peer", "file", "info"].map((kind) => ({
    kind,
    label: ACTIVITY_KIND[kind].label,
    color: ACTIVITY_KIND[kind].color,
    value: items.filter((item) => (ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info) === ACTIVITY_KIND[kind]).length
  }));
  const tab = (key, label, count, icon) => {
    const active = section === key;
    return h(
      "button",
      {
        key,
        type: "button",
        onClick: () => setSection(key),
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          flex: "0 0 auto",
          border: "none",
          borderBottom: `2px solid ${active ? "var(--dsw-alias-brand-primary)" : "transparent"}`,
          background: "transparent",
          padding: "8px 1px 9px",
          marginBottom: -1,
          color: active ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: active ? 650 : 500
        }
      },
      h("span", { style: { display: "inline-flex", color: active ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-tertiary)" } }, h(PanelIcon, { name: icon, size: 13 })),
      h("span", null, label),
      count ? h("span", {
        style: {
          minWidth: 17,
          padding: "0 5px",
          height: 16,
          borderRadius: 999,
          display: "inline-grid",
          placeItems: "center",
          fontSize: 9.5,
          fontWeight: 650,
          color: active ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-secondary)",
          background: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)" : "var(--dsw-alias-bg-l2)"
        }
      }, count) : null
    );
  };
  const filterButton = (active, label, onClick) => h("button", {
    type: "button",
    onClick,
    style: {
      ...PANEL.chip,
      cursor: "pointer",
      fontSize: 11,
      color: active ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-secondary)",
      borderColor: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)" : "var(--dsw-alias-border-l2)",
      background: active ? "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)" : "transparent"
    }
  }, label);
  const nodeDetail = (peer, role = "child") => {
    const tone = roleSurface(role);
    const roleText = role === "parent" ? "\u4E0A\u7EA7\u8282\u70B9" : role === "self" ? "\u672C\u673A\u8282\u70B9" : "\u4E0B\u7EA7\u8282\u70B9";
    const conn = connectionOf(peer.label);
    const facts = [
      ["\u552F\u4E00\u6807\u8BC6", peer.uuid || peer.peerId || "", true],
      ["peerId", peer.peerId || "", true],
      ["\u8FDE\u63A5\u65B9\u5411", peer.direction === "out" ? "\u672C\u673A \u2192 \u5BF9\u7AEF" : peer.direction === "in" ? "\u5BF9\u7AEF \u2192 \u672C\u673A" : "", false],
      ["\u8FDE\u63A5\u65F6\u95F4", conn?.since ? dateOf(conn.since) : "", false],
      ["\u6700\u8FD1\u5FC3\u8DF3", conn?.lastSeenAt ? dateOf(conn.lastSeenAt) : "", false],
      ["\u52A0\u5BC6", peer.encrypted ? "AES-256-GCM" : "\u672A\u52A0\u5BC6", false]
    ].filter(([, value]) => value);
    return h(
      "div",
      { key: `${role}:${peer.label}`, style: { ...PANEL.card, padding: "12px 14px", marginBottom: 0, background: tone.background, borderColor: tone.border } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 } },
        h("span", { style: { width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: panelAccent(peer.label).main, fontSize: 12, fontWeight: 700, boxShadow: `0 4px 12px ${panelAccent(peer.label).border}` } }, String(peer.label || "?").slice(0, 1)),
        h("span", { style: { fontSize: 13, fontWeight: 650 } }, peer.label),
        h(PanelChip, { tone: peer.connected ? "on" : "off" }, peer.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"),
        peer.version ? h(PanelChip, null, `v${peer.version}`) : null,
        peer.encrypted ? h(E2EChip, { compact: true }) : null,
        h("span", { style: { ...S.meta, fontSize: 10.5, marginLeft: "auto" } }, roleText)
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "7px 14px" } },
        facts.map(([label, value, mono]) => h(
          "div",
          { key: label, style: { display: "grid", gap: 1, minWidth: 0 } },
          h("span", { style: { ...S.meta, fontSize: 10, letterSpacing: "0.2px" } }, label),
          h("span", { style: { fontSize: 11.5, lineHeight: 1.45, wordBreak: "break-all", ...mono ? { fontFamily: "var(--dsw-font-mono, ui-monospace, monospace)" } : {} } }, value)
        ))
      ),
      peer.description ? h("div", {
        style: {
          ...S.meta,
          marginTop: 9,
          paddingTop: 8,
          borderTop: "1px solid var(--dsw-alias-border-l2)",
          fontSize: 11,
          lineHeight: 1.55,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        },
        title: peer.description
      }, peer.description) : null
    );
  };
  const activityList = (limit) => visibleItems.length ? h(
    "div",
    { style: { position: "relative", paddingLeft: 16 } },
    h("div", { style: { position: "absolute", left: 6, top: 6, bottom: 6, width: 1, background: "var(--dsw-alias-border-l2)" } }),
    visibleItems.slice(0, limit).map((item) => {
      const kind = activityKind(item);
      return h(
        "div",
        { key: item.id, style: { display: "grid", gridTemplateColumns: "24px minmax(0, 1fr)", gap: 10, padding: "7px 0", position: "relative" } },
        h("span", {
          style: {
            position: "relative",
            zIndex: 1,
            width: 22,
            height: 22,
            borderRadius: 7,
            display: "grid",
            placeItems: "center",
            color: kind.color,
            background: "var(--dsw-alias-bg-l1)",
            border: `1px solid ${kind.color}55`,
            fontSize: 9.5,
            fontWeight: 700,
            marginLeft: -5
          }
        }, kind.short),
        h(
          "div",
          { style: { minWidth: 0, marginTop: 1 } },
          h("div", { style: { fontSize: 12.5, lineHeight: 1.5, wordBreak: "break-word" } }, item.text || "\uFF08\u65E0\u63CF\u8FF0\uFF09"),
          h(
            "div",
            { style: { ...S.meta, display: "flex", gap: 7, flexWrap: "wrap", fontSize: 10.5, marginTop: 2 } },
            h("span", { style: { color: kind.color, fontWeight: 600 } }, kind.label),
            h("span", null, timeOf(item.at)),
            item.from || item.to ? h("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, `${item.from || "?"} \u2192 ${item.to || "?"}`) : item.peer ? h("span", null, item.peer) : null,
            item.messageId ? h("span", { style: S.mono }, String(item.messageId).slice(-12)) : null,
            item.status ? h("span", null, item.status) : null
          )
        )
      );
    })
  ) : h("div", { style: PANEL.empty }, "\u6CA1\u6709\u7B26\u5408\u7B5B\u9009\u7684\u6D3B\u52A8");
  return h(
    "div",
    { style: PANEL.page },
    h(
      "div",
      { style: PANEL.header },
      h("div", { style: PANEL.logo }, h(CowActivityIcon, { size: 18 })),
      h(
        "div",
        { style: { display: "grid", gap: 1, minWidth: 0 } },
        h("h1", { style: PANEL.title }, "COW\u72B6\u6001"),
        h("p", { style: PANEL.subtitle }, `${instance.displayName || "\u672C\u673A"} \xB7 ${roleLabel} \xB7 \u6BCF 4 \u79D2\u81EA\u52A8\u5237\u65B0`)
      ),
      h(
        "div",
        { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" } },
        h(PanelChip, { tone: "on" }, `${connectedCount} \u8FDE\u63A5`),
        h(PanelChip, { tone: "brand" }, `${encryptedCount} \u52A0\u5BC6`),
        pending.length ? h(PanelChip, { tone: "brand", title: "\u7531\u88AB\u8BE2\u95EE\u8282\u70B9\u7684 Agent \u5904\u7406\uFF08\u53EF\u8BF7\u793A\u4E0A\u7EA7\u6216\u8BA9\u7528\u6237\u5728\u672C\u673A\u754C\u9762\u56DE\u7B54\uFF09" }, `${pending.length} \u8BE2\u95EE\u4E2D`) : null,
        h("button", { type: "button", style: { ...S.secondary, height: 28, padding: "0 10px", fontSize: 11.5 }, onClick: () => void runDoctor() }, "\u8BCA\u65AD\u5305"),
        h("button", { type: "button", style: { ...S.secondary, height: 28, padding: "0 10px", fontSize: 11.5 }, onClick: () => {
          void load();
        }, disabled: loading }, loading ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0")
      )
    ),
    error ? h("div", { style: { ...S.err, marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(197,48,48,0.08)" } }, `\u52A0\u8F7D\u5931\u8D25\uFF1A${error}`) : null,
    toolMessage ? h("div", { style: { ...S.meta, marginBottom: 10, wordBreak: "break-all" } }, toolMessage) : null,
    h(
      "div",
      { style: PANEL.statGrid },
      h(StatCard, { label: "\u672C\u673A\u7248\u672C", value: instance.version ? `v${instance.version}` : "-", sub: "dsh-cow", accent: PANEL_ACCENTS[0], icon: "cube" }),
      h(StatCard, { label: "\u5728\u7EBF\u8282\u70B9", value: `${connectedCount}/${peers.length}`, sub: `\u5171 ${peers.length} \u4E2A\u8282\u70B9`, accent: PANEL_ACCENTS[1], icon: "network" }),
      h(StatCard, { label: "\u5728\u7EBF\u5B50 DSH", value: children.filter((child) => child.connected).length, sub: `${children.length} \u4E2A\u76F4\u63A5\u4E0B\u7EA7`, accent: PANEL_ACCENTS[2], icon: "users" }),
      h(StatCard, { label: "\u8BE2\u95EE\u4E2D", value: pending.length, sub: "\u7531\u88AB\u8BE2\u95EE\u8282\u70B9 Agent \u5904\u7406", accent: PANEL_ACCENTS[3], icon: "alert" }),
      h(StatCard, { label: "\u52A0\u5BC6\u8FDE\u63A5", value: encryptedCount, sub: "AES-256-GCM", accent: PANEL_ACCENTS[4], icon: "lock" }),
      h(StatCard, { label: "\u6D3B\u52A8", value: items.length, sub: "\u6700\u8FD1 200 \u6761", accent: PANEL_ACCENTS[5], icon: "activity" })
    ),
    h(
      "div",
      { style: PANEL.grid2 },
      h(
        "div",
        { style: { ...PANEL.card, marginBottom: 0 } },
        h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u8282\u70B9\u8FDE\u63A5"), h(PanelChip, null, `${peers.length} \u4E2A`)),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" } },
          h(PanelDonut, {
            segments: [
              { label: "\u5728\u7EBF", value: connectedCount, color: "#34c38f" },
              { label: "\u79BB\u7EBF", value: Math.max(0, peers.length - connectedCount), color: "#64748b" }
            ],
            centerValue: `${connectedCount}/${peers.length}`,
            centerLabel: "\u5728\u7EBF"
          }),
          h(
            "div",
            { style: { display: "grid", gap: 7, flex: "1 1 130px" } },
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u5728\u7EBF"), h("b", { style: { color: "#34c38f" } }, connectedCount)),
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u79BB\u7EBF"), h("b", { style: { color: "#94a3b8" } }, Math.max(0, peers.length - connectedCount))),
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u5B50\u8282\u70B9"), h("b", null, children.length)),
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u4E0A\u7EA7"), h("b", { style: { color: parent.connected ? "#34c38f" : "#94a3b8" } }, parent.connected ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5"))
          )
        )
      ),
      h(
        "div",
        { style: { ...PANEL.card, marginBottom: 0 } },
        h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u6D3B\u52A8\u6784\u6210"), h(PanelChip, null, `${items.length} \u6761`)),
        h(PanelBars, { rows: activityKinds.map((row) => ({ label: row.label, value: row.value, color: row.color })) })
      )
    ),
    h(
      "div",
      { style: { display: "flex", gap: 20, marginBottom: 14, padding: 0, borderBottom: "1px solid var(--dsw-alias-border-l2)", width: "100%", maxWidth: "100%", overflowX: "auto" } },
      tab("overview", "\u6982\u89C8", null, "network"),
      tab("nodes", "\u8282\u70B9", peers.length, "users"),
      tab("activity", "\u6D3B\u52A8", items.length, "clock")
    ),
    section === "overview" ? h(
      React.Fragment,
      null,
      h(CowTopology, { state }),
      h(
        "div",
        { style: PANEL.grid2 },
        h(
          "div",
          { style: { ...PANEL.card, marginBottom: 0 } },
          h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u672C\u673A\u8282\u70B9"), h(E2EChip, { enabled: encryptedCount > 0 })),
          h(PanelKV, { rows: [
            ["\u552F\u4E00\u6807\u8BC6", h("span", { style: S.mono }, instance.uuid || instance.peerId || "-")],
            ["WebSocket", endpoint],
            ["\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55", config.allowedRoots || "-"],
            ["\u5B50\u4F1A\u8BDD preset", config.agentPreset || "profile \u9ED8\u8BA4"]
          ] })
        ),
        h(
          "div",
          { style: { ...PANEL.card, marginBottom: 0 } },
          h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u4F5C\u4E3A\u4E3B DSH"), h(PanelChip, { tone: children.some((child) => child.connected) ? "on" : "neutral" }, `${children.filter((child) => child.connected).length}/${children.length} \u5728\u7EBF`)),
          h(PanelKV, { rows: [
            ["\u76D1\u542C\u5730\u5740", `${config.listenHost || "127.0.0.1"}:${config.listenPort || "\u590D\u7528\u5BBF\u4E3B"}`],
            ["\u8FDE\u63A5\u5730\u5740", endpoint],
            ["\u8FDE\u63A5\u5BC6\u7801", state.passwordConfigured ? "\u5DF2\u8BBE\u7F6E" : "\u672A\u8BBE\u7F6E"],
            ["\u5B50\u8282\u70B9", `\u5386\u53F2 ${children.length} \u4E2A \xB7 \u5728\u7EBF ${children.filter((child) => child.connected).length} \u4E2A`]
          ] })
        ),
        h(
          "div",
          { style: { ...PANEL.card, marginBottom: 0 } },
          h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u4F5C\u4E3A\u5B50 DSH"), h(PanelChip, { tone: parent.connected ? "on" : "neutral" }, parent.connected ? "\u5DF2\u8FDE\u63A5\u4E0A\u7EA7" : "\u672A\u8FDE\u63A5\u4E0A\u7EA7")),
          h(PanelKV, { rows: [
            ["\u4E0A\u7EA7\u5730\u5740", parent.url || "\u65E0"],
            ["\u4E0A\u7EA7\u7248\u672C", parentVersion ? `v${parentVersion}` : "-"],
            ["\u8FDE\u63A5\u72B6\u6001", parent.connected ? "\u5DF2\u8FDE\u63A5\uFF08WebSocket\uFF09" : "\u672A\u8FDE\u63A5"],
            ["\u52A0\u5BC6", h(E2EChip, { compact: true, enabled: Boolean(parentPeer?.encrypted) })]
          ] })
        )
      )
    ) : null,
    section === "nodes" ? h(
      "div",
      { style: { display: "grid", gap: 12 } },
      h("div", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px" } }, "\u4E0A\u7EA7\u8282\u70B9"),
      parentPeer ? nodeDetail(parentPeer, "parent") : h("div", { style: PANEL.card }, h("div", { style: PANEL.empty }, "\u65E0\u76F4\u63A5\u4E0A\u7EA7")),
      h("div", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px", marginTop: 4 } }, "\u672C\u673A\u8282\u70B9"),
      nodeDetail({
        label: instance.displayName || "\u672C\u673A",
        connected: true,
        version: instance.version,
        uuid: instance.uuid,
        peerId: instance.peerId,
        encrypted: encryptedCount > 0,
        direction: "",
        description: instance.description || ""
      }, "self"),
      h("div", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px", marginTop: 4 } }, "\u5B50\u8282\u70B9"),
      children.length ? h("div", { style: { display: "grid", gap: 10 } }, children.map((child) => nodeDetail(child, "child"))) : h("div", { style: PANEL.card }, h("div", { style: PANEL.empty }, "\u5F53\u524D\u6CA1\u6709\u5B50 DSH"))
    ) : null,
    section === "activity" ? h(
      "div",
      { style: PANEL.card },
      h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u6D3B\u52A8\u65F6\u95F4\u7EBF"), h(PanelChip, null, `${visibleItems.length} \u6761`)),
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 } },
        filterButton(activityFilter === "all", "\u5168\u90E8", () => setActivityFilter("all")),
        filterButton(activityFilter === "message", "\u6D88\u606F", () => setActivityFilter("message")),
        filterButton(activityFilter === "peer", "\u8282\u70B9", () => setActivityFilter("peer")),
        filterButton(activityFilter === "file", "\u6587\u4EF6", () => setActivityFilter("file"))
      ),
      activityList(200)
    ) : null
  );
}
function field(label, control) {
  return h(
    "label",
    { key: label, style: { display: "grid", gap: 5, minWidth: 0 } },
    h("span", { style: { ...S.meta, fontSize: 11, fontWeight: 550 } }, label),
    control
  );
}
function CoCowSettingsPage() {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [advanced, setAdvanced] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [pwdInput, setPwdInput] = React.useState("");
  const [pwdConfigured, setPwdConfigured] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState("");
  const [parentPassword, setParentPassword] = React.useState("");
  const apply2 = React.useCallback((next) => {
    setData(next);
    setForm({
      displayName: next?.config?.displayName ?? "",
      capabilityNote: next?.config?.capabilityNote ?? "",
      allowedRoots: next?.config?.allowedRoots ?? "",
      listenHost: next?.config?.listenHost ?? "127.0.0.1",
      listenPort: next?.config?.listenPort ?? 0,
      maxFileMB: next?.config?.maxFileMB ?? 50,
      maxConcurrentFiles: next?.config?.maxConcurrentFiles ?? 4,
      agentPreset: next?.config?.agentPreset ?? ""
    });
  }, []);
  const load = React.useCallback(async () => {
    setBusy("load");
    setError("");
    try {
      const [pwd, parent, state] = await Promise.all([
        fetch(api("password"), { credentials: "same-origin" }).catch(() => null),
        fetch(api("parent"), { credentials: "same-origin" }).catch(() => null),
        fetch(stateUrl(), { credentials: "same-origin" })
      ]);
      if (pwd?.ok) {
        const body = await pwd.json().catch(() => null);
        setPwdConfigured(Boolean(body?.configured));
      }
      if (parent?.ok) {
        const body = await parent.json().catch(() => null);
        if (body?.url) setParentUrl(body.url);
        if (body?.password) setParentPassword(body.password);
      }
      const payload = await state.json();
      if (!state.ok) throw new Error(payload?.error?.message || `HTTP ${state.status}`);
      apply2(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusy("");
    }
  }, [apply2]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const saveSettings = async () => {
    if (busy) return;
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const response = await fetch(api("settings"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply2(payload);
      setMessage("\u5DF2\u4FDD\u5B58\u3002");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const savePassword = async () => {
    if (busy || !pwdInput) return;
    setBusy("password");
    setError("");
    setMessage("");
    try {
      const response = await fetch(api("password"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pwdInput })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setPwdConfigured(Boolean(payload?.configured));
      setPwdInput("");
      setMessage("\u8FDE\u63A5\u5BC6\u7801\u5DF2\u4FDD\u5B58\u3002");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const saveParent = async () => {
    if (busy) return;
    setBusy("parent");
    setError("");
    setMessage("");
    try {
      const response = await fetch(api("parent"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: parentUrl.trim(), password: parentPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setMessage(payload?.url ? "\u5DF2\u4FDD\u5B58\u4E0A\u7EA7\u5730\u5740\uFF0C\u6B63\u5728\u91CD\u8FDE\u3002" : "\u5DF2\u6E05\u9664\u4E0A\u7EA7\u5730\u5740\u3002");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  if (!data || !form) {
    return h("div", { style: S.wrap }, error ? h("div", { style: S.err }, error) : h("div", { style: S.hint }, "\u6B63\u5728\u8BFB\u53D6 dsh-cow \u72B6\u6001\u2026"));
  }
  const instance = data.instance ?? {};
  return h(
    "div",
    { style: S.wrap },
    h("p", { style: S.lead }, "dsh-cow \u8BA9\u591A\u53F0 DSH \u901A\u8FC7\u4E00\u6761 WebSocket \u957F\u8FDE\u63A5\u534F\u540C\uFF1A\u4E3B DSH \u6D3E\u6D88\u606F\uFF0C\u5B50 DSH \u56DE\u5408\u7ED3\u675F\u81EA\u52A8\u56DE\u62A5\uFF0Cask/answer \u56DE\u5230\u540C\u4E00\u4F1A\u8BDD\u3002\u8BE6\u7EC6\u72B6\u6001\u5728\u4FA7\u8FB9\u680F\u300CCOW\u72B6\u6001\u300D\u3002"),
    error ? h("div", { style: { ...S.err, marginBottom: 10 } }, error) : null,
    message ? h("div", { style: { ...S.ok, marginBottom: 10 } }, message) : null,
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u672C\u673A\u8282\u70B9"),
        h(
          "div",
          { style: S.row },
          h(PanelChip, { tone: instance.role === "member" ? "neutral" : "on" }, instance.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH"),
          h(PanelChip, null, `v${data.pluginVersion || instance.version || ""}`)
        )
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 } },
        field("\u8282\u70B9\u540D\u79F0", h("input", { style: S.inputFlex, value: form.displayName, placeholder: "\u7559\u7A7A\u7528\u8BA1\u7B97\u673A\u540D", onChange: (event) => update("displayName", event.target.value) })),
        field("\u5B50\u4F1A\u8BDD preset", h("input", { style: S.inputFlex, value: form.agentPreset, placeholder: "\u7559\u7A7A\u7528 profile \u9ED8\u8BA4", onChange: (event) => update("agentPreset", event.target.value) })),
        field("\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55", h("textarea", {
          style: { ...S.textarea, gridColumn: "1 / -1" },
          value: form.allowedRoots,
          placeholder: "\u6BCF\u884C\u4E00\u4E2A\u7EDD\u5BF9\u8DEF\u5F84",
          onChange: (event) => update("allowedRoots", event.target.value)
        }))
      ),
      h(
        "div",
        { style: { ...S.row, marginTop: 12, justifyContent: "space-between" } },
        h("button", { type: "button", style: S.secondary, onClick: () => setAdvanced((value) => !value) }, advanced ? "\u6536\u8D77\u9AD8\u7EA7\u8BBE\u7F6E" : "\u9AD8\u7EA7\u8BBE\u7F6E"),
        h("button", { type: "button", style: S.button, disabled: busy === "save", onClick: () => void saveSettings() }, busy === "save" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
      ),
      advanced ? h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--dsw-alias-border-l2)" } },
        field("\u76D1\u542C\u5730\u5740", h("input", { style: S.inputFlex, value: form.listenHost, onChange: (event) => update("listenHost", event.target.value) })),
        field("\u76D1\u542C\u7AEF\u53E3", h("input", { style: S.inputFlex, type: "number", min: 0, value: form.listenPort, onChange: (event) => update("listenPort", event.target.value) })),
        field("\u6587\u4EF6\u4E0A\u9650 MB", h("input", { style: S.inputFlex, type: "number", min: 1, max: 1024, value: form.maxFileMB, onChange: (event) => update("maxFileMB", event.target.value) })),
        field("\u5E76\u53D1\u4F20\u8F93", h("input", { style: S.inputFlex, type: "number", min: 1, max: 16, value: form.maxConcurrentFiles, onChange: (event) => update("maxConcurrentFiles", event.target.value) })),
        field("\u80FD\u529B\u8BF4\u660E", h("textarea", { style: S.textarea, value: form.capabilityNote, onChange: (event) => update("capabilityNote", event.target.value) }))
      ) : null
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u8FDE\u63A5\u5BC6\u7801"),
        h(PanelChip, { tone: pwdConfigured ? "on" : "off" }, pwdConfigured ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E")
      ),
      h(
        "div",
        { style: S.row },
        h("input", { style: S.inputFlex, type: "password", value: pwdInput, placeholder: "\u81F3\u5C11 12 \u4E2A\u5B57\u7B26", onChange: (event) => setPwdInput(event.target.value) }),
        h("button", { type: "button", style: S.button, disabled: busy === "password" || pwdInput.trim().length < 12, onClick: () => void savePassword() }, busy === "password" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
      ),
      h("div", { style: { ...S.hint, marginTop: 8 } }, "\u540C\u4E00\u5BC6\u7801\u7528\u4E8E\u6240\u6709\u5B50 DSH\uFF1B\u4FEE\u6539\u540E\u5DF2\u8FDE\u63A5\u7684\u8282\u70B9\u9700\u8981\u91CD\u65B0\u8FDE\u63A5\u3002")
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u4F5C\u4E3A\u5B50 DSH\uFF1A\u8FDE\u5230\u4E0A\u7EA7"),
        h(PanelChip, { tone: data.parent?.connected ? "on" : "off" }, data.parent?.connected ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5")
      ),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 } },
        field("\u4E0A\u7EA7\u5730\u5740", h("input", { style: S.inputFlex, value: parentUrl, placeholder: "ws://192.168.1.10:59999/cow/v1/channel", onChange: (event) => setParentUrl(event.target.value) })),
        field("\u5171\u7528\u5BC6\u7801", h("input", { style: S.inputFlex, type: "password", value: parentPassword, onChange: (event) => setParentPassword(event.target.value) }))
      ),
      h(
        "div",
        { style: { ...S.row, marginTop: 12 } },
        h("button", { type: "button", style: S.button, disabled: busy === "parent", onClick: () => void saveParent() }, busy === "parent" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u5E76\u91CD\u8FDE")
      )
    ),
    h("div", { style: S.hint }, "\u7EAF\u6D88\u606F\u67B6\u6784\uFF1A\u6D88\u606F\u76F4\u63A5\u8FDB\u5165\u5BF9\u65B9\u4F1A\u8BDD\u8F93\u5165\u961F\u5217\uFF0C\u4E0D\u5EFA\u4EFB\u52A1\u3001\u4E0D\u8F6E\u8BE2\u3002")
  );
}
var name = "dsh-cow-client";
var inject = ["slots", "sidebarRightTabs", "sidebarRight"];
var COW_RIGHT_KIND = "cow-status";
var COW_RIGHT_ID = "dsh-cow/status";
function CowRightStatus() {
  return h(CowActivityPanel, null);
}
function CowStatusIcon() {
  return h(CowActivityIcon, { size: 16 });
}
function apply(ctx) {
  try {
    const registerTab = () => ctx.sidebarRightTabs.register({
      id: COW_RIGHT_ID,
      kind: COW_RIGHT_KIND,
      title: () => "COW\u72B6\u6001",
      guide: [{ order: 5, title: () => "COW\u72B6\u6001", description: () => "\u8282\u70B9\u62D3\u6251\u3001\u8FDE\u63A5\u660E\u7EC6\u4E0E\u6D3B\u52A8\u65F6\u95F4\u7EBF" }]
    });
    if (typeof ctx.effect === "function") ctx.effect(registerTab, "dsh-cow: right status tab");
    else registerTab();
  } catch (error) {
    console.error("[dsh-cow] right tab type failed", error);
  }
  try {
    ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: COW_RIGHT_ID
    }, CowRightStatus));
    ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
      name: "sidebar.right.pane.tab.title",
      key: COW_RIGHT_ID
    }, () => h("span", null, "COW\u72B6\u6001")));
  } catch (error) {
    console.error("[dsh-cow] right tab body failed", error);
  }
  try {
    ctx.slots.inject("main", () => ctx.slots.register({
      name: "main",
      key: "cow-activity"
    }, CowActivityPanel));
  } catch {
  }
  try {
    ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
      name: "sidebar.panellist",
      id: "cow-activity",
      order: 20,
      label: "COW\u72B6\u6001"
    }, CowStatusIcon));
  } catch {
  }
  try {
    ctx.slots.inject("settings.section", () => {
      const unregister = ctx.slots.register(
        { name: "settings.section", id: "dsh-cow", order: 23, label: () => "COW\u534F\u540C", inject: () => ({}) },
        () => h(SettingsBoundary, null, h(CoCowSettingsPage))
      );
      return () => unregister();
    });
  } catch (error) {
    console.error("[dsh-cow] settings slot failed", error);
  }
}

    return module.exports;
  }
});
