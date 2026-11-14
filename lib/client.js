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
  input: { flex: "1 1 auto", minWidth: 120, boxSizing: "border-box", padding: "7px 10px", borderRadius: "var(--dsw-radius-sm, 6px)", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", fontSize: 12, outline: "none" },
  textarea: { flex: "1 1 auto", minWidth: 120, minHeight: 64, boxSizing: "border-box", padding: "7px 10px", borderRadius: "var(--dsw-radius-sm, 6px)", border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", fontSize: 12, outline: "none", resize: "vertical" },
  button: { border: "1px solid var(--dsw-alias-button-primary-fill)", background: "var(--dsw-alias-button-primary-fill)", color: "var(--dsw-alias-label-primary-foreground)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  secondary: { border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  danger: { border: "1px solid var(--dsw-alias-border-l2)", background: "transparent", color: "var(--dsw-alias-label-error)", borderRadius: "var(--dsw-radius-sm, 6px)", padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)", lineHeight: 1.6 },
  badge: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-primary)", border: "1px solid var(--dsw-alias-border-l2)" },
  badgeOn: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "rgba(52,199,89,.14)", color: "#2ea043", border: "1px solid rgba(52,199,89,.35)" },
  badgeOff: { display: "inline-flex", alignItems: "center", padding: "1px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-l2)", color: "var(--dsw-alias-label-secondary)", border: "1px solid var(--dsw-alias-border-l2)" },
  meta: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" },
  err: { fontSize: 12, color: "var(--dsw-alias-label-error)" },
  ok: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
  listRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--dsw-alias-border-l2)" },
  row: { display: "flex", gap: 8, alignItems: "center", minWidth: 0, flexWrap: "wrap" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11 },
  panel: { display: "flex", flexDirection: "column", gap: 12, padding: 12, color: "var(--dsw-alias-label-primary)" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 },
  stat: { border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, padding: "8px 10px" },
  statValue: { fontSize: 18, fontWeight: 600 }
};
function Row({ label, children }) {
  return h(
    "div",
    { style: { display: "contents" } },
    h("span", { style: S.formLabel }, label),
    h("div", { style: S.formValue }, children)
  );
}
function timeLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return String(value);
  }
}
function StatCard({ label, value }) {
  return h(
    "div",
    { style: S.stat },
    h("div", { style: S.meta }, label),
    h("div", { style: S.statValue }, String(value ?? 0))
  );
}
function PeerRow({ peer, onRemove }) {
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
        h("span", { style: S.badge }, peer.relation === "parent" ? "\u4E0A\u7EA7" : "\u4E0B\u7EA7"),
        peer.version ? h("span", { style: S.meta }, `v${peer.version}`) : null,
        peer.encrypted ? h("span", { style: S.badge }, "E2E") : null
      ),
      peer.description ? h("div", { style: { ...S.meta, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } }, String(peer.description)) : null
    ),
    onRemove ? h("button", { type: "button", style: { ...S.danger, flexShrink: 0, whiteSpace: "nowrap" }, onClick: () => onRemove(peer.label) }, "\u79FB\u9664") : null
  );
}
function AskRow({ ask, value, busy, onChange, onAnswer }) {
  return h(
    "div",
    { style: S.listRow },
    h(
      "div",
      { style: { display: "grid", gap: 4, minWidth: 0, flex: 1 } },
      h(
        "div",
        { style: S.row },
        h("span", { style: { fontSize: 12, fontWeight: 600 } }, ask.peer),
        h("span", { style: S.meta }, timeLabel(ask.createdAt))
      ),
      h("div", { style: { fontSize: 12, lineHeight: 1.6 } }, ask.question),
      (ask.options ?? []).length ? h("div", { style: S.row }, ask.options.map((option, index) => h("button", {
        key: index,
        type: "button",
        style: S.secondary,
        disabled: Boolean(busy),
        onClick: () => onAnswer(ask, option)
      }, option))) : null,
      h(
        "div",
        { style: S.row },
        h("input", {
          style: S.input,
          placeholder: "\u56DE\u7B54\u5185\u5BB9",
          value: value ?? "",
          onChange: (event) => onChange(ask.questionId, event.target.value)
        }),
        h("button", {
          type: "button",
          style: S.button,
          disabled: Boolean(busy),
          onClick: () => onAnswer(ask, value ?? "")
        }, busy === `answer:${ask.questionId}` ? "\u53D1\u9001\u4E2D\u2026" : "\u56DE\u7B54")
      )
    )
  );
}
function ActivityList({ items }) {
  if (!items?.length) return h("div", { style: S.hint }, "\u8FD8\u6CA1\u6709\u6D3B\u52A8\u8BB0\u5F55\u3002");
  return h("div", null, items.slice(0, 30).map((item) => h(
    "div",
    { key: item.id, style: S.listRow },
    h(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      h("div", { style: { fontSize: 12 } }, item.text),
      h("div", { style: S.meta }, `${timeLabel(item.at)}${item.peer ? ` \xB7 ${item.peer}` : ""}${item.status ? ` \xB7 ${item.status}` : ""}`)
    ),
    h("span", { style: S.badge }, item.kind)
  )));
}
function CowStatusPanel() {
  const [state, setState] = React.useState(null);
  const [activity, setActivity] = React.useState([]);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [stateResponse, activityResponse] = await Promise.all([
          fetch(stateUrl(), { credentials: "same-origin" }),
          fetch(activityUrl(30), { credentials: "same-origin" })
        ]);
        const nextState = await stateResponse.json();
        const nextActivity = await activityResponse.json();
        if (!alive) return;
        setState(nextState);
        setActivity(nextActivity?.items ?? []);
        setError("");
      } catch (loadError) {
        if (alive) setError(loadError.message);
      }
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5e3);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (error) return h("div", { style: { ...S.panel, color: "var(--dsw-alias-label-error)" } }, `\u72B6\u6001\u4E0D\u53EF\u7528\uFF1A${error}`);
  if (!state) return h("div", { style: S.panel }, "\u6B63\u5728\u8BFB\u53D6 dsh-cow \u72B6\u6001\u2026");
  const peers = state.peers ?? [];
  const pending = state.pendingAsks ?? [];
  return h(
    "div",
    { style: S.panel },
    h(
      "div",
      { style: { ...S.row, justifyContent: "space-between" } },
      h("div", { style: { fontSize: 13, fontWeight: 600 } }, state.instance?.displayName || state.instance?.instanceId),
      h("span", { style: S.badge }, `v${state.pluginVersion || state.instance?.version || ""}`)
    ),
    h("div", { style: S.meta }, `${state.instance?.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH"} \xB7 ${state.instance?.endpoint || "\u672A\u76D1\u542C"}`),
    h(
      "div",
      { style: S.statGrid },
      h(StatCard, { label: "\u8282\u70B9", value: peers.length }),
      h(StatCard, { label: "\u5728\u7EBF", value: peers.filter((peer) => peer.connected).length }),
      h(StatCard, { label: "\u5F85\u56DE\u7B54", value: pending.length })
    ),
    h(
      "div",
      { style: { display: "grid", gap: 4 } },
      h("div", { style: { fontSize: 12, fontWeight: 600 } }, "\u8282\u70B9"),
      peers.length ? peers.map((peer) => h(
        "div",
        { key: peer.label, style: S.row },
        h("span", { style: { fontSize: 12 } }, peer.label),
        h("span", { style: peer.connected ? S.badgeOn : S.badgeOff }, peer.connected ? "\u5728\u7EBF" : "\u79BB\u7EBF"),
        h("span", { style: S.meta }, peer.relation === "parent" ? "\u4E0A\u7EA7" : "\u4E0B\u7EA7")
      )) : h("div", { style: S.hint }, "\u8FD8\u6CA1\u6709\u767B\u8BB0\u4EFB\u4F55\u8282\u70B9\u3002")
    ),
    h(
      "div",
      { style: { display: "grid", gap: 4 } },
      h("div", { style: { fontSize: 12, fontWeight: 600 } }, "\u5F85\u56DE\u7B54\u8BE2\u95EE"),
      pending.length ? pending.map((ask) => h(
        "div",
        { key: ask.questionId, style: S.hint },
        `${ask.peer}\uFF1A${String(ask.question ?? "").slice(0, 120)}`
      )) : h("div", { style: S.hint }, "\u6CA1\u6709\u5F85\u56DE\u7B54\u7684\u8BE2\u95EE\u3002")
    ),
    h(
      "div",
      { style: { display: "grid", gap: 4 } },
      h("div", { style: { fontSize: 12, fontWeight: 600 } }, "\u8FD1\u671F\u6D3B\u52A8"),
      h(ActivityList, { items: activity.slice(0, 8) })
    )
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
function CoCowSettingsPage() {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [pwdInput, setPwdInput] = React.useState("");
  const [pwdConfigured, setPwdConfigured] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState("");
  const [parentPassword, setParentPassword] = React.useState("");
  const [answers, setAnswers] = React.useState({});
  const [activity, setActivity] = React.useState([]);
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
      const [pwd, parent, state, act] = await Promise.all([
        fetch(api("password"), { credentials: "same-origin" }).catch(() => null),
        fetch(api("parent"), { credentials: "same-origin" }).catch(() => null),
        fetch(stateUrl(), { credentials: "same-origin" }),
        fetch(activityUrl(100), { credentials: "same-origin" }).catch(() => null)
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
      if (act?.ok) {
        const body = await act.json().catch(() => null);
        setActivity(body?.items ?? []);
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
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
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
    if (!pwdInput.trim()) return;
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
    } catch (passwordError) {
      setError(passwordError.message);
    } finally {
      setBusy("");
    }
  };
  const saveParent = async () => {
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
    } catch (parentError) {
      setError(parentError.message);
    } finally {
      setBusy("");
    }
  };
  const removePeer = async (label) => {
    setBusy(`remove:${label}`);
    setError("");
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
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy("");
    }
  };
  const answerAsk = async (ask, text) => {
    const value = String(text ?? "").trim();
    if (!value) return;
    setBusy(`answer:${ask.questionId}`);
    setError("");
    try {
      const response = await fetch(api("answer"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: ask.questionId, answer: value })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply2(payload);
      setAnswers((current) => ({ ...current, [ask.questionId]: "" }));
      setMessage("\u56DE\u7B54\u5DF2\u53D1\u9001\u3002");
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setBusy("");
    }
  };
  const doctor = async () => {
    setBusy("doctor");
    setError("");
    try {
      const response = await fetch(api("doctor"), { credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setMessage(`\u8BCA\u65AD\u5305\u5DF2\u751F\u6210\uFF1A${payload?.path ?? ""}`);
    } catch (doctorError) {
      setError(doctorError.message);
    } finally {
      setBusy("");
    }
  };
  if (!data || !form) {
    return h("div", { style: S.wrap }, error ? h("div", { style: S.err }, error) : h("div", { style: S.hint }, "\u6B63\u5728\u8BFB\u53D6 dsh-cow \u72B6\u6001\u2026"));
  }
  const peers = data.peers ?? [];
  const pending = data.pendingAsks ?? [];
  const instance = data.instance ?? {};
  return h(
    "div",
    { style: S.wrap },
    h(
      "p",
      { style: S.lead },
      "dsh-cow \u8BA9\u591A\u53F0 DSH \u901A\u8FC7\u4E00\u6761 WebSocket \u957F\u8FDE\u63A5\u534F\u540C\uFF1A\u4E3B DSH \u7528 cow_send \u6D3E\u6D88\u606F\uFF0C\u5B50 DSH \u56DE\u5408\u7ED3\u675F\u81EA\u52A8\u56DE complete \u5E76\u6CE8\u5165\u539F\u4F1A\u8BDD\uFF1Bask/answer \u5728\u540C\u4E00\u5DE5\u4F5C\u533A+\u4F1A\u8BDD\u6620\u5C04\u5185\u5F80\u8FD4\u3002\u8FD9\u91CC\u53EA\u914D\u7F6E\u8282\u70B9\u4E0E\u67E5\u770B\u8FDE\u63A5\u72B6\u6001\u3002"
    ),
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
          h("span", { style: instance.role === "member" ? S.badge : S.badgeOn }, instance.role === "member" ? "\u5B50 DSH" : "\u4E3B DSH"),
          h("span", { style: S.badge }, `v${data.pluginVersion || instance.version || ""}`),
          h("button", { type: "button", style: S.secondary, disabled: busy === "doctor", onClick: () => void doctor() }, "\u751F\u6210\u8BCA\u65AD\u5305")
        )
      ),
      h(
        "div",
        { style: S.formGrid },
        h(Row, { label: "\u5B9E\u4F8B ID" }, h("span", { style: S.mono }, instance.instanceId || "")),
        h(Row, { label: "\u5730\u5740" }, h("span", { style: S.mono }, instance.endpoint || "\u4EC5\u590D\u7528\u5BBF\u4E3B Web \u7AEF\u53E3")),
        h(Row, { label: "\u540D\u79F0" }, h("input", { style: S.input, value: form.displayName, onChange: (event) => setField("displayName", event.target.value), placeholder: "\u7559\u7A7A\u7528\u8BA1\u7B97\u673A\u540D" })),
        h(Row, { label: "\u80FD\u529B\u8BF4\u660E" }, h("textarea", { style: S.textarea, value: form.capabilityNote, onChange: (event) => setField("capabilityNote", event.target.value) }))
      )
    ),
    h(
      "div",
      { style: S.card },
      h("div", { style: S.cardHead }, h("h3", { style: S.cardTitle }, "\u5DE5\u4F5C\u533A\u4E0E\u6587\u4EF6")),
      h(
        "div",
        { style: S.formGrid },
        h(Row, { label: "\u5DE5\u4F5C\u533A\u6839" }, h("textarea", { style: S.textarea, value: form.allowedRoots, onChange: (event) => setField("allowedRoots", event.target.value), placeholder: "\u6BCF\u884C\u4E00\u4E2A\u7EDD\u5BF9\u8DEF\u5F84" })),
        h(Row, { label: "\u5B50\u4F1A\u8BDD preset" }, h("input", { style: S.input, value: form.agentPreset, onChange: (event) => setField("agentPreset", event.target.value), placeholder: "\u7559\u7A7A\u7528 profile \u9ED8\u8BA4" })),
        h(Row, { label: "\u6587\u4EF6\u4E0A\u9650 MB" }, h("input", { style: { ...S.input, maxWidth: 140 }, type: "number", min: 1, max: 1024, value: form.maxFileMB, onChange: (event) => setField("maxFileMB", event.target.value) })),
        h(Row, { label: "\u5E76\u53D1\u4F20\u8F93" }, h("input", { style: { ...S.input, maxWidth: 140 }, type: "number", min: 1, max: 16, value: form.maxConcurrentFiles, onChange: (event) => setField("maxConcurrentFiles", event.target.value) })),
        h(Row, { label: "\u76D1\u542C\u5730\u5740" }, h("input", { style: S.input, value: form.listenHost, onChange: (event) => setField("listenHost", event.target.value) })),
        h(Row, { label: "\u76D1\u542C\u7AEF\u53E3" }, h("input", { style: { ...S.input, maxWidth: 140 }, type: "number", min: 0, value: form.listenPort, onChange: (event) => setField("listenPort", event.target.value) }))
      ),
      h(
        "div",
        { style: { ...S.row, marginTop: 12 } },
        h("button", { type: "button", style: S.button, disabled: busy === "save", onClick: () => void save() }, busy === "save" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
      )
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u8FDE\u63A5\u5BC6\u7801"),
        h("span", { style: pwdConfigured ? S.badgeOn : S.badgeOff }, pwdConfigured ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E")
      ),
      h(
        "div",
        { style: S.row },
        h("input", { style: S.input, type: "password", value: pwdInput, placeholder: "\u81F3\u5C11 12 \u4E2A\u5B57\u7B26", onChange: (event) => setPwdInput(event.target.value) }),
        h("button", { type: "button", style: S.button, disabled: busy === "password" || pwdInput.trim().length < 12, onClick: () => void savePassword() }, busy === "password" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
      ),
      h("div", { style: S.hint }, "\u540C\u4E00\u5BC6\u7801\u7528\u4E8E\u6240\u6709\u5B50 DSH\uFF1B\u4FEE\u6539\u540E\u5DF2\u8FDE\u63A5\u7684\u8282\u70B9\u9700\u8981\u91CD\u65B0\u8FDE\u63A5\u3002")
    ),
    h(
      "div",
      { style: S.card },
      h("div", { style: S.cardHead }, h("h3", { style: S.cardTitle }, "\u4F5C\u4E3A\u5B50 DSH\uFF1A\u8FDE\u5230\u4E0A\u7EA7")),
      h(
        "div",
        { style: S.formGrid },
        h(Row, { label: "\u4E0A\u7EA7\u5730\u5740" }, h("input", { style: S.input, value: parentUrl, placeholder: "ws://192.168.1.10:59999/cow/v1/channel", onChange: (event) => setParentUrl(event.target.value) })),
        h(Row, { label: "\u5171\u7528\u5BC6\u7801" }, h("input", { style: S.input, type: "password", value: parentPassword, onChange: (event) => setParentPassword(event.target.value) }))
      ),
      h(
        "div",
        { style: { ...S.row, marginTop: 12 } },
        h("button", { type: "button", style: S.button, disabled: busy === "parent", onClick: () => void saveParent() }, busy === "parent" ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u5E76\u91CD\u8FDE")
      )
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u5DF2\u767B\u8BB0\u8282\u70B9"),
        h("span", { style: S.badge }, `${peers.filter((peer) => peer.connected).length}/${peers.length} \u5728\u7EBF`)
      ),
      peers.length ? peers.map((peer) => h(PeerRow, { key: peer.label, peer, onRemove: removePeer })) : h("div", { style: S.hint }, "\u8FD8\u6CA1\u6709\u767B\u8BB0\u4EFB\u4F55\u8282\u70B9\u3002\u5B50 DSH \u8FDE\u4E0A\u6765\u540E\u4F1A\u81EA\u52A8\u767B\u8BB0\u3002")
    ),
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardHead },
        h("h3", { style: S.cardTitle }, "\u5F85\u56DE\u7B54\u8BE2\u95EE"),
        h("span", { style: S.badge }, `${pending.length} \u6761`)
      ),
      pending.length ? pending.map((ask) => h(AskRow, {
        key: ask.questionId,
        ask,
        busy,
        value: answers[ask.questionId] ?? "",
        onChange: (id, value) => setAnswers((current) => ({ ...current, [id]: value })),
        onAnswer: answerAsk
      })) : h("div", { style: S.hint }, "\u6CA1\u6709\u5F85\u56DE\u7B54\u7684\u8BE2\u95EE\u3002")
    ),
    h(
      "div",
      { style: S.card },
      h("div", { style: S.cardHead }, h("h3", { style: S.cardTitle }, "\u6D3B\u52A8\u6D41")),
      h(ActivityList, { items: activity })
    ),
    h("div", { style: S.hint }, "dsh-cow \u901A\u8FC7 WebSocket \u5168\u53CC\u5DE5 JSON \u901A\u8BAF\uFF1B\u6D88\u606F\u76F4\u63A5\u8FDB\u5165\u5BF9\u65B9\u4F1A\u8BDD\u8F93\u5165\u961F\u5217\uFF0C\u4E0D\u5EFA\u4EFB\u52A1\u3001\u4E0D\u8F6E\u8BE2\u3002")
  );
}
var name = "dsh-cow-client";
var inject = ["slots", "sidebarRightTabs", "sidebarRight"];
var COW_RIGHT_KIND = "cow-status";
var COW_RIGHT_ID = "dsh-cow/status";
var cowRightbar = null;
function CowRightStatus() {
  return h(CowStatusPanel, null);
}
function CowActivityIcon() {
  return h(
    "span",
    { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18 } },
    h(
      "svg",
      { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      h("circle", { cx: 12, cy: 5, r: 2.5 }),
      h("circle", { cx: 5, cy: 18, r: 2.5 }),
      h("circle", { cx: 19, cy: 18, r: 2.5 }),
      h("path", { d: "M12 7.5v4M12 11.5 6.5 15.5M12 11.5l5.5 4" })
    )
  );
}
function apply(ctx) {
  cowRightbar = ctx.sidebarRight ?? null;
  try {
    const registerTab = () => ctx.sidebarRightTabs.register({
      id: COW_RIGHT_ID,
      kind: COW_RIGHT_KIND,
      title: () => "COW\u72B6\u6001",
      guide: [{ order: 5, title: () => "COW\u72B6\u6001", description: () => "\u8282\u70B9\u4E0E\u8FDE\u63A5\u72B6\u6001" }]
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
    }, CowStatusPanel));
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
