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
function CowActivityPanel() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const [answering, setAnswering2] = React.useState("");
  const answerQuestion = async (questionId) => {
    setAnswering2(questionId);
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
      setAnswering2("");
    }
  };
  const answerTask = async (taskId) => {
    setAnswering2(taskId);
    setError("");
    try {
      const response = await fetch(api("answer"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId, answer: answers[taskId] ?? "" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setAnswers((current) => ({ ...current, [taskId]: "" }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering2("");
    }
  };
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activityResponse, stateResponse] = await Promise.all([
        fetch(activityUrl(), { credentials: "same-origin" }),
        fetch(stateUrl(), { credentials: "same-origin" })
      ]);
      const activity = await activityResponse.json();
      const state = stateResponse.ok ? await stateResponse.json() : null;
      if (!activityResponse.ok) throw new Error(activity?.error?.message || `HTTP ${activityResponse.status}`);
      setData({ activity, state });
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
  const items = data?.activity?.items ?? [];
  const stats = data?.activity?.stats ?? {};
  const version = data?.state?.pluginVersion ?? "";
  const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("zh-CN", { hour12: false });
  };
  return h(
    "div",
    { style: { ...S.wrap, padding: "18px 20px 28px", height: "100%", overflowY: "auto", boxSizing: "border-box" } },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 } },
      h("div", { style: { width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--dsw-alias-brand-primary)", color: "#fff" } }, h(CowActivityIcon, { size: 16 })),
      h("h2", { style: { margin: 0, fontSize: 16, fontWeight: 650 } }, "COW\u72B6\u6001"),
      version ? h("span", { style: S.badgeOff }, `v${version}`) : null,
      h("span", { style: S.badgeOn }, `\u8FDE\u63A5 ${stats.connected ?? 0}`),
      h("span", { style: stats.encrypted ? S.badgeOn : S.badgeOff }, `\u52A0\u5BC6 ${stats.encrypted ?? 0}`),
      stats.queued ? h("span", { style: S.badgeOff }, `\u6392\u961F ${stats.queued}`) : null,
      h("button", { type: "button", style: { ...S.secondary, marginLeft: "auto" }, onClick: () => {
        void load();
      }, disabled: loading }, loading ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0")
    ),
    h("p", { style: { ...S.hint, margin: "2px 0 14px" } }, "\u672C\u673A\u8282\u70B9\u4FE1\u606F\u3001\u4EFB\u52A1\u3001\u63D0\u95EE\u3001\u6587\u4EF6\u4E0E\u8282\u70B9\u4E8B\u4EF6\uFF1B\u6BCF 4 \u79D2\u81EA\u52A8\u5237\u65B0\u3002"),
    (() => {
      const info = data?.state?.instance ?? {};
      const cfg = data?.state?.config ?? {};
      const peerRows = data?.state?.peers ?? [];
      const parent = data?.state?.parent ?? {};
      const stats2 = data?.state?.stats ?? {};
      const tasks = data?.state?.tasks ?? [];
      const roleLabel = parent.connected || info.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH";
      const endpoint = info.endpoint ? `${String(info.endpoint).replace(/^http/, "ws")}/channel` : "\u672A\u5C31\u7EEA";
      const rows = [
        ["\u8282\u70B9\u540D\u79F0", info.displayName || "-"],
        ["\u7248\u672C", info.version ? `v${info.version}` : "-"],
        ["\u89D2\u8272", `${roleLabel}\uFF08\u5DF2\u8FDE\u63A5 ${stats2.connected ?? 0} / ${stats2.peers ?? 0} \u4E2A\u8282\u70B9\uFF09`],
        ["\u552F\u4E00\u6807\u8BC6", info.uuid || info.instanceId || "-"],
        ["WebSocket", endpoint],
        ["\u4E0A\u7EA7", parent.url ? `${parent.url}\uFF08${parent.connected ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5"}\uFF09` : "\u65E0"],
        ["\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55", cfg.allowedRoots || "-"],
        ["\u5F53\u524D\u4EFB\u52A1", data?.state?.currentInbound ? `${data.state.currentInbound.remoteTaskId}\uFF08${data.state.currentInbound.from}\uFF09` : "\u7A7A\u95F2"],
        ["\u6700\u8FD1\u4EFB\u52A1", tasks.slice(0, 3).map((t) => `${t.taskId.slice(-6)} ${t.status}`).join("\uFF0C") || "\u65E0"]
      ];
      return h(
        "div",
        { style: S.card },
        h(
          "div",
          { style: S.cardHead },
          h("h3", { style: S.cardTitle }, "\u672C\u673A\u8282\u70B9"),
          h("span", { style: stats2.encrypted ? S.badgeOn : S.badgeOff }, stats2.encrypted ? `\u52A0\u5BC6\u8FDE\u63A5 ${stats2.encrypted}` : "\u672A\u52A0\u5BC6\u8FDE\u63A5")
        ),
        h("div", { style: { display: "grid", gap: 4 } }, rows.map(([label, value]) => h(
          "div",
          { key: label, style: { display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: 8, fontSize: 12, lineHeight: 1.6 } },
          h("span", { style: S.meta }, label),
          h("span", { style: { wordBreak: "break-all" } }, value)
        ))),
        info.description ? h("div", { style: { ...S.meta, marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 } }, info.description) : null
      );
    })(),
    (() => {
      const outbound = (data?.state?.tasks ?? []).slice(0, 8);
      const inbound = (data?.state?.inboundTasks ?? []).slice(0, 8);
      const pending = (data?.state?.tasks ?? []).filter((task) => task.pendingQuestion);
      const row = (task, extra) => h(
        "div",
        { key: `${extra || ""}${task.taskId}`, style: S.listRow },
        h(
          "div",
          { style: { display: "grid", gap: 2, minWidth: 0, flex: "1 1 auto" } },
          h(
            "div",
            { style: S.row },
            h("span", { style: { fontSize: 12, fontWeight: 600 } }, task.title || task.taskId),
            h(
              "span",
              { style: ["queued", "running"].includes(task.status) ? S.badgeOn : S.badgeOff },
              task.status === "queued" && task.queuePosition ? `\u6392\u961F\u7B2C ${task.queuePosition} \u4F4D` : task.status
            ),
            h("span", { style: S.meta }, extra || ""),
            task.finishedAt ? h("span", { style: S.meta }, new Date(task.finishedAt).toLocaleTimeString("zh-CN", { hour12: false })) : null
          ),
          h("div", { style: { ...S.meta, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, task.prompt || task.summary || "")
        )
      );
      return h(
        React.Fragment,
        null,
        h(
          "div",
          { style: S.card },
          h(
            "div",
            { style: S.cardHead },
            h("h3", { style: S.cardTitle }, "\u6211\u6D3E\u51FA\u7684\u4EFB\u52A1"),
            h("span", { style: S.badgeOff }, `${outbound.length} \u6761`)
          ),
          outbound.length === 0 ? h("div", { style: S.hint }, "\u8FD8\u6CA1\u6709\u6D3E\u53D1\u4EFB\u52A1\u3002") : h("div", null, outbound.map((task) => row(task, task.peer)))
        ),
        h(
          "div",
          { style: S.card },
          h(
            "div",
            { style: S.cardHead },
            h("h3", { style: S.cardTitle }, "\u672C\u673A\u6267\u884C / \u6392\u961F"),
            h("span", { style: S.badgeOff }, `${inbound.length} \u6761`)
          ),
          inbound.length === 0 ? h("div", { style: S.hint }, "\u5F53\u524D\u6CA1\u6709\u672C\u673A\u6267\u884C\u7684\u5165\u7AD9\u4EFB\u52A1\u3002") : h("div", null, inbound.map((task) => row(task, task.from)))
        ),
        pending.length ? h(
          "div",
          { style: S.card },
          h(
            "div",
            { style: S.cardHead },
            h("h3", { style: S.cardTitle }, "\u5F85\u4EBA\u5DE5\u5904\u7406\u7684\u5BA1\u6279 / \u63D0\u95EE"),
            h("span", { style: S.badgeOn }, `${pending.length} \u6761`)
          ),
          h("div", { style: { display: "grid", gap: 8 } }, pending.map((task) => h(
            "div",
            { key: task.taskId, style: { borderTop: "1px solid var(--dsw-alias-border-l2)", paddingTop: 8 } },
            h("div", { style: { fontSize: 12.5, lineHeight: 1.5 } }, `${task.title || task.taskId}\uFF1A${task.pendingQuestion?.question || ""}`),
            task.pendingQuestion?.options?.length ? h("div", { style: { ...S.row, marginTop: 6 } }, task.pendingQuestion.options.map((option) => h("button", {
              key: option,
              type: "button",
              style: S.secondary,
              onClick: () => setAnswers((current) => ({ ...current, [task.taskId]: option }))
            }, option))) : null,
            h(
              "div",
              { style: { ...S.row, marginTop: 6 } },
              h("input", {
                style: { ...S.inputFlex, flex: "1 1 auto" },
                placeholder: "\u56DE\u7B54\u5B50 DSH \u7684\u63D0\u95EE / \u5BA1\u6279",
                value: answers[task.taskId] ?? "",
                onChange: (e) => setAnswers((current) => ({ ...current, [task.taskId]: e.target.value }))
              }),
              h("button", { type: "button", style: S.button, disabled: Boolean(answering), onClick: () => answerTask(task.taskId) }, answering === task.taskId ? "\u53D1\u9001\u4E2D\u2026" : "\u56DE\u7B54")
            )
          )))
        ) : null,
        (data?.state?.questions ?? []).length ? h(
          "div",
          { style: S.card },
          h(
            "div",
            { style: S.cardHead },
            h("h3", { style: S.cardTitle }, "\u5B50 DSH \u5F85\u5904\u7406\u63D0\u95EE / \u5BA1\u6279"),
            h("span", { style: S.badgeOn }, `${data.state.questions.length} \u6761`)
          ),
          h("div", { style: { display: "grid", gap: 8 } }, data.state.questions.map((question) => h(
            "div",
            { key: question.questionId, style: { borderTop: "1px solid var(--dsw-alias-border-l2)", paddingTop: 8 } },
            h("div", { style: { fontSize: 12.5, lineHeight: 1.5 } }, `${question.from || "\u5B50 DSH"}\uFF1A${question.question || ""}`),
            question.options?.length ? h("div", { style: { ...S.row, marginTop: 6 } }, question.options.map((option) => h("button", {
              key: option,
              type: "button",
              style: S.secondary,
              onClick: () => setAnswers((current) => ({ ...current, [question.questionId]: option }))
            }, option))) : null,
            h(
              "div",
              { style: { ...S.row, marginTop: 6 } },
              h("input", {
                style: { ...S.inputFlex, flex: "1 1 auto" },
                placeholder: "\u56DE\u7B54\u5B50 DSH \u7684\u63D0\u95EE / \u5BA1\u6279",
                value: answers[question.questionId] ?? "",
                onChange: (e) => setAnswers((current) => ({ ...current, [question.questionId]: e.target.value }))
              }),
              h("button", { type: "button", style: S.button, disabled: Boolean(answering), onClick: () => answerQuestion(question.questionId) }, answering === question.questionId ? "\u53D1\u9001\u4E2D\u2026" : "\u56DE\u7B54")
            )
          )))
        ) : null
      );
    })(),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8, margin: "16px 0 8px" } },
      h("h3", { style: S.cardTitle }, "\u6700\u8FD1\u6D3B\u52A8"),
      h("span", { style: S.meta }, `${items.length} \u6761`)
    ),
    error ? h("div", { style: { ...S.hint, color: "var(--dsw-alias-label-danger, #d95e4b)" } }, `\u52A0\u8F7D\u5931\u8D25\uFF1A${error}`) : null,
    items.length === 0 ? h("div", { style: { ...S.hint, padding: "32px 0", textAlign: "center" } }, "\u8FD8\u6CA1\u6709\u6D3B\u52A8\u3002\u6D3E\u53D1\u4EFB\u52A1\u6216\u8FDE\u63A5\u8282\u70B9\u540E\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002") : h("div", { style: { display: "grid", gap: 6 } }, items.map((item) => {
      const kind = ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info;
      return h(
        "div",
        {
          key: item.id,
          style: { display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l1)" }
        },
        h("span", { style: { flex: "0 0 auto", marginTop: 1, fontSize: 10, fontWeight: 600, color: kind.color, border: `1px solid ${kind.color}`, borderRadius: 999, padding: "1px 6px" } }, kind.label),
        h(
          "div",
          { style: { minWidth: 0, flex: "1 1 auto" } },
          h("div", { style: { fontSize: 12.5, lineHeight: 1.5, wordBreak: "break-word" } }, item.text || "\uFF08\u65E0\u63CF\u8FF0\uFF09"),
          h(
            "div",
            { style: { ...S.meta, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 } },
            h("span", null, timeOf(item.at)),
            item.peer ? h("span", null, item.peer) : null,
            item.taskId ? h("span", { style: S.mono }, item.taskId.slice(-10)) : null,
            item.status ? h("span", null, item.status) : null
          )
        )
      );
    }))
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
