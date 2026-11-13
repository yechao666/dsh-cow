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
  tabs: { display: "flex", gap: 20, margin: "4px 0 18px", width: "100%", boxSizing: "border-box", borderBottom: "1px solid var(--dsw-alias-border-l2)" },
  tab: { border: 0, padding: "8px 2px 9px", marginBottom: -1, background: "transparent", borderBottom: "2px solid transparent", color: "var(--dsw-alias-label-secondary)", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  tabActive: { border: 0, padding: "8px 2px 9px", marginBottom: -1, background: "transparent", borderBottom: "2px solid var(--dsw-alias-brand-primary)", color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  card: { border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "var(--dsw-radius-md, 8px)", padding: "14px 16px", marginBottom: 12, background: "var(--dsw-alias-bg-l1)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 600 },
  formGrid: { display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", columnGap: 12, rowGap: 10, alignItems: "start" },
  formLabel: { fontSize: 12, color: "var(--dsw-alias-label-secondary)", paddingTop: 7, whiteSpace: "nowrap" },
  formValue: { display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0, flexWrap: "wrap" },
  inputFlex: { flex: "1 1 auto", minWidth: 120, boxSizing: "border-box", padding: "7px 10px", borderRadius: "var(--dsw-radius-sm, 6px)", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", fontSize: 12, outline: "none" },
  pushRight: { marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 },
  button: { border: "1px solid var(--dsw-alias-button-primary-fill)", background: "var(--dsw-alias-button-primary-fill)", color: "var(--dsw-alias-label-primary-foreground)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  secondary: { border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  danger: { border: "1px solid var(--dsw-alias-border-l2)", background: "transparent", color: "var(--dsw-alias-label-error)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  iconButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, padding: 0, flexShrink: 0, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "var(--dsw-radius-sm, 6px)", background: "transparent", color: "var(--dsw-alias-label-tertiary)", cursor: "pointer" },
  hint: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)", lineHeight: 1.6 },
  badge: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", border: "1px solid var(--dsw-alias-border-l2)" },
  badgeOn: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "rgba(52,199,89,.14)", color: "#2ea043", border: "1px solid rgba(52,199,89,.35)" },
  badgeOff: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-secondary)", border: "1px solid var(--dsw-alias-border-l2)" },
  meta: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" },
  err: { fontSize: 12, color: "var(--dsw-alias-label-error)" },
  ok: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
  listRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--dsw-alias-border-l2)" },
  row: { display: "flex", gap: 8, alignItems: "center", minWidth: 0, flexWrap: "wrap" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11 }
};
function Row({ label, children, nowrap = false }) {
  return h(
    "div",
    { style: { display: "contents" } },
    h("span", { style: S.formLabel }, label),
    h("div", { style: nowrap ? { ...S.formValue, flexWrap: "nowrap" } : S.formValue }, children)
  );
}
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
function PeerRow({ peer, busy, onRemove, onUpgrade, currentVersion }) {
  return h(
    "div",
    { style: S.listRow },
    h(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      h(
        "div",
        { style: S.row },
        h("span", { style: { fontSize: 12, fontWeight: 600 } }, peer.label),
        h("span", { style: peer.connected ? S.badgeOn : S.badgeOff }, peer.connected ? "\u5DF2\u8FDE\u63A5" : "\u79BB\u7EBF"),
        peer.version ? h("span", { style: S.meta }, `v${peer.version}`) : null,
        peer.encrypted ? h("span", { style: S.badgeOn }, "E2E") : null,
        onUpgrade && peer.connected && peer.version && currentVersion && peer.version !== currentVersion ? h("button", {
          type: "button",
          style: { ...S.secondary, marginLeft: "auto", padding: "2px 8px", fontSize: 11 },
          disabled: Boolean(busy),
          title: `\u5347\u7EA7\u5230 ${currentVersion}`,
          onClick: () => onUpgrade(peer.label)
        }, busy === `upgrade:${peer.label}` ? "\u5347\u7EA7\u4E2D\u2026" : `\u5347\u7EA7\u5230 ${currentVersion}`) : null
      ),
      peer.description ? h("div", { style: { ...S.meta, whiteSpace: "pre-wrap" } }, peer.description.slice(0, 200)) : null,
      peer.currentTask ? h("div", { style: S.meta }, `\u6B63\u5728\u6267\u884C\uFF1A${peer.currentTask.title || peer.currentTask.taskId}\uFF08${peer.currentTask.status}\uFF09`) : null,
      h("div", { style: { ...S.meta, wordBreak: "break-all" } }, `UUID: ${peer.uuid || peer.instanceId || "-"}`)
    ),
    h(
      "button",
      {
        type: "button",
        title: "\u79FB\u9664\u8BE5\u8282\u70B9",
        "aria-label": "\u79FB\u9664\u8BE5\u8282\u70B9",
        style: S.iconButton,
        disabled: Boolean(busy),
        onClick: () => onRemove(peer.label)
      },
      h(
        "svg",
        { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
        h("path", { d: "M3 6h18" }),
        h("path", { d: "M8 6V4h8v2" }),
        h("path", { d: "M19 6l-1 14H6L5 6" }),
        h("path", { d: "M10 11v6M14 11v6" })
      )
    )
  );
}
var ACTIVITY_KIND = {
  task: { label: "\u4EFB\u52A1", color: "#77a7ef" },
  result: { label: "\u7ED3\u679C", color: "#55c6ae" },
  queue: { label: "\u6392\u961F", color: "#e0a33e" },
  question: { label: "\u63D0\u95EE", color: "#a58be8" },
  answer: { label: "\u56DE\u7B54", color: "#55c6ae" },
  file: { label: "\u6587\u4EF6", color: "#ff8068" },
  peer: { label: "\u8282\u70B9", color: "#8a8f9c" },
  inbound: { label: "\u5165\u7AD9", color: "#4f8dd8" },
  info: { label: "\u4FE1\u606F", color: "#8a8f9c" }
};
function CowActivityIcon({ size = 16 }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M4 12a8 8 0 0 1 16 0" }),
    h("path", { d: "M7 12a5 5 0 0 1 10 0" }),
    h("circle", { cx: 12, cy: 12, r: 1.6, fill: "currentColor", stroke: "none" }),
    h("path", { d: "M12 14v6" })
  );
}
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
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 10, marginBottom: 14 },
  stat: {
    border: "1px solid var(--dsw-alias-border-l2)",
    borderRadius: 11,
    padding: "10px 12px",
    background: "var(--dsw-alias-bg-l1)",
    display: "grid",
    gap: 2
  },
  statValue: { fontSize: 20, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.3px" },
  statLabel: { ...S.meta, fontSize: 11 },
  card: {
    border: "1px solid var(--dsw-alias-border-l2)",
    borderRadius: 12,
    padding: "14px 16px",
    background: "var(--dsw-alias-bg-l1)",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.035)",
    marginBottom: 12
  },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 650, letterSpacing: "-0.1px" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 12 },
  kvRow: { display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 10, fontSize: 12, lineHeight: 1.65, padding: "2px 0" },
  kvKey: { ...S.meta, fontSize: 11.5 },
  kvVal: { wordBreak: "break-all" },
  taskRow: { display: "grid", gap: 4, padding: "9px 0", borderTop: "1px solid var(--dsw-alias-border-l2)" },
  taskTitle: { fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  taskMeta: { ...S.meta, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 11 },
  progress: { ...S.meta, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11.5 },
  empty: { ...S.hint, padding: "18px 0", textAlign: "center", fontSize: 12 },
  chip: { display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 999, border: "1px solid var(--dsw-alias-border-l2)", fontSize: 10.5, fontWeight: 600 },
  activityRow: { display: "grid", gridTemplateColumns: "9px minmax(0, 1fr)", gap: 10, padding: "6px 0" },
  activityDot: { width: 8, height: 8, borderRadius: 999, marginTop: 5 },
  activityText: { fontSize: 12.5, lineHeight: 1.5, wordBreak: "break-word" }
};
function panelStatusStyle(status) {
  const map = {
    queued: { color: "#b7791f", background: "rgba(183, 121, 31, 0.12)", border: "rgba(183, 121, 31, 0.35)" },
    running: { color: "var(--dsw-alias-brand-primary)", background: "color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)", border: "color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent)" },
    succeeded: { color: "#2f855a", background: "rgba(47, 133, 90, 0.12)", border: "rgba(47, 133, 90, 0.3)" },
    failed: { color: "#c53030", background: "rgba(197, 48, 48, 0.1)", border: "rgba(197, 48, 48, 0.3)" },
    canceled: { color: "var(--dsw-alias-label-secondary)", background: "var(--dsw-alias-bg-l2)", border: "var(--dsw-alias-border-l2)" },
    interrupted: { color: "#c53030", background: "rgba(197, 48, 48, 0.1)", border: "rgba(197, 48, 48, 0.3)" }
  };
  return map[status] ?? map.canceled;
}
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
function TopologyNode({ label, version, connected, encrypted, currentTask, self = false }) {
  return h(
    "div",
    {
      style: {
        minWidth: self ? 210 : 168,
        maxWidth: 238,
        border: `1px solid ${self ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-border-l2)"}`,
        borderRadius: 12,
        padding: "10px 12px",
        background: self ? "color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-l1))" : "var(--dsw-alias-bg-l1)",
        boxShadow: self ? "0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent), 0 6px 18px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.04)",
        display: "grid",
        gap: 4
      }
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" } },
      h("span", { style: { width: 7, height: 7, borderRadius: 99, background: connected ? "#38a169" : "var(--dsw-alias-label-tertiary)" } }),
      h("span", { style: { fontSize: 12.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 } }, label || "\u672A\u547D\u540D\u8282\u70B9"),
      self ? h(PanelChip, { tone: "brand" }, "\u5F53\u524D") : null
    ),
    h(
      "div",
      { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } },
      version ? h(PanelChip, null, `v${version}`) : null,
      encrypted ? h(PanelChip, { tone: "on" }, "E2E") : null,
      connected ? null : h(PanelChip, { tone: "off" }, "\u79BB\u7EBF")
    ),
    currentTask ? h("div", { style: { ...S.meta, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, `\u4EFB\u52A1\uFF1A${currentTask.title || currentTask.taskId}`) : null
  );
}
function CowTopology({ state }) {
  if (!state) return null;
  const instance = state.instance ?? {};
  const peers = state.peers ?? [];
  const parent = peers.find((peer) => peer.relation === "parent") ?? null;
  const children = peers.filter((peer) => peer.relation !== "parent");
  const vline = (height) => h("div", { style: { width: 1, height, background: "var(--dsw-alias-border-l2)", marginLeft: 20 } });
  const sectionLabel = (text, extra) => h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
    h("span", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px" } }, text),
    extra ? h("span", { style: { ...S.meta, fontSize: 10.5 } }, extra) : null
  );
  const childRow = (child) => h(
    "div",
    {
      key: child.label,
      style: {
        display: "grid",
        gap: 2,
        padding: "7px 10px 7px 12px",
        borderLeft: "2px solid var(--dsw-alias-border-l2)",
        marginLeft: 19,
        position: "relative"
      }
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" } },
      h("span", { style: { width: 18, height: 18, borderRadius: 6, display: "grid", placeItems: "center", color: "#fff", background: panelAccent(child.label).main, fontSize: 9.5, fontWeight: 700 } }, String(child.label || "?").slice(0, 1)),
      h("span", { style: { fontSize: 12, fontWeight: 600 } }, child.label),
      h(PanelChip, { tone: child.connected ? "on" : "off" }, child.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"),
      child.version ? h("span", { style: { ...S.meta, fontSize: 10.5 } }, `v${child.version}`) : null,
      child.encrypted ? h("span", { style: { ...S.meta, fontSize: 10.5 } }, "E2E") : null,
      child.currentTask ? h("span", { style: { ...S.meta, fontSize: 10.5, marginLeft: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" } }, `\u4EFB\u52A1\uFF1A${child.currentTask.title || child.currentTask.taskId}`) : null
    )
  );
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
        h("span", { style: { ...S.meta, fontSize: 11 } }, "\u4E0A\u7EA7\u5728\u4E0A\uFF0C\u5F53\u524D\u8282\u70B9\u4E0E\u76F4\u63A5\u4E0B\u7EA7\u4F9D\u6B21\u5411\u4E0B\u6392\u5217")
      ),
      h(PanelChip, { tone: "brand" }, `${children.filter((child) => child.connected).length}/${children.length} \u5B50\u8282\u70B9\u5728\u7EBF`)
    ),
    h(
      "div",
      { style: { display: "grid", gap: 0, padding: "2px 0" } },
      sectionLabel("\u4E0A\u7EA7\u8282\u70B9"),
      parent ? h("div", { style: { display: "grid", gap: 6 } }, h(TopologyNode, { label: parent.label, version: parent.version, connected: parent.connected, encrypted: parent.encrypted, currentTask: parent.currentTask })) : h("div", { style: { ...PANEL.chip, color: "var(--dsw-alias-label-tertiary)", borderStyle: "dashed", padding: "6px 12px", fontSize: 11, justifySelf: "start" } }, "\u65E0\u76F4\u63A5\u4E0A\u7EA7"),
      vline(18),
      sectionLabel("\u5F53\u524D\u8282\u70B9"),
      h(TopologyNode, {
        label: instance.displayName || "\u672C\u673A",
        version: instance.version,
        connected: true,
        encrypted: (state.stats?.encrypted ?? 0) > 0,
        currentTask: state.currentInbound ?? null,
        self: true
      }),
      vline(18),
      sectionLabel("\u4E0B\u7EA7\u8282\u70B9", children.length ? `${children.length} \u4E2A` : ""),
      children.length ? h("div", { style: { display: "grid", gap: 2 } }, children.map(childRow)) : h("div", { style: { ...PANEL.chip, color: "var(--dsw-alias-label-tertiary)", borderStyle: "dashed", padding: "6px 12px", fontSize: 11, justifySelf: "start" } }, "\u65E0\u76F4\u63A5\u4E0B\u7EA7")
    )
  );
}
function TaskLine({ task, extra }) {
  const status = task.status === "queued" && task.queuePosition ? `\u6392\u961F\u7B2C ${task.queuePosition} \u4F4D` : task.status;
  const tone = panelStatusStyle(task.status);
  const glyph = task.status === "running" ? "\u25B6" : task.status === "queued" ? "\u23F3" : task.status === "succeeded" ? "\u2713" : task.status === "failed" || task.status === "interrupted" ? "\u2715" : "\u2013";
  const last = task.progress?.slice(-1)[0]?.text || task.prompt || "";
  return h(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1fr) auto",
        gap: 9,
        alignItems: "start",
        padding: "9px 10px",
        marginBottom: 7,
        borderRadius: 9,
        border: `1px solid ${tone.border}`,
        borderLeft: `3px solid ${tone.color}`,
        background: `linear-gradient(90deg, ${tone.background}, transparent 65%)`
      }
    },
    h("span", { style: { width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color: tone.color, background: tone.background, border: `1px solid ${tone.border}` } }, glyph),
    h(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      h("div", { style: { fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, task.title || task.taskId),
      h(
        "div",
        { style: { ...S.meta, display: "flex", gap: 7, flexWrap: "wrap", fontSize: 10.5 } },
        extra ? h("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, extra) : null,
        task.createdAt ? h("span", null, new Date(task.createdAt).toLocaleTimeString("zh-CN", { hour12: false })) : null,
        task.finishedAt ? h("span", null, `\u5B8C\u6210 ${new Date(task.finishedAt).toLocaleTimeString("zh-CN", { hour12: false })}`) : null
      ),
      last ? h("div", { style: { ...S.meta, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, last) : null
    ),
    h("span", { style: { ...PANEL.chip, color: tone.color, background: tone.background, borderColor: tone.border, whiteSpace: "nowrap" } }, status)
  );
}
function CowActivityPanel() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const [answering, setAnswering2] = React.useState("");
  const [section, setSection] = React.useState("overview");
  const [taskFilter, setTaskFilter] = React.useState("all");
  const [activityFilter, setActivityFilter] = React.useState("all");
  const postAnswer = async (body) => {
    const response = await fetch(api("answer"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    return payload;
  };
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activityResponse, stateResponse] = await Promise.all([
        fetch(activityUrl(), { credentials: "same-origin" }),
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
  const answer = async (key, body) => {
    setAnswering2(key);
    setError("");
    try {
      await postAnswer(body);
      setAnswers((current) => ({ ...current, [key]: "" }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering2("");
    }
  };
  const state = data?.state ?? {};
  const instance = state.instance ?? {};
  const config = state.config ?? {};
  const peers = state.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== "parent");
  const parent = state.parent ?? {};
  const parentPeer = peers.find((peer) => peer.relation === "parent");
  const stats = state.stats ?? {};
  const tasks = state.tasks ?? [];
  const inbound = state.inboundTasks ?? [];
  const questions = state.questions ?? [];
  const pendingTasks = tasks.filter((task) => task.pendingQuestion);
  const pendingTotal = questions.length + pendingTasks.length;
  const activeOutbound = tasks.filter((task) => ["queued", "running"].includes(task.status));
  const activeInbound = inbound.filter((task) => ["queued", "running"].includes(task.status));
  const items = data?.activity?.items ?? [];
  const roleLabel = parent.connected || instance.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH";
  const taskCounts = ["queued", "running", "succeeded", "failed", "canceled"].map((status) => ({
    status,
    value: [...tasks, ...inbound].filter((task) => task.status === status).length
  }));
  const taskColors = { queued: "#f59e0b", running: "#4f8df7", succeeded: "#34c38f", failed: "#ef4444", canceled: "#94a3b8" };
  const taskLabels = { queued: "\u6392\u961F", running: "\u6267\u884C\u4E2D", succeeded: "\u6210\u529F", failed: "\u5931\u8D25", canceled: "\u53D6\u6D88" };
  const endpoint = instance.endpoint ? `${String(instance.endpoint).replace(/^http/, "ws")}/channel` : "\u672A\u5C31\u7EEA";
  const parentVersion = parentPeer?.version || parent.node?.version || "";
  const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("zh-CN", { hour12: false });
  };
  const renderPending = (question, key, body) => h(
    "div",
    { key, style: { display: "grid", gap: 7, padding: "10px 0", borderTop: "1px solid var(--dsw-alias-border-l2)" } },
    h(
      "div",
      { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
      h("span", { style: { ...PANEL.chip, color: "#b7791f", background: "rgba(183,121,31,0.12)", borderColor: "rgba(183,121,31,0.35)" } }, "\u5F85\u5904\u7406"),
      h("span", { style: { fontSize: 12.5, lineHeight: 1.55, minWidth: 0 } }, question.text)
    ),
    question.options?.length ? h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, question.options.map((option) => h("button", {
      key: option,
      type: "button",
      style: {
        ...S.secondary,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        borderColor: answers[key] === option ? "var(--dsw-alias-brand-primary)" : void 0,
        color: answers[key] === option ? "var(--dsw-alias-brand-primary)" : void 0,
        background: answers[key] === option ? "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)" : void 0
      },
      onClick: () => setAnswers((current) => ({ ...current, [key]: option }))
    }, option))) : null,
    h(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "center" } },
      h("input", {
        style: { ...S.inputFlex, flex: "1 1 auto", height: 30, borderRadius: 7 },
        placeholder: "\u8F93\u5165\u56DE\u7B54\u6216\u9009\u62E9\u4E0A\u9762\u7684\u9009\u9879",
        value: answers[key] ?? "",
        onChange: (e) => setAnswers((current) => ({ ...current, [key]: e.target.value }))
      }),
      h("button", { type: "button", style: { ...S.button, height: 30, padding: "0 14px" }, disabled: Boolean(answering), onClick: () => answer(key, body) }, answering === key ? "\u53D1\u9001\u4E2D\u2026" : "\u56DE\u7B54")
    )
  );
  const tab = (key, label, count) => h("button", {
    key,
    type: "button",
    onClick: () => setSection(key),
    style: {
      border: "1px solid " + (section === key ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-border-l2)"),
      background: section === key ? "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)" : "transparent",
      color: section === key ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-secondary)",
      borderRadius: 999,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: section === key ? 650 : 500,
      cursor: "pointer"
    }
  }, count ? `${label} ${count}` : label);
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
  const connectionOf = (label) => (state.connections ?? []).find((item) => item.peer === label) ?? null;
  const nodeDetail = (peer, isParent = false) => {
    const conn = connectionOf(peer.label);
    const facts = [
      ["\u552F\u4E00\u6807\u8BC6", peer.uuid || peer.instanceId || "", true],
      ["\u5B9E\u4F8B ID", peer.instanceId || "", true],
      ["\u8FDE\u63A5\u65B9\u5411", peer.direction === "out" ? "\u672C\u673A \u2192 \u5BF9\u7AEF" : peer.direction === "in" ? "\u5BF9\u7AEF \u2192 \u672C\u673A" : "", false],
      ["\u8FDE\u63A5\u65F6\u95F4", conn?.since ? new Date(conn.since).toLocaleString("zh-CN", { hour12: false }) : "", false],
      ["\u6700\u8FD1\u5FC3\u8DF3", conn?.lastSeenAt ? new Date(conn.lastSeenAt).toLocaleString("zh-CN", { hour12: false }) : "", false],
      ["\u5F53\u524D\u4EFB\u52A1", peer.currentTask ? `${peer.currentTask.title || peer.currentTask.taskId}\uFF08${peer.currentTask.status}\uFF09` : "", false]
    ].filter(([, value]) => value);
    return h(
      "div",
      { key: `${isParent ? "parent" : "child"}:${peer.label}`, style: { ...PANEL.card, padding: "12px 14px", marginBottom: 0 } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 } },
        h("span", { style: { width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: panelAccent(peer.label).main, fontSize: 12, fontWeight: 700, boxShadow: `0 4px 12px ${panelAccent(peer.label).border}` } }, String(peer.label || "?").slice(0, 1)),
        h("span", { style: { fontSize: 13, fontWeight: 650 } }, peer.label),
        h(PanelChip, { tone: peer.connected ? "on" : "off" }, peer.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"),
        peer.version ? h(PanelChip, null, `v${peer.version}`) : null,
        peer.encrypted ? h(PanelChip, { tone: "on" }, "E2E") : null,
        h("span", { style: { ...S.meta, fontSize: 10.5, marginLeft: "auto" } }, isParent ? "\u76F4\u63A5\u4E0A\u7EA7" : "\u76F4\u63A5\u4E0B\u7EA7")
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
  const activityList = (limit) => items.filter(activityMatch).length ? h(
    "div",
    { style: { position: "relative", paddingLeft: 16 } },
    h("div", { style: { position: "absolute", left: 6, top: 6, bottom: 6, width: 1, background: "var(--dsw-alias-border-l2)" } }),
    items.filter(activityMatch).slice(0, limit).map((item) => {
      const kind = ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info;
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
        }, String(kind.label || "\xB7").slice(0, 1)),
        h(
          "div",
          { style: { minWidth: 0, marginTop: 1 } },
          h("div", { style: { fontSize: 12.5, lineHeight: 1.5, wordBreak: "break-word" } }, item.text || "\uFF08\u65E0\u63CF\u8FF0\uFF09"),
          h(
            "div",
            { style: { ...S.meta, display: "flex", gap: 7, flexWrap: "wrap", fontSize: 10.5, marginTop: 2 } },
            h("span", { style: { color: kind.color, fontWeight: 600 } }, kind.label),
            h("span", null, timeOf(item.at)),
            item.peer ? h("span", null, item.peer) : null,
            item.taskId ? h("span", { style: S.mono }, item.taskId.slice(-10)) : null,
            item.status ? h("span", null, item.status) : null
          )
        )
      );
    })
  ) : h("div", { style: PANEL.empty }, "\u6CA1\u6709\u7B26\u5408\u7B5B\u9009\u7684\u6D3B\u52A8");
  const incomingVisible = inbound.length > 0;
  const taskMatch = (task) => taskFilter === "all" || (taskFilter === "active" ? ["queued", "running"].includes(task.status) : ["succeeded", "failed", "canceled", "interrupted"].includes(task.status));
  const visibleTasks = tasks.filter(taskMatch);
  const visibleInbound = inbound.filter(taskMatch);
  const activityMatch = (item) => activityFilter === "all" || activityFilter === "task" && ["task", "result", "queue", "inbound"].includes(item.kind) || activityFilter === "question" && ["question", "answer"].includes(item.kind) || activityFilter === "file" && item.kind === "file" || activityFilter === "peer" && ["peer", "info"].includes(item.kind);
  const approvalBlock = pendingTotal ? h(
    "div",
    { style: { ...PANEL.card, marginBottom: 0, borderColor: "rgba(183,121,31,0.35)" } },
    h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u9700\u8981\u4F60\u51B3\u5B9A"), h(PanelChip, { tone: "brand" }, `${pendingTotal} \u6761`)),
    pendingTasks.map((task) => renderPending(
      { text: `${task.title || task.taskId}\uFF1A${task.pendingQuestion?.question || ""}`, options: task.pendingQuestion?.options },
      task.taskId,
      { taskId: task.taskId, answer: answers[task.taskId] ?? "" }
    )),
    questions.map((question) => renderPending(
      { text: `${question.from || "\u5B50 DSH"}\uFF1A${question.question || ""}`, options: question.options },
      question.questionId,
      { questionId: question.questionId, answer: answers[question.questionId] ?? "" }
    ))
  ) : h("div", { style: PANEL.card }, h("div", { style: PANEL.empty }, "\u5F53\u524D\u6CA1\u6709\u9700\u8981\u4EBA\u5DE5\u5904\u7406\u7684\u5BA1\u6279\u6216\u63D0\u95EE"));
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
        h(PanelChip, { tone: "on" }, `${stats.connected ?? 0} \u8FDE\u63A5`),
        h(PanelChip, { tone: "brand" }, `${stats.encrypted ?? 0} \u52A0\u5BC6`),
        pendingTotal ? h(PanelChip, { tone: "brand" }, `${pendingTotal} \u5F85\u5904\u7406`) : null,
        h("button", { type: "button", style: { ...S.secondary, height: 28, padding: "0 10px", fontSize: 11.5 }, onClick: () => {
          void load();
        }, disabled: loading }, loading ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0")
      )
    ),
    error ? h("div", { style: { ...S.err, marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(197,48,48,0.08)" } }, `\u52A0\u8F7D\u5931\u8D25\uFF1A${error}`) : null,
    h(
      "div",
      { style: { ...PANEL.statGrid, gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" } },
      h(StatCard, { label: "\u672C\u673A\u7248\u672C", value: instance.version ? `v${instance.version}` : "-", sub: "dsh-cow", accent: PANEL_ACCENTS[0], icon: "cube" }),
      h(StatCard, { label: "\u5728\u7EBF\u8282\u70B9", value: stats.connected ?? 0, sub: `\u5171 ${peers.length} \u4E2A\u8282\u70B9`, accent: PANEL_ACCENTS[1], icon: "network" }),
      h(StatCard, { label: "\u5728\u7EBF\u5B50 DSH", value: children.filter((child) => child.connected).length, sub: `${children.length} \u4E2A\u76F4\u63A5\u4E0B\u7EA7`, accent: PANEL_ACCENTS[2], icon: "users" }),
      h(StatCard, { label: "\u6267\u884C / \u6392\u961F", value: activeOutbound.length + activeInbound.length, sub: `\u7236\u7AEF ${activeOutbound.length} \xB7 \u5B50\u7AEF ${activeInbound.length}`, accent: PANEL_ACCENTS[3], icon: "activity" }),
      h(StatCard, { label: "\u5F85\u4EBA\u5DE5", value: pendingTotal, sub: `${pendingTasks.length} \u5BA1\u6279 \xB7 ${questions.length} \u63D0\u95EE`, accent: PANEL_ACCENTS[4], icon: "alert" }),
      h(StatCard, { label: "\u52A0\u5BC6\u8FDE\u63A5", value: stats.encrypted ?? 0, sub: "AES-256-GCM", accent: PANEL_ACCENTS[5], icon: "lock" })
    ),
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 12 } },
      h(
        "div",
        { style: { ...PANEL.card, marginBottom: 0 } },
        h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u8282\u70B9\u8FDE\u63A5"), h(PanelChip, null, `${peers.length} \u4E2A`)),
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" } },
          h(PanelDonut, {
            segments: [
              { label: "\u5728\u7EBF", value: stats.connected ?? 0, color: "#34c38f" },
              { label: "\u79BB\u7EBF", value: Math.max(0, peers.length - (stats.connected ?? 0)), color: "#64748b" }
            ],
            centerValue: `${stats.connected ?? 0}/${peers.length}`,
            centerLabel: "\u5728\u7EBF"
          }),
          h(
            "div",
            { style: { display: "grid", gap: 7, flex: "1 1 130px" } },
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u5728\u7EBF"), h("b", { style: { color: "#34c38f" } }, stats.connected ?? 0)),
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u79BB\u7EBF"), h("b", { style: { color: "#94a3b8" } }, Math.max(0, peers.length - (stats.connected ?? 0)))),
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u5B50\u8282\u70B9"), h("b", null, children.length)),
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5 } }, h("span", { style: S.meta }, "\u4E0A\u7EA7"), h("b", { style: { color: parent.connected ? "#34c38f" : "#94a3b8" } }, parent.connected ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5"))
          )
        )
      ),
      h(
        "div",
        { style: { ...PANEL.card, marginBottom: 0 } },
        h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u4EFB\u52A1\u72B6\u6001"), h(PanelChip, null, `${tasks.length + inbound.length} \u6761`)),
        h(PanelTaskBars, { rows: taskCounts.map((row) => ({ label: taskLabels[row.status], value: row.value, color: taskColors[row.status] })) })
      )
    ),
    h(
      "div",
      { style: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14, padding: 4, borderRadius: 11, background: "var(--dsw-alias-bg-l2)", width: "fit-content" } },
      tab("overview", "\u6982\u89C8"),
      tab("nodes", "\u8282\u70B9", peers.length),
      tab("tasks", "\u4EFB\u52A1", activeOutbound.length + activeInbound.length),
      tab("approvals", "\u5BA1\u6279/\u63D0\u95EE", pendingTotal),
      tab("activity", "\u6D3B\u52A8", items.length)
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
          h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u672C\u673A\u8282\u70B9"), h(PanelChip, { tone: stats.encrypted ? "on" : "neutral" }, stats.encrypted ? "E2E \u5DF2\u542F\u7528" : "E2E \u672A\u542F\u7528")),
          h(PanelKV, { rows: [
            ["\u552F\u4E00\u6807\u8BC6", h("span", { style: S.mono }, instance.uuid || instance.instanceId || "-")],
            ["WebSocket", endpoint],
            ["\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55", config.allowedRoots || "-"],
            ["\u5F53\u524D\u4EFB\u52A1", state.currentInbound ? `${state.currentInbound.remoteTaskId}\uFF08${state.currentInbound.from}\uFF09` : "\u7A7A\u95F2"]
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
            ["\u5B50\u8282\u70B9", children.length ? children.map((child) => `${child.label}\uFF08${child.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"}${child.version ? ` v${child.version}` : ""}\uFF09`).join("\uFF1B") : "\u65E0"]
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
            ["\u52A0\u5BC6", parentPeer?.encrypted ? "E2E \u5DF2\u542F\u7528" : "\u672A\u542F\u7528"],
            ...activeInbound.length ? [["\u6267\u884C/\u6392\u961F", `${activeInbound.length} \u6761`]] : []
          ] })
        )
      )
    ) : null,
    section === "nodes" ? h(
      "div",
      { style: { display: "grid", gap: 12 } },
      h("div", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px" } }, "\u4E0A\u7EA7\u8282\u70B9"),
      parentPeer ? nodeDetail(parentPeer, true) : h("div", { style: PANEL.card }, h("div", { style: PANEL.empty }, "\u65E0\u76F4\u63A5\u4E0A\u7EA7")),
      h("div", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px", marginTop: 4 } }, "\u672C\u673A\u8282\u70B9"),
      nodeDetail({
        label: instance.displayName || "\u672C\u673A",
        connected: true,
        version: instance.version,
        uuid: instance.uuid,
        instanceId: instance.instanceId,
        encrypted: (stats.encrypted ?? 0) > 0,
        direction: "",
        currentTask: state.currentInbound ?? null,
        description: instance.description || ""
      }),
      h("div", { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: "0.4px", marginTop: 4 } }, "\u5B50\u8282\u70B9\uFF08\u5782\u76F4\u6392\u5217\uFF09"),
      children.length ? h("div", { style: { display: "grid", gap: 10 } }, children.map((child) => nodeDetail(child))) : h("div", { style: PANEL.card }, h("div", { style: PANEL.empty }, "\u5F53\u524D\u6CA1\u6709\u5B50 DSH"))
    ) : null,
    section === "tasks" ? h(
      React.Fragment,
      null,
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 } },
        filterButton(taskFilter === "all", `\u5168\u90E8 ${tasks.length + inbound.length}`, () => setTaskFilter("all")),
        filterButton(taskFilter === "active", `\u8FDB\u884C\u4E2D ${activeOutbound.length + activeInbound.length}`, () => setTaskFilter("active")),
        filterButton(taskFilter === "done", `\u5DF2\u5B8C\u6210 ${tasks.length + inbound.length - activeOutbound.length - activeInbound.length}`, () => setTaskFilter("done"))
      ),
      h(
        "div",
        { style: { display: "grid", gap: 12, gridTemplateColumns: incomingVisible ? "repeat(auto-fit, minmax(320px, 1fr))" : "1fr" } },
        h(
          "div",
          { style: { ...PANEL.card, marginBottom: 0 } },
          h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u6211\u6D3E\u51FA\u7684\u4EFB\u52A1"), h(PanelChip, null, `${visibleTasks.length} \u6761`)),
          visibleTasks.length ? h("div", null, visibleTasks.slice(0, 10).map((task) => h(TaskLine, { key: task.taskId, task, extra: task.peer }))) : h("div", { style: PANEL.empty }, "\u6CA1\u6709\u7B26\u5408\u7B5B\u9009\u7684\u4EFB\u52A1")
        ),
        incomingVisible ? h(
          "div",
          { style: { ...PANEL.card, marginBottom: 0 } },
          h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u672C\u673A\u6267\u884C / \u6392\u961F"), h(PanelChip, null, `${visibleInbound.length} \u6761`)),
          visibleInbound.length ? visibleInbound.slice(0, 10).map((task) => h(TaskLine, { key: task.taskId, task, extra: task.from })) : h("div", { style: PANEL.empty }, "\u6CA1\u6709\u7B26\u5408\u7B5B\u9009\u7684\u4EFB\u52A1")
        ) : null
      )
    ) : null,
    section === "approvals" ? approvalBlock : null,
    section === "activity" ? h(
      "div",
      { style: PANEL.card },
      h("div", { style: PANEL.cardHead }, h("h3", { style: PANEL.cardTitle }, "\u6D3B\u52A8\u65F6\u95F4\u7EBF"), h(PanelChip, null, `${items.filter(activityMatch).length} \u6761`)),
      h(
        "div",
        { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 } },
        filterButton(activityFilter === "all", "\u5168\u90E8", () => setActivityFilter("all")),
        filterButton(activityFilter === "task", "\u4EFB\u52A1", () => setActivityFilter("task")),
        filterButton(activityFilter === "question", "\u63D0\u95EE/\u5BA1\u6279", () => setActivityFilter("question")),
        filterButton(activityFilter === "file", "\u6587\u4EF6", () => setActivityFilter("file")),
        filterButton(activityFilter === "peer", "\u8282\u70B9", () => setActivityFilter("peer"))
      ),
      activityList(200)
    ) : null
  );
}
function CoCowSettingsPage() {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [tab, setTab] = React.useState("basic");
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [pwdInput, setPwdInput] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState("");
  const [parentPassword, setParentPassword] = React.useState("");
  const [showParentPwd, setShowParentPwd] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const apply2 = React.useCallback((next) => {
    setData(next);
    setForm({
      displayName: next?.config?.displayName ?? "",
      capabilityNote: next?.config?.capabilityNote ?? "",
      allowedRoots: next?.config?.allowedRoots ?? "",
      listenHost: next?.config?.listenHost ?? "127.0.0.1",
      listenPort: next?.config?.listenPort ?? 0,
      maxFileMB: next?.config?.maxFileMB ?? 50
    });
  }, []);
  const load = React.useCallback(async () => {
    setBusy("load");
    setError("");
    try {
      const pwd = await fetch(api("password"), { credentials: "same-origin" }).catch(() => null);
      if (pwd?.ok) {
        const body = await pwd.json().catch(() => null);
        setPwdConfiguredSafe(Boolean(body?.configured));
      }
      const parent2 = await fetch(api("parent"), { credentials: "same-origin" }).catch(() => null);
      if (parent2?.ok) {
        const body = await parent2.json().catch(() => null);
        if (body?.url) setParentUrl(body.url);
        if (body?.password) setParentPassword(body.password);
      }
      const response = await fetch(stateUrl(), { credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply2(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusy("");
    }
  }, [apply2]);
  const [pwdConfigured, setPwdConfiguredSafe] = React.useState(false);
  React.useEffect(() => {
    void load();
  }, [load]);
  React.useEffect(() => {
    if (tab !== "main") return void 0;
    const timer = setInterval(() => {
      fetch(stateUrl(), { credentials: "same-origin" }).then((response) => response.ok ? response.json() : null).then((payload) => {
        if (payload && !payload.error) setData(payload);
      }).catch(() => {
      });
    }, 4e3);
    return () => clearInterval(timer);
  }, [tab]);
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
  ;
  const saveServerSettings = async () => {
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
      if (pwdInput) {
        if (pwdInput.length < 6) throw new Error("\u8FDE\u63A5\u5BC6\u7801\u81F3\u5C11 6 \u4E2A\u5B57\u7B26");
        const pwdResponse = await fetch(api("password"), {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: pwdInput })
        });
        const pwdPayload = await pwdResponse.json();
        if (!pwdResponse.ok) throw new Error(pwdPayload?.error?.message || `HTTP ${pwdResponse.status}`);
        setPwdConfiguredSafe(true);
        setPwdInput("");
      }
      setMessage(pwdInput ? "\u5DF2\u4FDD\u5B58\u670D\u52A1\u5668\u8BBE\u7F6E\u4E0E\u8FDE\u63A5\u5BC6\u7801\u3002" : "\u5DF2\u4FDD\u5B58\u670D\u52A1\u5668\u8BBE\u7F6E\u3002");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const savePassword = async () => {
    if (busy) return;
    if (!pwdInput) {
      setError("\u8BF7\u8F93\u5165\u8FDE\u63A5\u5BC6\u7801");
      return;
    }
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
      setPwdConfiguredSafe(true);
      setPwdInput("");
      setMessage("\u8FDE\u63A5\u5BC6\u7801\u5DF2\u66F4\u65B0\u3002");
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
      setMessage("\u5DF2\u4FDD\u5B58\u4E0A\u7EA7\u914D\u7F6E\uFF0C\u6B63\u5728\u5EFA\u7ACB WebSocket \u957F\u8FDE\u63A5\u2026");
      await new Promise((resolve) => setTimeout(resolve, 800));
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy("");
    }
  };
  const removePeer = async (label) => {
    setBusy(`peer:${label}`);
    try {
      const response = await fetch(api("peers/remove"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply2(payload);
      setMessage(`\u5DF2\u79FB\u9664 ${label}\u3002`);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy("");
    }
  };
  if (!form || !data) {
    return h("div", { style: S.wrap }, error ? h("div", { style: S.err }, error) : h("div", { style: S.lead }, "\u6B63\u5728\u8BFB\u53D6\u72B6\u6001\u2026"));
  }
  const instance = data.instance ?? {};
  const peers = data.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== "parent");
  const parent = data.parent ?? {};
  const stats = data.stats ?? {};
  const role = parent.connected || instance.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH";
  const statusLine = h(
    "div",
    { style: S.row },
    message ? h("span", { style: S.ok }, message) : null,
    error ? h("span", { style: S.err }, error) : null
  );
  const answerQuestion = async (questionId) => {
    setAnswering(questionId);
    setError("");
    try {
      const response = await fetch(api("answer"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, answer: answers[questionId] ?? "" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setAnswers((current) => ({ ...current, [questionId]: "" }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering("");
    }
  };
  const answerTask = async (taskId) => {
    const answer = String(answers[taskId] ?? "").trim();
    if (!answer) {
      setError("\u8BF7\u5148\u586B\u5199\u7B54\u6848");
      return;
    }
    setBusy(`answer:${taskId}`);
    setError("");
    try {
      const response = await fetch(api("answer"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, answer })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply2(payload);
      setAnswers((current) => ({ ...current, [taskId]: "" }));
      setMessage("\u5DF2\u56DE\u7B54\u8FDC\u7AEF\u95EE\u9898");
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setBusy("");
    }
  };
  const upgradePeer = async (peer) => {
    setBusy(`upgrade:${peer}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(api("upgrade"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ peer })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      if (payload.status === "succeeded" || payload.status === "current") {
        setMessage(`${peer}\uFF1A${payload.message || "\u5347\u7EA7\u5B8C\u6210"}`);
      } else {
        setMessage(`${peer}\uFF1A${payload.message || "\u5B89\u88C5\u5B8C\u6210\uFF0C\u7B49\u5F85\u5B50\u7AEF\u91CD\u8FDE"}${payload.version ? `\uFF08\u5F53\u524D ${payload.version}\uFF09` : ""}`);
      }
      const state = await fetch(stateUrl(), { credentials: "same-origin" });
      if (state.ok) apply2(await state.json());
    } catch (upgradeError) {
      setError(upgradeError.message);
    } finally {
      setBusy("");
    }
  };
  const cancelTask = async (taskId) => {
    setBusy(`cancel:${taskId}`);
    setError("");
    try {
      const response = await fetch(api("cancel"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, reason: "\u914D\u7F6E\u9875\u53D6\u6D88" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply2(payload);
      setMessage("\u5DF2\u53D6\u6D88\u4EFB\u52A1");
    } catch (cancelError) {
      setError(cancelError.message);
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
    setMessage("\u5DF2\u751F\u6210\u968F\u673A\u8FDE\u63A5\u5BC6\u94A5\uFF0C\u4FDD\u5B58\u540E\u751F\u6548");
  };
  const refreshTasks = async () => {
    setBusy("refresh");
    try {
      const response = await fetch(stateUrl(), { credentials: "same-origin" });
      const payload = await response.json();
      if (response.ok) apply2(payload);
    } catch {
    } finally {
      setBusy("");
    }
  };
  const tabButton = (id, label) => h("button", {
    type: "button",
    role: "tab",
    "aria-selected": tab === id,
    style: tab === id ? S.tabActive : S.tab,
    onClick: () => setTab(id)
  }, label);
  return h(
    "div",
    { style: S.wrap },
    h("div", { style: S.tabs }, tabButton("basic", "\u8282\u70B9\u914D\u7F6E"), tabButton("main", "\u4F5C\u4E3A\u4E3B DSH"), tabButton("child", "\u4F5C\u4E3A\u5B50 DSH")),
    tab === "basic" ? h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.formGrid },
        h(
          Row,
          { label: "\u8282\u70B9\u540D\u79F0" },
          h("input", { style: S.inputFlex, value: form.displayName, placeholder: "\u7559\u7A7A\u5219\u4F7F\u7528\u8BA1\u7B97\u673A\u540D", onChange: (e) => update("displayName", e.target.value) })
        ),
        h(
          Row,
          { label: "\u9644\u52A0\u8BF4\u660E" },
          h("textarea", { style: { ...S.inputFlex, minHeight: 52, resize: "vertical" }, placeholder: "\u53EF\u9009\uFF0C\u9644\u5728\u8282\u70B9\u8BF4\u660E\u540E\u9762", value: form.capabilityNote, onChange: (e) => update("capabilityNote", e.target.value) })
        ),
        h(
          Row,
          { label: "\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55" },
          h("input", { style: S.inputFlex, placeholder: data?.defaultAllowedRoot ? `\u4F8B\u5982 ${data.defaultAllowedRoot}\uFF1B\u7559\u7A7A\u81EA\u52A8\u4F7F\u7528\u5B83` : "\u7559\u7A7A\u81EA\u52A8\u4F7F\u7528\u9ED8\u8BA4\u6570\u636E\u76EE\u5F55", value: String(form.allowedRoots || "").split("\n")[0], onChange: (e) => update("allowedRoots", e.target.value.trim()) })
        ),
        h(
          "div",
          { style: { gridColumn: "2", display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" } },
          statusLine,
          h("button", { type: "button", style: S.button, disabled: Boolean(busy), onClick: saveSettings }, busy === "save" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
        )
      )
    ) : null,
    tab === "main" ? h(
      React.Fragment,
      null,
      h(
        "div",
        { style: S.card },
        h(
          "div",
          { style: S.formGrid },
          h(
            Row,
            { label: "\u76D1\u542C\u5730\u5740" },
            h(
              "select",
              { style: { ...S.inputFlex, flex: "0 0 200px", height: 33 }, value: form.listenHost, onChange: (e) => update("listenHost", e.target.value) },
              h("option", { value: "127.0.0.1" }, "127.0.0.1\uFF08\u4EC5\u672C\u673A\uFF09"),
              h("option", { value: "0.0.0.0" }, "0.0.0.0\uFF08\u6240\u6709\u7F51\u5361\uFF09")
            ),
            h("span", { style: { ...S.meta, paddingTop: 7 } }, "\u7AEF\u53E3"),
            h("input", { type: "number", style: { ...S.inputFlex, flex: "0 0 120px", minWidth: 90 }, placeholder: "\u9ED8\u8BA4 59999", value: String(form.listenPort ?? 0), onChange: (e) => update("listenPort", Number(e.target.value) || 0) })
          ),
          h(
            Row,
            { label: "\u6587\u4EF6\u4E0A\u9650" },
            h(
              "div",
              { style: S.row },
              h("input", { type: "number", style: { ...S.inputFlex, flex: "0 0 120px", minWidth: 90 }, placeholder: "\u9ED8\u8BA4 50", value: String(form.maxFileMB ?? 50), onChange: (e) => update("maxFileMB", Number(e.target.value) || 50) }),
              h("span", { style: S.meta }, "MB\uFF08\u5355\u4E2A\u4EA4\u6362\u6587\u4EF6\u7684\u4E0A\u9650\uFF09")
            )
          ),
          h(
            Row,
            { label: "\u8FDE\u63A5\u5BC6\u7801" },
            h("input", { type: showPwd ? "text" : "password", style: S.inputFlex, placeholder: "\u81F3\u5C11 12 \u4E2A\u5B57\u7B26\uFF1B\u53EF\u70B9\u53F3\u4FA7\u751F\u6210\u968F\u673A\u5BC6\u94A5", value: pwdInput, onChange: (e) => setPwdInput(e.target.value) }),
            h("button", { type: "button", style: S.secondary, onClick: () => setShowPwd((v) => !v) }, showPwd ? "\u9690\u85CF" : "\u663E\u793A"),
            h("button", { type: "button", style: S.secondary, onClick: generatePassword, title: "\u751F\u6210 32 \u5B57\u8282\u968F\u673A\u5BC6\u94A5\uFF08base64url\uFF09" }, "\u751F\u6210\u968F\u673A\u5BC6\u94A5"),
            h("span", { style: pwdConfigured ? S.badgeOn : S.badgeOff }, pwdConfigured ? "\u5DF2\u8BBE\u7F6E" : "\u672A\u8BBE\u7F6E"),
            pwdInput ? h("span", { style: pwdInput.length >= 32 ? S.badgeOn : pwdInput.length >= 12 ? S.badgeOff : { ...S.badgeOff, color: "var(--dsw-alias-label-danger, #d95e4b)" } }, pwdInput.length >= 32 ? `\u5F3A\uFF08${pwdInput.length} \u4F4D\uFF09` : pwdInput.length >= 12 ? `\u4E2D\uFF08${pwdInput.length} \u4F4D\uFF09` : `\u592A\u77ED\uFF08${pwdInput.length} \u4F4D\uFF09`) : null
          ),
          h(
            Row,
            { label: "" },
            h(
              "div",
              { style: { display: "flex", justifyContent: "flex-end" } },
              h("button", { type: "button", style: S.button, disabled: Boolean(busy), onClick: saveServerSettings }, busy === "save" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
            )
          ),
          h(Row, { label: "" }, statusLine),
          h(
            Row,
            { label: "\u8FDE\u63A5\u5730\u5740" },
            h("span", { style: { ...S.meta, paddingTop: 7 } }, instance.endpoint ? `${instance.endpoint.replace(/^http/, "ws")}/channel` : "\uFF08\u672A\u5C31\u7EEA\uFF09")
          ),
          h(Row, { label: "" }, h("span", { style: S.hint }, "\u5B50 DSH \u5728\u300C\u4E0A\u7EA7\u5730\u5740\u300D\u4E2D\u586B\u4E0A\u9762\u7684\u8FDE\u63A5\u5730\u5740\uFF0C\u5BC6\u7801\u5C31\u662F\u4E0A\u9762\u7684\u8FDE\u63A5\u5BC6\u7801\u3002\u6BCF\u4E2A\u8282\u70B9\u5404\u81EA\u8BBE\u7F6E\u5BC6\u7801\uFF1A\u672C\u8282\u70B9\u7684\u4E0B\u7EA7\u7528\u8FD9\u4E2A\u5BC6\u7801\uFF0C\u4E2D\u95F4\u8282\u70B9\u7684\u4E0B\u7EA7\u7528\u4E2D\u95F4\u8282\u70B9\u81EA\u5DF1\u7684\u5BC6\u7801\u3002\u5BC6\u7801\u53EA\u4FDD\u5B58\u6458\u8981\uFF0C\u4E0D\u56DE\u663E\u3002"))
        )
      ),
      h(
        "div",
        { style: S.card },
        h(
          "div",
          { style: S.cardHead },
          h("h3", { style: S.cardTitle }, "\u5DF2\u8FDE\u63A5\u7684\u5B50 DSH"),
          h("span", { style: S.badgeOff }, `${children.length} \u4E2A`)
        ),
        children.length > 0 ? h("div", null, children.map((peer) => h(PeerRow, { key: peer.label, peer, busy, onRemove: removePeer, onUpgrade: upgradePeer, currentVersion: data?.pluginVersion }))) : h("div", { style: S.hint }, "\u8FD8\u6CA1\u6709\u5B50 DSH \u8FDE\u4E0A\u6765\u3002")
      ),
      h(
        "div",
        { style: S.card },
        (() => {
          const activeTasks = (data.tasks ?? []).filter((task) => ["queued", "running"].includes(task.status) || task.pendingQuestion);
          return h(
            React.Fragment,
            null,
            h(
              "div",
              { style: S.cardHead },
              h("h3", { style: S.cardTitle }, "\u4EFB\u52A1\u961F\u5217\u4E0E\u63D0\u95EE"),
              h("span", { style: S.badgeOff }, `${activeTasks.length} \u4E2A\u5F85\u5904\u7406`),
              h("button", { type: "button", style: S.secondary, disabled: Boolean(busy), onClick: refreshTasks }, busy === "refresh" ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0")
            ),
            activeTasks.length === 0 ? h("div", { style: S.hint }, "\u5F53\u524D\u6CA1\u6709\u6392\u961F/\u6267\u884C\u4E2D\u7684\u4EFB\u52A1\u3002") : activeTasks.map((task) => h(
              "div",
              { key: task.taskId, style: S.listRow },
              h(
                "div",
                { style: { display: "grid", gap: 4, minWidth: 0, flex: "1 1 auto" } },
                h(
                  "div",
                  { style: S.row },
                  h("span", { style: { fontSize: 12, fontWeight: 600 } }, task.title || task.taskId),
                  h("span", { style: ["queued", "running"].includes(task.status) ? S.badgeOn : S.badgeOff }, task.status === "queued" && task.queuePosition ? `\u6392\u961F\u7B2C ${task.queuePosition} \u4F4D` : task.status),
                  h("span", { style: S.meta }, task.peer || ""),
                  h("button", {
                    type: "button",
                    style: { ...S.secondary, marginLeft: "auto" },
                    disabled: Boolean(busy),
                    title: "\u53D6\u6D88\u8FD9\u4E2A\u4EFB\u52A1\uFF08\u6392\u961F\u4E2D\u7684\u4F1A\u76F4\u63A5\u51FA\u961F\uFF09",
                    onClick: () => cancelTask(task.taskId)
                  }, busy === `cancel:${task.taskId}` ? "\u53D6\u6D88\u4E2D\u2026" : "\u53D6\u6D88")
                ),
                task.pendingQuestion ? h(
                  "div",
                  { style: { display: "grid", gap: 6 } },
                  h("div", { style: S.meta }, `\u8FDC\u7AEF\u63D0\u95EE\uFF1A${task.pendingQuestion.question}`),
                  Array.isArray(task.pendingQuestion.options) && task.pendingQuestion.options.length ? h("div", { style: S.row }, task.pendingQuestion.options.map((option) => h("button", {
                    key: option,
                    type: "button",
                    style: S.secondary,
                    onClick: () => setAnswers((current) => ({ ...current, [task.taskId]: option }))
                  }, option))) : null,
                  h(
                    "div",
                    { style: S.row },
                    h("input", {
                      style: { ...S.inputFlex, flex: "1 1 auto" },
                      placeholder: "\u56DE\u7B54\u8FD9\u4E2A\u8FDC\u7AEF\u95EE\u9898",
                      value: answers[task.taskId] ?? "",
                      onChange: (e) => setAnswers((current) => ({ ...current, [task.taskId]: e.target.value }))
                    }),
                    h("button", { type: "button", style: S.button, disabled: Boolean(busy), onClick: () => answerTask(task.taskId) }, busy === `answer:${task.taskId}` ? "\u53D1\u9001\u4E2D\u2026" : "\u56DE\u7B54")
                  )
                ) : null,
                task.artifacts?.length ? h("div", { style: S.meta }, `\u4EA7\u7269 ${task.artifacts.length} \u4E2A\uFF1A${task.artifacts.slice(0, 3).map((item) => item.localPath || item.name).join("\uFF0C")}`) : null
              )
            ))
          );
        })()
      )
    ) : null,
    tab === "child" ? h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.formGrid },
        h(
          Row,
          { label: "\u4E0A\u7EA7\u5730\u5740" },
          h("input", { style: S.inputFlex, placeholder: "ws://192.168.1.10:49170/cow/v1/channel \u6216 http://\u2026/cow/v1", value: parentUrl, onChange: (e) => setParentUrl(e.target.value) })
        ),
        h(
          Row,
          { label: "\u8FDE\u63A5\u5BC6\u7801" },
          h("input", { type: showParentPwd ? "text" : "password", style: S.inputFlex, placeholder: "\u4E3B DSH \u8BBE\u7F6E\u7684\u8FDE\u63A5\u5BC6\u7801", value: parentPassword, onChange: (e) => setParentPassword(e.target.value) }),
          h("button", { type: "button", style: S.secondary, onClick: () => setShowParentPwd((v) => !v) }, showParentPwd ? "\u9690\u85CF" : "\u663E\u793A")
        ),
        h(
          Row,
          { label: "\u8FDE\u63A5\u72B6\u6001" },
          h(
            "div",
            { style: S.row },
            h("span", { style: parent.connected ? S.badgeOn : S.badgeOff }, parent.connected ? "\u5DF2\u8FDE\u63A5\uFF08WebSocket\uFF09" : "\u672A\u8FDE\u63A5"),
            parent.node?.version ? h("span", { style: S.meta }, `\u4E0A\u7EA7\u7248\u672C v${parent.node.version}`) : null
          )
        ),
        h(
          Row,
          { label: "\u4E0A\u7EA7 ID" },
          h("span", { style: { ...S.mono, paddingTop: 7, wordBreak: "break-all" } }, parent.node?.uuid || "-")
        ),
        parent.node?.description ? h(Row, { label: "\u4E0A\u7EA7\u8BF4\u660E" }, h("div", { style: { ...S.meta, flex: "1 1 auto", whiteSpace: "pre-wrap", lineHeight: 1.7, paddingTop: 6 } }, String(parent.node.description).slice(0, 400))) : null,
        h(
          Row,
          { label: "\u5F53\u524D\u4EFB\u52A1" },
          h("span", { style: { ...S.meta, paddingTop: 7 } }, data.currentInbound ? `${data.currentInbound.remoteTaskId}\uFF08\u6267\u884C\u4E2D\uFF09` : "\u7A7A\u95F2")
        ),
        h(
          "div",
          { style: { gridColumn: "2", display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 4 } },
          statusLine,
          h("button", { type: "button", style: S.button, disabled: Boolean(busy), onClick: saveParent }, busy === "parent" ? "\u8FDE\u63A5\u4E2D\u2026" : "\u4FDD\u5B58\u5E76\u8FDE\u63A5")
        ),
        h(Row, { label: "" }, h("span", { style: S.hint }, "\u4FDD\u5B58\u540E\u5B50 DSH \u4F1A\u4E3B\u52A8\u5EFA\u7ACB\u5E76\u7EF4\u6301 WebSocket \u957F\u8FDE\u63A5\uFF1B\u65AD\u7EBF\u81EA\u52A8\u91CD\u8FDE\u3002\u5B50 DSH \u4E0D\u4E0A\u62A5\u81EA\u5DF1\u7684\u76D1\u542C\u7AEF\u53E3\u3002"))
      )
    ) : null,
    h("div", { style: S.hint }, "dsh-cow \u901A\u8FC7 WebSocket \u5168\u53CC\u5DE5 JSON \u901A\u8BAF\uFF1B\u540C\u4E00\u5BC6\u7801\u7528\u4E8E\u6240\u6709\u5B50 DSH\u3002")
  );
}
var name = "dsh-cow-client";
var inject = ["slots"];
function apply(ctx) {
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
    }, CowActivityIcon));
  } catch {
  }
  try {
    ctx.slots.inject("settings.section", () => {
      const unregister = ctx.slots.register(
        { name: "settings.section", id: "dsh-cow", order: 23, label: () => "dsh-cow", inject: () => ({}) },
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
