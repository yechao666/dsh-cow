/**
 * dsh-cow 设置页与右侧状态面板：节点配置 / 作为主 DSH / 作为子 DSH。
 *
 * 纯消息架构：这里只做配置、连接状态、待回答询问与活动流观察；
 * 派消息与回答由 Agent 通过 cow_send 完成。
 */
import * as React from 'react';

const h = React.createElement;
const stateUrl = () => new URL('api/cow/state', document.baseURI).toString();
const activityUrl = (limit = 100) => new URL(`api/cow/activity?limit=${limit}`, document.baseURI).toString();
const api = (path) => new URL(`api/cow/${path}`, document.baseURI).toString();

const S = {
  wrap: { padding: '0 0 24px', color: 'var(--dsw-alias-label-primary)' },
  lead: { margin: '0 0 16px', fontSize: 12, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.7 },
  card: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 'var(--dsw-radius-md, 8px)', padding: '14px 16px', marginBottom: 12, background: 'var(--dsw-alias-bg-l1)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 600 },
  formGrid: { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', columnGap: 12, rowGap: 10, alignItems: 'start' },
  formLabel: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', paddingTop: 7, whiteSpace: 'nowrap' },
  formValue: { display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0, flexWrap: 'wrap' },
  input: { flex: '1 1 auto', minWidth: 120, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 'var(--dsw-radius-sm, 6px)', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', fontSize: 12, outline: 'none' },
  textarea: { flex: '1 1 auto', minWidth: 120, minHeight: 64, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 'var(--dsw-radius-sm, 6px)', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', fontSize: 12, outline: 'none', resize: 'vertical' },
  button: { border: '1px solid var(--dsw-alias-button-primary-fill)', background: 'var(--dsw-alias-button-primary-fill)', color: 'var(--dsw-alias-label-primary-foreground)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  secondary: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  danger: { border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-error)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  hint: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.6 },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999, fontSize: 11, background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', border: '1px solid var(--dsw-alias-border-l2)' },
  badgeOn: { display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(52,199,89,.14)', color: '#2ea043', border: '1px solid rgba(52,199,89,.35)' },
  badgeOff: { display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 999, fontSize: 11, background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-secondary)', border: '1px solid var(--dsw-alias-border-l2)' },
  meta: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
  err: { fontSize: 12, color: 'var(--dsw-alias-label-error)' },
  ok: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
  listRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' },
  row: { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 },
  panel: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12, color: 'var(--dsw-alias-label-primary)' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  stat: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: '8px 10px' },
  statValue: { fontSize: 18, fontWeight: 600 },
};

function Row({ label, children }) {
  return h('div', { style: { display: 'contents' } },
    h('span', { style: S.formLabel }, label),
    h('div', { style: S.formValue }, children),
  );
}

function timeLabel(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleTimeString(); } catch { return String(value); }
}

function StatCard({ label, value }) {
  return h('div', { style: S.stat },
    h('div', { style: S.meta }, label),
    h('div', { style: S.statValue }, String(value ?? 0)),
  );
}

function PeerRow({ peer, onRemove }) {
  return h('div', { style: S.listRow },
    h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
      h('div', { style: S.row },
        h('span', { style: { fontSize: 12, fontWeight: 600 } }, peer.label),
        h('span', { style: peer.connected ? S.badgeOn : S.badgeOff }, peer.connected ? '已连接' : '离线'),
        h('span', { style: S.badge }, peer.relation === 'parent' ? '上级' : '下级'),
        peer.version ? h('span', { style: S.meta }, `v${peer.version}`) : null,
        peer.encrypted ? h('span', { style: S.badge }, 'E2E') : null,
      ),
      peer.description
        ? h('div', { style: { ...S.meta, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, String(peer.description))
        : null,
    ),
    onRemove
      ? h('button', { type: 'button', style: { ...S.danger, flexShrink: 0, whiteSpace: 'nowrap' }, onClick: () => onRemove(peer.label) }, '移除')
      : null,
  );
}

function AskRow({ ask, value, busy, onChange, onAnswer }) {
  return h('div', { style: S.listRow },
    h('div', { style: { display: 'grid', gap: 4, minWidth: 0, flex: 1 } },
      h('div', { style: S.row },
        h('span', { style: { fontSize: 12, fontWeight: 600 } }, ask.peer),
        h('span', { style: S.meta }, timeLabel(ask.createdAt)),
      ),
      h('div', { style: { fontSize: 12, lineHeight: 1.6 } }, ask.question),
      (ask.options ?? []).length
        ? h('div', { style: S.row }, ask.options.map((option, index) =>
            h('button', {
              key: index,
              type: 'button',
              style: S.secondary,
              disabled: Boolean(busy),
              onClick: () => onAnswer(ask, option),
            }, option)))
        : null,
      h('div', { style: S.row },
        h('input', {
          style: S.input,
          placeholder: '回答内容',
          value: value ?? '',
          onChange: (event) => onChange(ask.questionId, event.target.value),
        }),
        h('button', {
          type: 'button',
          style: S.button,
          disabled: Boolean(busy),
          onClick: () => onAnswer(ask, value ?? ''),
        }, busy === `answer:${ask.questionId}` ? '发送中…' : '回答'),
      ),
    ),
  );
}

function ActivityList({ items }) {
  if (!items?.length) return h('div', { style: S.hint }, '还没有活动记录。');
  return h('div', null, items.slice(0, 30).map((item) =>
    h('div', { key: item.id, style: S.listRow },
      h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
        h('div', { style: { fontSize: 12 } }, item.text),
        h('div', { style: S.meta }, `${timeLabel(item.at)}${item.peer ? ` · ${item.peer}` : ''}${item.status ? ` · ${item.status}` : ''}`),
      ),
      h('span', { style: S.badge }, item.kind),
    )));
}

function CowStatusPanel() {
  const [state, setState] = React.useState(null);
  const [activity, setActivity] = React.useState([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [stateResponse, activityResponse] = await Promise.all([
          fetch(stateUrl(), { credentials: 'same-origin' }),
          fetch(activityUrl(30), { credentials: 'same-origin' }),
        ]);
        const nextState = await stateResponse.json();
        const nextActivity = await activityResponse.json();
        if (!alive) return;
        setState(nextState);
        setActivity(nextActivity?.items ?? []);
        setError('');
      } catch (loadError) {
        if (alive) setError(loadError.message);
      }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (error) return h('div', { style: { ...S.panel, color: 'var(--dsw-alias-label-error)' } }, `状态不可用：${error}`);
  if (!state) return h('div', { style: S.panel }, '正在读取 dsh-cow 状态…');
  const peers = state.peers ?? [];
  const pending = state.pendingAsks ?? [];
  return h('div', { style: S.panel },
    h('div', { style: { ...S.row, justifyContent: 'space-between' } },
      h('div', { style: { fontSize: 13, fontWeight: 600 } }, state.instance?.displayName || state.instance?.instanceId),
      h('span', { style: S.badge }, `v${state.pluginVersion || state.instance?.version || ''}`),
    ),
    h('div', { style: S.meta }, `${state.instance?.role === 'member' ? '子 DSH' : '主 DSH'} · ${state.instance?.endpoint || '未监听'}`),
    h('div', { style: S.statGrid },
      h(StatCard, { label: '节点', value: peers.length }),
      h(StatCard, { label: '在线', value: peers.filter((peer) => peer.connected).length }),
      h(StatCard, { label: '待回答', value: pending.length }),
    ),
    h('div', { style: { display: 'grid', gap: 4 } },
      h('div', { style: { fontSize: 12, fontWeight: 600 } }, '节点'),
      peers.length
        ? peers.map((peer) => h('div', { key: peer.label, style: S.row },
            h('span', { style: { fontSize: 12 } }, peer.label),
            h('span', { style: peer.connected ? S.badgeOn : S.badgeOff }, peer.connected ? '在线' : '离线'),
            h('span', { style: S.meta }, peer.relation === 'parent' ? '上级' : '下级'),
          ))
        : h('div', { style: S.hint }, '还没有登记任何节点。'),
    ),
    h('div', { style: { display: 'grid', gap: 4 } },
      h('div', { style: { fontSize: 12, fontWeight: 600 } }, '待回答询问'),
      pending.length
        ? pending.map((ask) => h('div', { key: ask.questionId, style: S.hint },
            `${ask.peer}：${String(ask.question ?? '').slice(0, 120)}`))
        : h('div', { style: S.hint }, '没有待回答的询问。'),
    ),
    h('div', { style: { display: 'grid', gap: 4 } },
      h('div', { style: { fontSize: 12, fontWeight: 600 } }, '近期活动'),
      h(ActivityList, { items: activity.slice(0, 8) }),
    ),
  );
}

class SettingsBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return h('div', { style: { padding: 16, color: 'var(--dsw-alias-label-error)', fontSize: 12 } },
        `dsh-cow 设置加载失败：${this.state.error?.message || this.state.error}`);
    }
    return this.props.children;
  }
}

function CoCowSettingsPage() {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [busy, setBusy] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [pwdInput, setPwdInput] = React.useState('');
  const [pwdConfigured, setPwdConfigured] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState('');
  const [parentPassword, setParentPassword] = React.useState('');
  const [answers, setAnswers] = React.useState({});
  const [activity, setActivity] = React.useState([]);

  const apply = React.useCallback((next) => {
    setData(next);
    setForm({
      displayName: next?.config?.displayName ?? '',
      capabilityNote: next?.config?.capabilityNote ?? '',
      allowedRoots: next?.config?.allowedRoots ?? '',
      listenHost: next?.config?.listenHost ?? '127.0.0.1',
      listenPort: next?.config?.listenPort ?? 0,
      maxFileMB: next?.config?.maxFileMB ?? 50,
      maxConcurrentFiles: next?.config?.maxConcurrentFiles ?? 4,
      agentPreset: next?.config?.agentPreset ?? '',
    });
  }, []);

  const load = React.useCallback(async () => {
    setBusy('load');
    setError('');
    try {
      const [pwd, parent, state, act] = await Promise.all([
        fetch(api('password'), { credentials: 'same-origin' }).catch(() => null),
        fetch(api('parent'), { credentials: 'same-origin' }).catch(() => null),
        fetch(stateUrl(), { credentials: 'same-origin' }),
        fetch(activityUrl(100), { credentials: 'same-origin' }).catch(() => null),
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
      apply(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusy('');
    }
  }, [apply]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy('save');
    setError('');
    setMessage('');
    try {
      const response = await fetch(api('settings'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply(payload);
      setMessage('已保存。');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  const savePassword = async () => {
    if (!pwdInput.trim()) return;
    setBusy('password');
    setError('');
    setMessage('');
    try {
      const response = await fetch(api('password'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pwdInput }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setPwdConfigured(Boolean(payload?.configured));
      setPwdInput('');
      setMessage('连接密码已保存。');
    } catch (passwordError) {
      setError(passwordError.message);
    } finally {
      setBusy('');
    }
  };

  const saveParent = async () => {
    setBusy('parent');
    setError('');
    setMessage('');
    try {
      const response = await fetch(api('parent'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: parentUrl.trim(), password: parentPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setMessage(payload?.url ? '已保存上级地址，正在重连。' : '已清除上级地址。');
    } catch (parentError) {
      setError(parentError.message);
    } finally {
      setBusy('');
    }
  };

  const removePeer = async (label) => {
    setBusy(`remove:${label}`);
    setError('');
    try {
      const response = await fetch(api('peers/remove'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply(payload);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy('');
    }
  };

  const answerAsk = async (ask, text) => {
    const value = String(text ?? '').trim();
    if (!value) return;
    setBusy(`answer:${ask.questionId}`);
    setError('');
    try {
      const response = await fetch(api('answer'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: ask.questionId, answer: value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply(payload);
      setAnswers((current) => ({ ...current, [ask.questionId]: '' }));
      setMessage('回答已发送。');
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setBusy('');
    }
  };

  const doctor = async () => {
    setBusy('doctor');
    setError('');
    try {
      const response = await fetch(api('doctor'), { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setMessage(`诊断包已生成：${payload?.path ?? ''}`);
    } catch (doctorError) {
      setError(doctorError.message);
    } finally {
      setBusy('');
    }
  };

  if (!data || !form) {
    return h('div', { style: S.wrap }, error ? h('div', { style: S.err }, error) : h('div', { style: S.hint }, '正在读取 dsh-cow 状态…'));
  }

  const peers = data.peers ?? [];
  const pending = data.pendingAsks ?? [];
  const instance = data.instance ?? {};

  return h('div', { style: S.wrap },
    h('p', { style: S.lead },
      'dsh-cow 让多台 DSH 通过一条 WebSocket 长连接协同：主 DSH 用 cow_send 派消息，子 DSH 回合结束自动回 complete 并注入原会话；ask/answer 在同一工作区+会话映射内往返。这里只配置节点与查看连接状态。'),

    error ? h('div', { style: { ...S.err, marginBottom: 10 } }, error) : null,
    message ? h('div', { style: { ...S.ok, marginBottom: 10 } }, message) : null,

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '本机节点'),
        h('div', { style: S.row },
          h('span', { style: instance.role === 'member' ? S.badge : S.badgeOn }, instance.role === 'member' ? '子 DSH' : '主 DSH'),
          h('span', { style: S.badge }, `v${data.pluginVersion || instance.version || ''}`),
          h('button', { type: 'button', style: S.secondary, disabled: busy === 'doctor', onClick: () => void doctor() }, '生成诊断包'),
        ),
      ),
      h('div', { style: S.formGrid },
        h(Row, { label: '实例 ID' }, h('span', { style: S.mono }, instance.instanceId || '')),
        h(Row, { label: '地址' }, h('span', { style: S.mono }, instance.endpoint || '仅复用宿主 Web 端口')),
        h(Row, { label: '名称' }, h('input', { style: S.input, value: form.displayName, onChange: (event) => setField('displayName', event.target.value), placeholder: '留空用计算机名' })),
        h(Row, { label: '能力说明' }, h('textarea', { style: S.textarea, value: form.capabilityNote, onChange: (event) => setField('capabilityNote', event.target.value) })),
      ),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead }, h('h3', { style: S.cardTitle }, '工作区与文件')),
      h('div', { style: S.formGrid },
        h(Row, { label: '工作区根' }, h('textarea', { style: S.textarea, value: form.allowedRoots, onChange: (event) => setField('allowedRoots', event.target.value), placeholder: '每行一个绝对路径' })),
        h(Row, { label: '子会话 preset' }, h('input', { style: S.input, value: form.agentPreset, onChange: (event) => setField('agentPreset', event.target.value), placeholder: '留空用 profile 默认' })),
        h(Row, { label: '文件上限 MB' }, h('input', { style: { ...S.input, maxWidth: 140 }, type: 'number', min: 1, max: 1024, value: form.maxFileMB, onChange: (event) => setField('maxFileMB', event.target.value) })),
        h(Row, { label: '并发传输' }, h('input', { style: { ...S.input, maxWidth: 140 }, type: 'number', min: 1, max: 16, value: form.maxConcurrentFiles, onChange: (event) => setField('maxConcurrentFiles', event.target.value) })),
        h(Row, { label: '监听地址' }, h('input', { style: S.input, value: form.listenHost, onChange: (event) => setField('listenHost', event.target.value) })),
        h(Row, { label: '监听端口' }, h('input', { style: { ...S.input, maxWidth: 140 }, type: 'number', min: 0, value: form.listenPort, onChange: (event) => setField('listenPort', event.target.value) })),
      ),
      h('div', { style: { ...S.row, marginTop: 12 } },
        h('button', { type: 'button', style: S.button, disabled: busy === 'save', onClick: () => void save() }, busy === 'save' ? '保存中…' : '保存'),
      ),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '连接密码'),
        h('span', { style: pwdConfigured ? S.badgeOn : S.badgeOff }, pwdConfigured ? '已配置' : '未配置'),
      ),
      h('div', { style: S.row },
        h('input', { style: S.input, type: 'password', value: pwdInput, placeholder: '至少 12 个字符', onChange: (event) => setPwdInput(event.target.value) }),
        h('button', { type: 'button', style: S.button, disabled: busy === 'password' || pwdInput.trim().length < 12, onClick: () => void savePassword() }, busy === 'password' ? '保存中…' : '保存'),
      ),
      h('div', { style: S.hint }, '同一密码用于所有子 DSH；修改后已连接的节点需要重新连接。'),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead }, h('h3', { style: S.cardTitle }, '作为子 DSH：连到上级')),
      h('div', { style: S.formGrid },
        h(Row, { label: '上级地址' }, h('input', { style: S.input, value: parentUrl, placeholder: 'ws://192.168.1.10:59999/cow/v1/channel', onChange: (event) => setParentUrl(event.target.value) })),
        h(Row, { label: '共用密码' }, h('input', { style: S.input, type: 'password', value: parentPassword, onChange: (event) => setParentPassword(event.target.value) })),
      ),
      h('div', { style: { ...S.row, marginTop: 12 } },
        h('button', { type: 'button', style: S.button, disabled: busy === 'parent', onClick: () => void saveParent() }, busy === 'parent' ? '保存中…' : '保存并重连'),
      ),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '已登记节点'),
        h('span', { style: S.badge }, `${peers.filter((peer) => peer.connected).length}/${peers.length} 在线`),
      ),
      peers.length
        ? peers.map((peer) => h(PeerRow, { key: peer.label, peer, onRemove: removePeer }))
        : h('div', { style: S.hint }, '还没有登记任何节点。子 DSH 连上来后会自动登记。'),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '待回答询问'),
        h('span', { style: S.badge }, `${pending.length} 条`),
      ),
      pending.length
        ? pending.map((ask) => h(AskRow, {
            key: ask.questionId,
            ask,
            busy,
            value: answers[ask.questionId] ?? '',
            onChange: (id, value) => setAnswers((current) => ({ ...current, [id]: value })),
            onAnswer: answerAsk,
          }))
        : h('div', { style: S.hint }, '没有待回答的询问。'),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead }, h('h3', { style: S.cardTitle }, '活动流')),
      h(ActivityList, { items: activity }),
    ),

    h('div', { style: S.hint }, 'dsh-cow 通过 WebSocket 全双工 JSON 通讯；消息直接进入对方会话输入队列，不建任务、不轮询。'),
  );
}

export const name = 'dsh-cow-client';
export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight'];
const COW_RIGHT_KIND = 'cow-status';
const COW_RIGHT_ID = 'dsh-cow/status';
let cowRightbar = null;

function CowRightStatus() {
  return h(CowStatusPanel, null);
}

function CowActivityIcon() {
  return h('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 } },
    h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      h('circle', { cx: 12, cy: 5, r: 2.5 }),
      h('circle', { cx: 5, cy: 18, r: 2.5 }),
      h('circle', { cx: 19, cy: 18, r: 2.5 }),
      h('path', { d: 'M12 7.5v4M12 11.5 6.5 15.5M12 11.5l5.5 4' }),
    ));
}

export function apply(ctx) {
  cowRightbar = ctx.sidebarRight ?? null;
  try {
    const registerTab = () => ctx.sidebarRightTabs.register({
      id: COW_RIGHT_ID,
      kind: COW_RIGHT_KIND,
      title: () => 'COW状态',
      guide: [{ order: 5, title: () => 'COW状态', description: () => '节点与连接状态' }],
    });
    if (typeof ctx.effect === 'function') ctx.effect(registerTab, 'dsh-cow: right status tab');
    else registerTab();
  } catch (error) {
    console.error('[dsh-cow] right tab type failed', error);
  }
  try {
    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: COW_RIGHT_ID,
    }, CowRightStatus));
    ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab.title',
      key: COW_RIGHT_ID,
    }, () => h('span', null, 'COW状态')));
  } catch (error) {
    console.error('[dsh-cow] right tab body failed', error);
  }
  try {
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: 'cow-activity',
    }, CowStatusPanel));
  } catch { /* 主面板插槽不可用时忽略 */ }
  try {
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: 'cow-activity',
      order: 20,
      label: 'COW状态',
    }, CowActivityIcon));
  } catch { /* 侧边栏插槽不可用时忽略 */ }
  try {
    ctx.slots.inject('settings.section', () => {
      const unregister = ctx.slots.register(
        { name: 'settings.section', id: 'dsh-cow', order: 23, label: () => 'COW协同', inject: () => ({}) },
        () => h(SettingsBoundary, null, h(CoCowSettingsPage)),
      );
      return () => unregister();
    });
  } catch (error) {
    console.error('[dsh-cow] settings slot failed', error);
  }
}
