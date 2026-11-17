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
  tabs: { display: "flex", gap: 20, margin: "2px 0 14px", width: "100%", boxSizing: "border-box", borderBottom: "1px solid var(--dsw-alias-border-l2)" },
  tab: { border: 0, padding: "8px 2px 9px", marginBottom: -1, background: "transparent", borderBottom: "2px solid transparent", color: "var(--dsw-alias-label-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  tabActive: { border: 0, padding: "8px 2px 9px", marginBottom: -1, background: "transparent", borderBottom: "2px solid var(--dsw-alias-brand-primary)", color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
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
  danger: { border: "1px solid color-mix(in srgb, var(--dsw-alias-label-error) 30%, transparent)", background: "transparent", color: "var(--dsw-alias-label-error)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  badge: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", border: "1px solid var(--dsw-alias-border-l2)" },
  badgeOn: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "rgba(52,199,89,.14)", color: "#2ea043", border: "1px solid rgba(52,199,89,.35)" },
  badgeOff: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-secondary)", border: "1px solid var(--dsw-alias-border-l2)" },
  code: { flex: "1 1 auto", minWidth: 120, padding: "7px 10px", borderRadius: "var(--dsw-radius-sm, 6px)", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5, wordBreak: "break-all" },
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
var PROXY_EVENT = {
  auth_ok: { label: "\u8BA4\u8BC1\u901A\u8FC7", level: "info" },
  auth_failed: { label: "\u8BA4\u8BC1\u5931\u8D25", level: "warn" },
  connected: { label: "\u5DF2\u8FDE\u63A5\u76EE\u6807", level: "info" },
  closed: { label: "\u8FDE\u63A5\u7ED3\u675F", level: "info" },
  denied: { label: "\u7B56\u7565\u62D2\u7EDD", level: "warn" },
  target_error: { label: "\u76EE\u6807\u9519\u8BEF", level: "error" },
  tunnel_open: { label: "\u6253\u5F00\u96A7\u9053", level: "info" },
  tunnel_failed: { label: "\u96A7\u9053\u5931\u8D25", level: "warn" },
  listening: { label: "\u4EE3\u7406\u76D1\u542C", level: "info" },
  stopped: { label: "\u4EE3\u7406\u505C\u6B62", level: "info" },
  runtime_started: { label: "\u4EE3\u7406\u542F\u52A8", level: "info" },
  runtime_stopped: { label: "\u4EE3\u7406\u505C\u6B62", level: "info" },
  runtime_failed: { label: "\u4EE3\u7406\u542F\u52A8\u5931\u8D25", level: "error" },
  dispatcher_active: { label: "DSH \u7F51\u7EDC\u5DF2\u63A5\u5165", level: "info" },
  dispatcher_restart_required: { label: "\u9700\u8981\u91CD\u542F\u5B50 DSH", level: "warn" }
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
    clock: ["M12 8v4l3 2", "M21 12a9 9 0 11-18 0 9 9 0 0118 0z"],
    sliders: ["M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3", "M1 14h6", "M9 8h6", "M17 16h6"]
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
    ...parent ? { [`parent:${parent.peerName}`]: { x: (canvasWidth - NODE_W) / 2, y: 20 } } : {},
    ...Object.fromEntries(children.map((child, index) => [`child:${child.peerName}`, { x: childStartX + index * (NODE_W + gap), y: 340 }]))
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
    const from = positionOf(`parent:${parent.peerName}`);
    const to = positionOf("self");
    edges.push({ key: "p", d: `M ${from.x + NODE_W / 2} ${from.y + 78} C ${from.x + NODE_W / 2} ${from.y + 110}, ${to.x + NODE_W / 2} ${to.y - 30}, ${to.x + NODE_W / 2} ${to.y}` });
  }
  for (const child of children) {
    const from = positionOf("self");
    const to = positionOf(`child:${child.peerName}`);
    const fromX = from.x + NODE_W / 2;
    const toX = to.x + NODE_W / 2;
    edges.push({ key: child.peerName, d: `M ${fromX} ${from.y + 82} C ${fromX} ${from.y + 128}, ${toX} ${to.y - 48}, ${toX} ${to.y}` });
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
        parent ? nodeCard(`parent:${parent.peerName}`, parent.peerName, { version: parent.version, encrypted: parent.encrypted, note: parent.description }, { connected: parent.connected, role: "parent" }) : null,
        nodeCard("self", instance.displayName || "\u672C\u673A", { version: instance.version, encrypted: (state.stats?.encrypted ?? 0) > 0, note: instance.endpoint }, { self: true, connected: true }),
        children.map((child) => nodeCard(`child:${child.peerName}`, child.peerName, { version: child.version, encrypted: child.encrypted, note: child.description }, { connected: child.connected, role: "child" })),
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
  const installedVersion = String(state.installedVersion || instance.installedVersion || instance.version || "");
  const runningVersion = String(instance.version || "");
  const versionMismatch = Boolean(installedVersion && runningVersion && installedVersion !== runningVersion);
  const config = state.config ?? {};
  const peers = state.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== "parent");
  const parentPeer = peers.find((peer) => peer.relation === "parent") ?? null;
  const parent = state.parent ?? {};
  const stats = state.stats ?? {};
  const proxy = state.proxy ?? {};
  const proxyLogs = Array.isArray(proxy.logs) ? proxy.logs : [];
  const proxyIsMember = instance.role === "member";
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
  const connectionOf = (label) => (state.connections ?? []).find((item) => item.peerName === label) ?? null;
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
    const conn = connectionOf(peer.peerName);
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
      { key: `${role}:${peer.peerName}`, style: { ...PANEL.card, padding: "12px 14px", marginBottom: 0, background: tone.background, borderColor: tone.border } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 } },
        h("span", { style: { width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: panelAccent(peer.peerName).main, fontSize: 12, fontWeight: 700, boxShadow: `0 4px 12px ${panelAccent(peer.peerName).border}` } }, String(peer.peerName || "?").slice(0, 1)),
        h("span", { style: { fontSize: 13, fontWeight: 650 } }, peer.peerName),
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
            item.from || item.to ? h("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, `${item.from || "?"} \u2192 ${item.to || "?"}`) : item.peerName ? h("span", null, item.peerName) : null,
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
      h(StatCard, {
        label: "\u672C\u673A\u7248\u672C",
        value: instance.version ? h("a", {
          href: api("package"),
          download: `dsh-cow-${installedVersion || instance.version}.tgz`,
          title: versionMismatch ? `\u4E0B\u8F7D\u5DF2\u5B89\u88C5\u7684 dsh-cow ${installedVersion} \u63D2\u4EF6\u5305\uFF08\u8FD0\u884C\u4E2D\u4ECD\u662F ${runningVersion}\uFF09` : "\u4E0B\u8F7D\u672C\u673A dsh-cow \u63D2\u4EF6\u5305",
          "aria-label": `\u4E0B\u8F7D dsh-cow ${installedVersion || instance.version} \u63D2\u4EF6\u5305`,
          style: { color: "inherit", textDecoration: "underline", textDecorationThickness: "1px", textUnderlineOffset: 3, cursor: "pointer" }
        }, `v${instance.version}`) : "-",
        sub: versionMismatch ? `\u5DF2\u5B89\u88C5 v${installedVersion} \xB7 \u91CD\u542F\u540E\u751F\u6548 \xB7 \u70B9\u51FB\u4E0B\u8F7D` : "dsh-cow \xB7 \u70B9\u51FB\u4E0B\u8F7D\u63D2\u4EF6\u5305",
        accent: PANEL_ACCENTS[0],
        icon: "cube"
      }),
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
      tab("activity", "\u6D3B\u52A8", items.length, "clock"),
      tab("proxy", "\u4EE3\u7406", proxyLogs.length || null, "network"),
      tab("settings", "\u914D\u7F6E", null, "sliders")
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
    ) : null,
    section === "proxy" ? h(
      "div",
      { style: { display: "grid", gap: 12 } },
      h(
        "div",
        { style: PANEL.card },
        h(
          "div",
          { style: PANEL.cardHead },
          h("h3", { style: PANEL.cardTitle }, "\u7F51\u7EDC\u4EE3\u7406"),
          h(
            "div",
            { style: S.row },
            proxyIsMember ? h(PanelChip, { tone: proxy.mode === "active" ? "on" : proxy.mode === "error" ? "off" : "neutral" }, proxy.mode === "active" ? "\u901A\u8FC7\u4E3B DSH \u5DF2\u751F\u6548" : proxy.mode === "restart" ? "\u9700\u8981\u91CD\u542F\u5B50 DSH" : proxy.mode === "error" ? "\u542F\u52A8\u5931\u8D25" : "\u672A\u5F00\u542F") : h(PanelChip, { tone: proxy.gateway?.enabled ? "on" : "off" }, proxy.gateway?.enabled ? "\u51FA\u53E3\u5DF2\u5F00\u542F" : "\u51FA\u53E3\u672A\u5F00\u542F"),
            h(PanelChip, null, `${proxyLogs.length}/${proxy.logLimit ?? 50} \u6761\u65E5\u5FD7`)
          )
        ),
        h(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 } },
          h("div", { style: { display: "grid", gap: 2 } }, h("span", { style: S.hint }, proxyIsMember ? "\u672C\u5730\u4EE3\u7406\u7AEF\u53E3" : "\u51FA\u53E3\u7AEF\u70B9"), h("b", { style: { fontSize: 18, fontFamily: "var(--dsw-font-mono, ui-monospace, monospace)" } }, proxyIsMember ? proxy.local?.running ? proxy.local.port : "-" : instance.endpoint ? "\u540C\u7AEF\u53E3 /cow/v1/net" : "-")),
          h("div", { style: { display: "grid", gap: 2 } }, h("span", { style: S.hint }, "\u6D3B\u52A8\u8FDE\u63A5"), h("b", { style: { fontSize: 18 } }, proxyIsMember ? proxy.local?.active ?? 0 : proxy.gateway?.connections ?? 0)),
          h("div", { style: { display: "grid", gap: 2 } }, h("span", { style: S.hint }, "\u6210\u529F / \u5931\u8D25"), h("b", { style: { fontSize: 18 } }, proxyIsMember ? `${proxy.local?.opened ?? 0} / ${proxy.local?.failed ?? 0}` : `${proxy.logs?.filter((item) => item.event === "connected").length ?? 0} / ${proxy.logs?.filter((item) => item.event === "denied").length ?? 0}`)),
          h("div", { style: { display: "grid", gap: 2 } }, h("span", { style: S.hint }, proxyIsMember ? "\u4E0A\u7EA7\u8FDE\u63A5" : "\u5728\u7EBF\u5B50\u8282\u70B9"), h("b", { style: { fontSize: 18, color: proxyIsMember ? proxy.parentConnected ? "#34c38f" : "var(--dsw-alias-label-secondary)" : "#34c38f" } }, proxyIsMember ? proxy.parentConnected ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5" : `${children.filter((child) => child.connected).length} \u4E2A`))
        ),
        proxy.error ? h("div", { style: { ...S.err, marginTop: 10 } }, proxy.error) : null,
        h("div", { style: { ...S.hint, marginTop: 10 } }, proxyIsMember ? "DSH \u539F\u751F fetch\u3001web_search\u3001web_fetch\u3001MCP\uFF0C\u4EE5\u53CA\u7EE7\u627F\u4EE3\u7406\u73AF\u5883\u53D8\u91CF\u7684 curl/git/npm \u8D70\u8FD9\u91CC\u3002" : "\u53EA\u63A5\u53D7\u76F4\u63A5\u5B50\u8282\u70B9\uFF1B\u9ED8\u8BA4\u53EA\u653E\u884C\u516C\u7F51 80/443\uFF0C\u79C1\u7F51/\u73AF\u56DE\u5728\u7B56\u7565\u5C42\u62D2\u7EDD\u3002")
      ),
      h(
        "div",
        { style: PANEL.card },
        h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u4EE3\u7406\u5DE5\u4F5C\u65E5\u5FD7"), h("span", { style: S.hint }, `\u4FDD\u7559\u6700\u8FD1 ${proxy.logLimit ?? 50} \u6761`)),
        proxyLogs.length ? h(
          "div",
          { style: { display: "grid", gap: 0, maxHeight: 300, overflowY: "auto" } },
          proxyLogs.slice().reverse().map((entry, index) => {
            const meta = PROXY_EVENT[entry.event] ?? { label: entry.event, level: entry.level };
            const level = meta.level ?? entry.level ?? "info";
            const color = level === "error" ? "#ef4444" : level === "warn" ? "#f59e0b" : "#34c38f";
            const detail = [
              entry.peerName || entry.peerId || "",
              entry.host ? `${entry.host}${entry.port ? `:${entry.port}` : ""}` : "",
              entry.bytes ? `${Math.round(entry.bytes / 1024)} KB` : "",
              entry.ms ? `${entry.ms} ms` : ""
            ].filter(Boolean).join(" \xB7 ");
            return h(
              "div",
              { key: `${entry.at}:${entry.event}:${index}`, style: { display: "grid", gridTemplateColumns: "52px 8px minmax(0, 1fr)", gap: 9, alignItems: "start", padding: "6px 0", borderTop: index ? "1px solid var(--dsw-alias-border-l2)" : "none" } },
              h("span", { style: { ...S.mono, paddingTop: 2 } }, timeOf(entry.at)),
              h("span", { style: { width: 6, height: 6, marginTop: 5, borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}55` } }),
              h(
                "div",
                { style: { minWidth: 0 } },
                h("div", { style: { fontSize: 11.5, fontWeight: 600 } }, meta.label, detail ? h("span", { style: { ...S.meta, fontWeight: 400 } }, ` \xB7 ${detail}`) : null),
                entry.message ? h("div", { style: { ...S.meta, marginTop: 2, wordBreak: "break-all" } }, String(entry.message).slice(0, 180)) : null
              )
            );
          })
        ) : h("div", { style: PANEL.empty }, "\u6682\u65E0\u4EE3\u7406\u65E5\u5FD7")
      )
    ) : null,
    section === "settings" ? h(SettingsBoundary, null, h(CoCowSettingsPage, { embedded: true })) : null
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
function CoCowSettingsPage({ embedded = false } = {}) {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [savedForm, setSavedForm] = React.useState(null);
  const [tab, setTab] = React.useState("node");
  const [advanced, setAdvanced] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [pwdInput, setPwdInput] = React.useState("");
  const [pwdConfigured, setPwdConfigured] = React.useState(false);
  const [showPwd, setShowPwd] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState("");
  const [parentPassword, setParentPassword] = React.useState("");
  const [savedParent, setSavedParent] = React.useState({ url: "", password: "" });
  const [showParentPwd, setShowParentPwd] = React.useState(false);
  const makeForm = (next) => ({
    displayName: next?.config?.displayName ?? "",
    capabilityNote: next?.config?.capabilityNote ?? "",
    allowedRoots: next?.config?.allowedRoots ?? "",
    listenHost: next?.config?.listenHost ?? "127.0.0.1",
    listenPort: next?.config?.listenPort ?? 0,
    maxFileMB: next?.config?.maxFileMB ?? 50,
    maxConcurrentFiles: next?.config?.maxConcurrentFiles ?? 4,
    agentPreset: next?.config?.agentPreset ?? "",
    proxyEnabled: Boolean(next?.config?.proxyEnabled),
    proxyAllowHosts: next?.config?.proxyAllowHosts ?? "",
    proxyAllowPrivate: Boolean(next?.config?.proxyAllowPrivate),
    proxyViaParent: Boolean(next?.config?.proxyViaParent),
    proxyLogLimit: next?.config?.proxyLogLimit ?? 50
  });
  const apply2 = React.useCallback((next) => {
    const built = makeForm(next);
    setData(next);
    setForm(built);
    setSavedForm(built);
  }, []);
  const load = React.useCallback(async () => {
    setBusy("load");
    setError("");
    try {
      const [pwd, parent2, state] = await Promise.all([
        fetch(api("password"), { credentials: "same-origin" }).catch(() => null),
        fetch(api("parent"), { credentials: "same-origin" }).catch(() => null),
        fetch(stateUrl(), { credentials: "same-origin" })
      ]);
      if (pwd?.ok) {
        const body = await pwd.json().catch(() => null);
        setPwdConfigured(Boolean(body?.configured));
      }
      if (parent2?.ok) {
        const body = await parent2.json().catch(() => null);
        const nextParent = { url: String(body?.url ?? ""), password: String(body?.password ?? "") };
        setParentUrl(nextParent.url);
        setParentPassword(nextParent.password);
        setSavedParent(nextParent);
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
  React.useEffect(() => {
    if (!message) return void 0;
    const timer = setTimeout(() => setMessage(""), 4e3);
    return () => clearTimeout(timer);
  }, [message]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const dirty = Boolean(form && savedForm && JSON.stringify(form) !== JSON.stringify(savedForm));
  const parentDirty = parentUrl.trim() !== savedParent.url.trim() || parentPassword !== savedParent.password;
  const saveSettings = async () => {
    if (busy || !dirty) return;
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
      window.dispatchEvent(new Event("dsh-cow:state-changed"));
      setMessage("\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\u3002");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const savePassword = async () => {
    if (busy || pwdInput.length < 12) return;
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
      setShowPwd(false);
      window.dispatchEvent(new Event("dsh-cow:state-changed"));
      setMessage("\u8FDE\u63A5\u5BC6\u7801\u5DF2\u4FDD\u5B58\uFF1B\u5DF2\u8FDE\u63A5\u7684\u5B50\u8282\u70B9\u9700\u8981\u7528\u65B0\u5BC6\u7801\u91CD\u8FDE\u3002");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const saveParent = async () => {
    if (busy || !parentDirty) return;
    const url = parentUrl.trim();
    if (url && !/^(https?|wss?):\/\//i.test(url)) {
      setError("\u4E0A\u7EA7\u5730\u5740\u5FC5\u987B\u662F ws(s):// \u6216 http(s):// URL");
      return;
    }
    setBusy("parent");
    setError("");
    setMessage("");
    try {
      const response = await fetch(api("parent"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, password: parentPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setSavedParent({ url, password: parentPassword });
      window.dispatchEvent(new Event("dsh-cow:state-changed"));
      setMessage(url ? "\u4E0A\u7EA7\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u6B63\u5728\u5EFA\u7ACB\u957F\u8FDE\u63A5\u3002" : "\u5DF2\u6E05\u9664\u4E0A\u7EA7\u914D\u7F6E\u3002");
      setTimeout(() => {
        void load();
      }, 700);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const clearParent = async () => {
    if (busy) return;
    if (!window.confirm("\u6E05\u9664\u4E0A\u7EA7\u5730\u5740\u548C\u5BC6\u7801\uFF1F")) return;
    setBusy("parent");
    setError("");
    setMessage("");
    try {
      const response = await fetch(api("parent"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "", password: "" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setParentUrl("");
      setParentPassword("");
      setSavedParent({ url: "", password: "" });
      window.dispatchEvent(new Event("dsh-cow:state-changed"));
      setMessage("\u5DF2\u6E05\u9664\u4E0A\u7EA7\u914D\u7F6E\u3002");
      setTimeout(() => {
        void load();
      }, 500);
    } catch (clearError) {
      setError(clearError.message);
    } finally {
      setBusy("");
    }
  };
  const generatePassword = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const key = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setPwdInput(key);
    setShowPwd(true);
    setMessage("\u5DF2\u751F\u6210\u968F\u673A\u5BC6\u94A5\uFF0C\u4FDD\u5B58\u540E\u751F\u6548\u3002");
  };
  const copyAddress = async () => {
    const endpoint = String(data?.instance?.endpoint ?? "");
    const wsUrl2 = endpoint ? `${endpoint.replace(/^http/, "ws").replace(/\/$/, "")}/channel` : "";
    if (!wsUrl2) {
      setError("\u8FDE\u63A5\u5730\u5740\u8FD8\u6CA1\u5C31\u7EEA");
      return;
    }
    try {
      await navigator.clipboard.writeText(wsUrl2);
      setMessage("\u8FDE\u63A5\u5730\u5740\u5DF2\u590D\u5236\u3002");
    } catch {
      setError("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u8FDE\u63A5\u5730\u5740");
    }
  };
  if (!data || !form) {
    return h("div", { style: S.wrap }, error ? h("div", { style: S.err }, error) : h("div", { style: S.hint }, "\u6B63\u5728\u8BFB\u53D6 dsh-cow \u72B6\u6001\u2026"));
  }
  const instance = data.instance ?? {};
  const runningVersion = String(data.pluginVersion || instance.version || "");
  const installedVersion = String(data.installedVersion || instance.installedVersion || runningVersion);
  const versionMismatch = Boolean(installedVersion && runningVersion && installedVersion !== runningVersion);
  const parent = data.parent ?? {};
  const parentNode = parent.node ?? null;
  const wsUrl = instance.endpoint ? `${String(instance.endpoint).replace(/^http/, "ws").replace(/\/$/, "")}/channel` : "";
  const statusLine = error ? h("div", { style: { ...S.err, marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(197,48,48,0.08)" } }, error) : message ? h("div", { style: { ...S.ok, marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(52,199,89,0.08)" } }, message) : null;
  const tabButton = (id, label) => h("button", {
    type: "button",
    role: "tab",
    "aria-selected": tab === id,
    style: tab === id ? S.tabActive : S.tab,
    onClick: () => {
      setTab(id);
      setMessage("");
      setError("");
    }
  }, label);
  const actionStyle = (disabled) => ({ ...S.button, opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" });
  const saveRow = (disabled, label, hintText) => h(
    "div",
    { style: { ...S.row, marginTop: 12, justifyContent: "space-between" } },
    h("span", { style: S.hint }, hintText ?? (dirty ? "\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539" : "\u6240\u6709\u4FEE\u6539\u5DF2\u4FDD\u5B58")),
    h("button", { type: "button", style: actionStyle(Boolean(busy) || disabled), disabled: Boolean(busy) || disabled, onClick: () => void saveSettings() }, busy === "save" ? "\u4FDD\u5B58\u4E2D\u2026" : label)
  );
  const passwordStrength = pwdInput.length >= 32 ? { label: `\u5F3A\uFF08${pwdInput.length} \u4F4D\uFF09`, style: S.badgeOn } : pwdInput.length >= 12 ? { label: `\u4E2D\uFF08${pwdInput.length} \u4F4D\uFF09`, style: S.badgeOff } : { label: pwdInput ? `\u592A\u77ED\uFF08${pwdInput.length} \u4F4D\uFF09` : "", style: S.badgeOff };
  const nodePanel = h(
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
        h(PanelChip, null, `\u8FD0\u884C v${runningVersion || "-"}`),
        versionMismatch ? h(PanelChip, { tone: "brand" }, `\u5DF2\u5B89\u88C5 v${installedVersion}`) : null
      )
    ),
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 } },
      field("\u8282\u70B9\u540D\u79F0", h("input", { style: S.inputFlex, value: form.displayName, placeholder: "\u7559\u7A7A\u7528\u8BA1\u7B97\u673A\u540D", onChange: (event) => update("displayName", event.target.value) })),
      field("\u5B50\u4F1A\u8BDD preset", h("input", { style: S.inputFlex, value: form.agentPreset, placeholder: "\u7559\u7A7A\u7528 profile \u9ED8\u8BA4", onChange: (event) => update("agentPreset", event.target.value) })),
      h("div", { style: { gridColumn: "1 / -1" } }, field("\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55", h("textarea", {
        style: { ...S.textarea, minHeight: 64 },
        value: form.allowedRoots,
        placeholder: "\u6BCF\u884C\u4E00\u4E2A\u7EDD\u5BF9\u8DEF\u5F84\uFF1B\u7559\u7A7A\u4F7F\u7528\u9ED8\u8BA4\u6570\u636E\u76EE\u5F55",
        onChange: (event) => update("allowedRoots", event.target.value)
      })))
    ),
    h(
      "div",
      { style: { ...S.row, marginTop: 12, justifyContent: "space-between" } },
      h("button", { type: "button", style: S.secondary, onClick: () => setAdvanced((value) => !value) }, advanced ? "\u6536\u8D77\u9AD8\u7EA7\u8BBE\u7F6E" : "\u9AD8\u7EA7\u8BBE\u7F6E"),
      h("span", { style: S.hint }, "\u76D1\u542C\u5730\u5740/\u7AEF\u53E3\u5728\u300C\u4F5C\u4E3A\u4E3B DSH\u300D\u91CC\u914D\u7F6E")
    ),
    advanced ? h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--dsw-alias-border-l2)" } },
      h("div", { style: { gridColumn: "1 / -1" } }, field("\u80FD\u529B\u8BF4\u660E", h("textarea", { style: { ...S.textarea, minHeight: 52 }, value: form.capabilityNote, onChange: (event) => update("capabilityNote", event.target.value) }))),
      field("\u6587\u4EF6\u4E0A\u9650 MB", h("input", { style: S.inputFlex, type: "number", min: 1, max: 1024, value: form.maxFileMB, onChange: (event) => update("maxFileMB", event.target.value) })),
      field("\u5E76\u53D1\u4F20\u8F93", h("input", { style: S.inputFlex, type: "number", min: 1, max: 16, value: form.maxConcurrentFiles, onChange: (event) => update("maxConcurrentFiles", event.target.value) }))
    ) : null,
    saveRow(!dirty, "\u4FDD\u5B58\u8282\u70B9\u8BBE\u7F6E")
  );
  const mainPanel = h(
    React.Fragment,
    null,
    h(
      "div",
      { style: S.card },
      h("div", { style: S.cardHead }, h("h3", { style: S.cardTitle }, "\u670D\u52A1\u8BBE\u7F6E"), h("span", { style: S.hint }, "\u5B50 DSH \u8FDE\u5230\u8FD9\u91CC")),
      h(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 } },
        field("\u76D1\u542C\u5730\u5740", h(
          "select",
          {
            style: { ...S.inputFlex, height: 33 },
            value: form.listenHost,
            onChange: (event) => update("listenHost", event.target.value)
          },
          h("option", { value: "127.0.0.1" }, "127.0.0.1\uFF08\u4EC5\u672C\u673A\uFF09"),
          h("option", { value: "0.0.0.0" }, "0.0.0.0\uFF08\u6240\u6709\u7F51\u5361\uFF0C\u8FDC\u7AEF\u53EF\u8FDE\uFF09"),
          !["127.0.0.1", "0.0.0.0"].includes(form.listenHost) ? h("option", { value: form.listenHost }, form.listenHost) : null
        )),
        field("\u76D1\u542C\u7AEF\u53E3", h("input", { style: S.inputFlex, type: "number", min: 0, max: 65535, value: form.listenPort, onChange: (event) => update("listenPort", event.target.value) })),
        h("div", { style: { gridColumn: "1 / -1" } }, field("\u8FDE\u63A5\u5730\u5740", h(
          "div",
          { style: S.row },
          h("code", { style: S.code }, wsUrl || "\u4FDD\u5B58\u5E76\u76D1\u542C\u540E\u751F\u6210"),
          h("button", { type: "button", style: { ...S.secondary, opacity: wsUrl ? 1 : 0.55, cursor: wsUrl ? "pointer" : "not-allowed" }, disabled: !wsUrl, onClick: () => void copyAddress() }, "\u590D\u5236")
        ))),
        h("div", { style: { gridColumn: "1 / -1" } }, h("span", { style: S.hint }, "\u8FDC\u7AEF\u673A\u5668\u8981\u80FD\u8BBF\u95EE\u8FD9\u4E2A\u5730\u5740\uFF1A\u76D1\u542C 0.0.0.0 \u5E76\u4F7F\u7528\u5C40\u57DF\u7F51 IP\uFF1B\u53EA\u76D1\u542C 127.0.0.1 \u65F6\u4EC5\u672C\u673A\u53EF\u7528\u3002"))
      ),
      saveRow(!dirty, "\u4FDD\u5B58\u670D\u52A1\u8BBE\u7F6E")
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u8FDE\u63A5\u5BC6\u7801"),
        h(
          "div",
          { style: S.row },
          h("span", { style: pwdConfigured ? S.badgeOn : S.badgeOff }, pwdConfigured ? "\u5DF2\u8BBE\u7F6E" : "\u672A\u8BBE\u7F6E"),
          passwordStrength.label ? h("span", { style: passwordStrength.style }, passwordStrength.label) : null
        )
      ),
      h(
        "div",
        { style: S.row },
        h("input", { style: S.inputFlex, type: showPwd ? "text" : "password", value: pwdInput, placeholder: "\u81F3\u5C11 12 \u4E2A\u5B57\u7B26\uFF1B\u7559\u7A7A\u8868\u793A\u4E0D\u4FEE\u6539", onChange: (event) => setPwdInput(event.target.value) }),
        h("button", { type: "button", style: S.secondary, onClick: () => setShowPwd((value) => !value) }, showPwd ? "\u9690\u85CF" : "\u663E\u793A"),
        h("button", { type: "button", style: S.secondary, title: "\u751F\u6210 32 \u5B57\u8282\u968F\u673A\u5BC6\u94A5", onClick: generatePassword }, "\u751F\u6210\u968F\u673A\u5BC6\u94A5"),
        h("button", { type: "button", style: actionStyle(Boolean(busy) || pwdInput.length < 12), disabled: Boolean(busy) || pwdInput.length < 12, onClick: () => void savePassword() }, busy === "password" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u5BC6\u7801")
      ),
      h("div", { style: { ...S.hint, marginTop: 8 } }, "\u540C\u4E00\u5BC6\u7801\u7528\u4E8E\u6240\u6709\u5B50 DSH\uFF1B\u4FEE\u6539\u540E\u5DF2\u8FDE\u63A5\u7684\u8282\u70B9\u9700\u8981\u91CD\u65B0\u8FDE\u63A5\u3002\u5BC6\u7801\u4E0D\u4F1A\u660E\u6587\u56DE\u663E\u3002")
    ),
    h(
      "div",
      { style: S.card },
      h("div", { style: S.cardHead }, h("h3", { style: S.cardTitle }, "\u63D2\u4EF6\u5305"), h("span", { style: S.hint }, `\u8FD0\u884C v${runningVersion}${versionMismatch ? ` \xB7 \u5DF2\u5B89\u88C5 v${installedVersion}` : ""}`)),
      h(
        "div",
        { style: S.row },
        h("a", {
          href: api("package"),
          download: `dsh-cow-${installedVersion || runningVersion}.tgz`,
          style: { ...S.secondary, textDecoration: "none", display: "inline-flex", alignItems: "center" }
        }, `\u4E0B\u8F7D dsh-cow-${installedVersion || runningVersion}.tgz`),
        h("span", { style: S.hint }, "\u516C\u5F00\u4E0B\u8F7D\uFF0C\u65E0 token\uFF1B\u5B50\u7AEF\u81EA\u52A8\u5347\u7EA7\u8981\u6C42 >= 1.31.0\u3002")
      )
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u7F51\u7EDC\u51FA\u53E3\u4EE3\u7406"),
        h("span", { style: form.proxyEnabled ? S.badgeOn : S.badgeOff }, form.proxyEnabled ? "\u5DF2\u5F00\u542F" : "\u672A\u5F00\u542F")
      ),
      h(
        "label",
        { style: { display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", marginBottom: 10 } },
        h("input", { type: "checkbox", checked: Boolean(form.proxyEnabled), onChange: (event) => update("proxyEnabled", event.target.checked), style: { marginTop: 3 } }),
        h(
          "span",
          { style: { display: "grid", gap: 2 } },
          h("span", { style: { fontSize: 12.5, fontWeight: 600 } }, "\u5141\u8BB8\u76F4\u63A5\u5B50 DSH \u901A\u8FC7\u672C\u673A\u8BBF\u95EE\u7F51\u7EDC"),
          h("span", { style: S.hint }, "\u9ED8\u8BA4\u53EA\u5141\u8BB8\u516C\u7F51 80/443\uFF1B\u79C1\u7F51\u76EE\u6807\u5FC5\u987B\u5199\u5165\u767D\u540D\u5355\u3002")
        )
      ),
      h(
        "div",
        { style: { ...S.row, alignItems: "flex-start" } },
        h("div", { style: { flex: "1 1 260px" } }, field("\u57DF\u540D\u767D\u540D\u5355", h("textarea", { style: { ...S.textarea, minHeight: 58 }, value: form.proxyAllowHosts, placeholder: "\u6BCF\u884C\u4E00\u4E2A\u57DF\u540D\uFF0C\u652F\u6301 *.example.com\uFF1B\u7559\u7A7A\u5141\u8BB8\u516C\u7F51 80/443", onChange: (event) => update("proxyAllowHosts", event.target.value) }))),
        h(
          "label",
          { style: { display: "flex", gap: 6, alignItems: "flex-start", paddingTop: 20, cursor: "pointer", flex: "0 0 auto" } },
          h("input", { type: "checkbox", checked: Boolean(form.proxyAllowPrivate), onChange: (event) => update("proxyAllowPrivate", event.target.checked), style: { marginTop: 3 } }),
          h("span", { style: { display: "grid", gap: 2 } }, h("span", { style: { fontSize: 12 } }, "\u5141\u8BB8\u79C1\u7F51"), h("span", { style: S.hint }, "\u9700\u767D\u540D\u5355"))
        )
      ),
      h("div", { style: { ...S.hint, marginTop: 8 } }, "\u4E3B\u7AEF\u4F1A\u6309 peerId \u6821\u9A8C\u76F4\u63A5\u5B50\u8282\u70B9\uFF1B\u5173\u95ED\u540E\u5DF2\u5EFA\u7ACB\u7684\u4EE3\u7406\u8FDE\u63A5\u4F1A\u88AB\u65AD\u5F00\u3002"),
      h("div", { style: { marginTop: 10, maxWidth: 220 } }, field("\u65E5\u5FD7\u4FDD\u7559\u6761\u6570", h("input", { style: S.inputFlex, type: "number", min: 10, max: 200, value: form.proxyLogLimit, onChange: (event) => update("proxyLogLimit", event.target.value) }))),
      saveRow(!dirty, "\u4FDD\u5B58\u7F51\u7EDC\u4EE3\u7406")
    )
  );
  const childPanel = h(
    "div",
    { style: S.card },
    h(
      "div",
      { style: S.cardHead },
      h("h3", { style: S.cardTitle }, "\u4E0A\u7EA7\u8FDE\u63A5"),
      h(
        "div",
        { style: S.row },
        h("span", { style: parent.connected ? S.badgeOn : S.badgeOff }, parent.connected ? "\u5DF2\u8FDE\u63A5\uFF08WebSocket\uFF09" : "\u672A\u8FDE\u63A5"),
        parentNode?.version ? h("span", { style: S.meta }, `\u4E0A\u7EA7 v${parentNode.version}`) : null
      )
    ),
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 } },
      h("div", { style: { gridColumn: "1 / -1" } }, field("\u4E0A\u7EA7\u5730\u5740", h("input", { style: S.inputFlex, placeholder: "ws://192.168.1.10:60001/cow/v1/channel", value: parentUrl, onChange: (event) => setParentUrl(event.target.value) }))),
      field("\u8FDE\u63A5\u5BC6\u7801", h(
        "div",
        { style: S.row },
        h("input", { style: S.inputFlex, type: showParentPwd ? "text" : "password", placeholder: "\u4E3B DSH \u8BBE\u7F6E\u7684\u8FDE\u63A5\u5BC6\u7801", value: parentPassword, onChange: (event) => setParentPassword(event.target.value) }),
        h("button", { type: "button", style: S.secondary, onClick: () => setShowParentPwd((value) => !value) }, showParentPwd ? "\u9690\u85CF" : "\u663E\u793A")
      )),
      parentNode?.uuid ? h("div", { style: { gridColumn: "1 / -1" } }, field("\u4E0A\u7EA7 ID", h("span", { style: { ...S.mono, paddingTop: 7, wordBreak: "break-all" } }, parentNode.uuid))) : null,
      parentNode?.description ? h("div", { style: { gridColumn: "1 / -1" } }, field("\u4E0A\u7EA7\u8BF4\u660E", h("div", { style: { ...S.meta, whiteSpace: "pre-wrap", lineHeight: 1.7, paddingTop: 6 } }, String(parentNode.description).slice(0, 400)))) : null
    ),
    h(
      "div",
      { style: { ...S.row, marginTop: 12, justifyContent: "space-between" } },
      h(
        "div",
        { style: S.row },
        h("span", { style: S.hint }, parentDirty ? "\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539" : "\u6240\u6709\u4FEE\u6539\u5DF2\u4FDD\u5B58"),
        h("button", { type: "button", style: { ...S.danger, opacity: Boolean(busy) || !parentUrl && !parentPassword ? 0.55 : 1, cursor: Boolean(busy) || !parentUrl && !parentPassword ? "not-allowed" : "pointer" }, disabled: Boolean(busy) || !parentUrl && !parentPassword, onClick: () => void clearParent() }, "\u6E05\u9664")
      ),
      h("button", { type: "button", style: actionStyle(Boolean(busy) || !parentDirty), disabled: Boolean(busy) || !parentDirty, onClick: () => void saveParent() }, busy === "parent" ? "\u8FDE\u63A5\u4E2D\u2026" : "\u4FDD\u5B58\u5E76\u8FDE\u63A5")
    ),
    h("div", { style: { ...S.hint, marginTop: 8 } }, "\u4FDD\u5B58\u540E\u5B50 DSH \u4F1A\u4E3B\u52A8\u5EFA\u7ACB\u5E76\u7EF4\u6301 WebSocket \u957F\u8FDE\u63A5\uFF1B\u65AD\u7EBF\u81EA\u52A8\u91CD\u8FDE\u3002"),
    h(
      "div",
      { style: { ...S.card, marginTop: 12, marginBottom: 0, padding: "12px 14px" } },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u901A\u8FC7\u4E3B DSH \u4E0A\u7F51"),
        h("span", { style: form.proxyViaParent ? S.badgeOn : S.badgeOff }, form.proxyViaParent ? "\u5DF2\u5F00\u542F" : "\u672A\u5F00\u542F")
      ),
      h(
        "label",
        { style: { display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" } },
        h("input", { type: "checkbox", checked: Boolean(form.proxyViaParent), onChange: (event) => update("proxyViaParent", event.target.checked), style: { marginTop: 3 } }),
        h(
          "span",
          { style: { display: "grid", gap: 3 } },
          h("span", { style: { fontSize: 12.5, fontWeight: 600 } }, "\u901A\u8FC7\u4E3B DSH \u8BBF\u95EE\u7F51\u7EDC"),
          h("span", { style: S.hint }, "\u542F\u52A8\u672C\u5730 127.0.0.1 \u4EE3\u7406\uFF0CDSH / curl / git / npm \u8D70\u4E3B\u7AEF\u51FA\u53E3\uFF1B\u4E3B\u7AEF\u79BB\u7EBF\u65F6 fail-closed\u3002"),
          data.proxy?.mode === "active" || data.proxy?.mode === "restart" || data.proxy?.mode === "error" ? h(
            "span",
            { style: { ...S.meta, fontSize: 10.5 } },
            data.proxy.mode === "active" ? `\u5DF2\u751F\u6548 \xB7 127.0.0.1:${data.proxy.local?.port || "-"}` : data.proxy.mode === "restart" ? "\u5DF2\u5199\u5165\u73AF\u5883\u53D8\u91CF \xB7 \u91CD\u542F\u5B50 DSH \u751F\u6548" : `\u542F\u52A8\u5931\u8D25\uFF1A${data.proxy.error || "-"}`
          ) : null
        )
      ),
      h("div", { style: { marginTop: 10, maxWidth: 220 } }, field("\u65E5\u5FD7\u4FDD\u7559\u6761\u6570", h("input", { style: S.inputFlex, type: "number", min: 10, max: 200, value: form.proxyLogLimit, onChange: (event) => update("proxyLogLimit", event.target.value) }))),
      saveRow(!dirty, "\u4FDD\u5B58\u7F51\u7EDC\u5F00\u5173")
    )
  );
  return h(
    "div",
    { style: S.wrap },
    embedded ? null : h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 } },
      h(
        "div",
        { style: { display: "grid", gap: 2 } },
        h("h2", { style: { margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.2px" } }, "COW \u534F\u540C"),
        h("span", { style: S.hint }, "\u8282\u70B9\u6807\u8BC6\u3001\u4E3B\u7AEF\u76D1\u542C\u4E0E\u5B50\u7AEF\u8FDE\u63A5")
      ),
      h(
        "div",
        { style: S.row },
        h(PanelChip, { tone: instance.role === "member" ? "neutral" : "on" }, instance.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH"),
        h(PanelChip, null, `\u8FD0\u884C v${runningVersion || "-"}`),
        versionMismatch ? h(PanelChip, { tone: "brand" }, `\u5DF2\u5B89\u88C5 v${installedVersion}`) : null
      )
    ),
    h("div", { style: S.tabs }, tabButton("node", "\u8282\u70B9"), tabButton("main", "\u4F5C\u4E3A\u4E3B DSH"), tabButton("child", "\u4F5C\u4E3A\u5B50 DSH")),
    statusLine,
    tab === "node" ? nodePanel : tab === "main" ? mainPanel : childPanel,
    h("div", { style: { ...S.hint, marginTop: 4 } }, "\u7EAF\u6D88\u606F\u67B6\u6784\uFF1A\u6D88\u606F\u76F4\u63A5\u8FDB\u5165\u5BF9\u65B9\u4F1A\u8BDD\u8F93\u5165\u961F\u5217\uFF0C\u4E0D\u5EFA\u4EFB\u52A1\u3001\u4E0D\u8F6E\u8BE2\u3002")
  );
}
var ctxLayout = null;
function useCowNode() {
  const [node, setNode] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(stateUrl(), { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        if (alive) setNode(data);
      } catch {
        if (alive) setNode(null);
      }
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15e3);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("dsh-cow:state-changed", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dsh-cow:state-changed", onFocus);
    };
  }, []);
  return node;
}
function CowNodeBadge({ wide }) {
  const state = useCowNode();
  const [hover, setHover] = React.useState(false);
  if (!state?.instance) return null;
  const instance = state.instance;
  const name2 = String(instance.displayName || state.config?.displayName || "").trim() || "\u672A\u547D\u540D\u8282\u70B9";
  const role = instance.role === "leader" ? "\u4E3B DSH" : instance.role === "member" ? "\u5B50 DSH" : "\u8282\u70B9";
  const connected = Number(state.stats?.connected) || 0;
  const peerId = String(instance.peerId || "");
  const online = connected > 0;
  const title = `\u672C\u673A COW \u8282\u70B9\uFF1A${name2}
${peerId}${online ? `
${connected} \u4E2A\u8FDE\u63A5` : "\n\u672A\u8FDE\u63A5"}
\u70B9\u51FB\u67E5\u770B COW \u72B6\u6001`;
  const openStatus = () => {
    try {
      ctxLayout?.selectPanel?.("cow-activity");
    } catch {
    }
  };
  if (!wide) {
    return h(
      "button",
      {
        type: "button",
        title,
        "aria-label": `\u6253\u5F00 COW \u72B6\u6001\uFF1A${name2}`,
        onClick: openStatus,
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          margin: "0 auto",
          border: 0,
          borderRadius: "var(--dsw-radius-md)",
          cursor: "pointer",
          color: "var(--dsw-alias-brand-primary)",
          background: hover ? "var(--dsw-alias-interactive-bg-hover)" : "transparent"
        }
      },
      h(
        "span",
        { style: { position: "relative", display: "inline-flex" } },
        h(CowActivityIcon, { size: 19 }),
        h("span", { style: {
          position: "absolute",
          right: -2,
          bottom: -1,
          width: 7,
          height: 7,
          borderRadius: 999,
          background: online ? "#34c38f" : "#94a3b8",
          border: "1.5px solid var(--dsw-alias-bg-base)"
        } })
      )
    );
  }
  return h(
    "button",
    {
      type: "button",
      title,
      "aria-label": `\u6253\u5F00 COW \u72B6\u6001\uFF1A${name2}`,
      onClick: openStatus,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minWidth: 0,
        height: 40,
        padding: "4px 8px",
        boxSizing: "border-box",
        border: 0,
        borderRadius: "var(--dsw-radius-md)",
        background: hover ? "var(--dsw-alias-interactive-bg-hover)" : "transparent",
        color: "var(--dsw-alias-label-primary)",
        cursor: "pointer",
        textAlign: "left",
        font: "inherit"
      }
    },
    h("span", { style: {
      width: 26,
      height: 26,
      borderRadius: 8,
      display: "grid",
      placeItems: "center",
      flex: "none",
      color: "var(--dsw-alias-brand-primary)",
      background: "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)"
    } }, h(CowActivityIcon, { size: 16 })),
    h(
      "span",
      { style: { display: "grid", gap: 1, minWidth: 0, flex: "1 1 auto" } },
      h("span", { style: { fontSize: 12, fontWeight: 600, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, name2),
      h(
        "span",
        { style: { display: "flex", alignItems: "center", gap: 5, minWidth: 0, fontSize: 10.5, lineHeight: 1.3, color: "var(--dsw-alias-label-tertiary)" } },
        h("span", { style: { width: 6, height: 6, borderRadius: 999, flex: "none", background: online ? "#34c38f" : "#94a3b8" } }),
        h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, `COW \xB7 ${role} \xB7 ${online ? `${connected} \u8FDE\u63A5` : "\u672A\u8FDE\u63A5"}`)
      )
    )
  );
}
function CowMentionIcon({ size = 16 }) {
  return h(CowActivityIcon, { size });
}
function cowMentionSource() {
  return {
    trigger: "@",
    name: "COW \u5B50 DSH",
    order: -100,
    showGroupTitle: true,
    async candidates(_session, request) {
      if (request?.position !== "leading") return [];
      const response = await fetch(stateUrl(), { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return [];
      const data = await response.json();
      const query = String(request?.query ?? "").trim().toLowerCase();
      return (data?.peers ?? []).filter((peer) => peer.relation === "child").map((peer) => {
        const peerName = String(peer.peerName || peer.label || "\u672A\u547D\u540D");
        return {
          peer,
          name: `COW ${peerName}`,
          label: `COW ${peerName}`,
          description: `${peer.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"}${peer.version ? ` \xB7 v${peer.version}` : ""} \xB7 \u63D2\u5165 [TO:] \u524D\u7F00`,
          value: JSON.stringify({ peerId: peer.peerId || "", peerName, version: peer.version || "", connected: Boolean(peer.connected) }),
          icon: CowMentionIcon
        };
      }).filter((item) => !query || item.name.toLowerCase().includes(query) || item.label.toLowerCase().includes(query)).sort((a, b) => Number(Boolean(b.peer.connected)) - Number(Boolean(a.peer.connected))).map(({ peer: _peer, ...candidate }) => candidate);
    },
    onPick(pick) {
      if (pick?.position !== "leading") return void 0;
      try {
        const target = JSON.parse(pick?.candidate?.value ?? "");
        if (!target.peerName) return void 0;
        const mention = `[TO: ${target.peerName}]`;
        return {
          insert: {
            source: "COW \u5B50 DSH",
            ref: mention,
            label: mention,
            appearance: "session",
            clipboardText: `${mention} `
          }
        };
      } catch {
        return void 0;
      }
    },
    codec: {
      clipboardText: (ref) => ref,
      serialize: (ref) => Promise.resolve(ref)
    }
  };
}
var name = "dsh-cow-client";
var inject = ["slots", "sidebarRightTabs", "sidebarRight", "layout"];
var COW_RIGHT_KIND = "cow-status";
var COW_RIGHT_ID = "dsh-cow/status";
function CowRightStatus() {
  return h(CowActivityPanel, null);
}
function apply(ctx) {
  ctxLayout = ctx.layout ?? null;
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
    ctx.inject(["inputTriggers"], (sctx) => {
      const triggers = sctx.get("inputTriggers", false);
      if (!triggers?.registerSource) return;
      sctx.effect(() => triggers.registerSource(cowMentionSource()), "dsh-cow: @ COW \u5B50 DSH");
    });
  } catch (error) {
    console.error("[dsh-cow] @ COW source failed", error);
  }
  try {
    ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
      name: "sidebar.footer.action",
      id: "cow-node",
      order: 10
    }, CowNodeBadge));
  } catch (error) {
    console.error("[dsh-cow] node badge slot failed", error);
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
