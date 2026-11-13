/**
 * dsh-cow 设置页：节点配置 / 作为主 DSH / 作为子 DSH。
 * 连接与任务全部走 WebSocket；这里只做配置与状态观察。
 */
import * as React from 'react';

const h = React.createElement;
const stateUrl = () => new URL('api/cow/state', document.baseURI).toString();
const activityUrl = (limit = 100) => new URL(`api/cow/activity?limit=${limit}`, document.baseURI).toString();
const api = (path) => new URL(`api/cow/${path}`, document.baseURI).toString();

const S = {
  wrap: { padding: '0 0 24px', color: 'var(--dsw-alias-label-primary)' },
  lead: { margin: '0 0 16px', fontSize: 12, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.7 },
  tabs: { display: 'flex', gap: 20, margin: '4px 0 18px', width: '100%', boxSizing: 'border-box', borderBottom: '1px solid var(--dsw-alias-border-l2)' },
  tab: { border: 0, padding: '8px 2px 9px', marginBottom: -1, background: 'transparent', borderBottom: '2px solid transparent', color: 'var(--dsw-alias-label-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  tabActive: { border: 0, padding: '8px 2px 9px', marginBottom: -1, background: 'transparent', borderBottom: '2px solid var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  card: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 'var(--dsw-radius-md, 8px)', padding: '14px 16px', marginBottom: 12, background: 'var(--dsw-alias-bg-l1)' },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 600 },
  formGrid: { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', columnGap: 12, rowGap: 10, alignItems: 'start' },
  formLabel: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', paddingTop: 7, whiteSpace: 'nowrap' },
  formValue: { display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0, flexWrap: 'wrap' },
  inputFlex: { flex: '1 1 auto', minWidth: 120, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 'var(--dsw-radius-sm, 6px)', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', fontSize: 12, outline: 'none' },
  pushRight: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  button: { border: '1px solid var(--dsw-alias-button-primary-fill)', background: 'var(--dsw-alias-button-primary-fill)', color: 'var(--dsw-alias-label-primary-foreground)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  secondary: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  danger: { border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-error)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  iconButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, padding: 0, flexShrink: 0, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 'var(--dsw-radius-sm, 6px)', background: 'transparent', color: 'var(--dsw-alias-label-tertiary)', cursor: 'pointer' },
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
};

function Row({ label, children, nowrap = false }) {
  return h('div', { style: { display: 'contents' } },
    h('span', { style: S.formLabel }, label),
    h('div', { style: nowrap ? { ...S.formValue, flexWrap: 'nowrap' } : S.formValue }, children),
  );
}

const ICONS = {
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  eyeOff: ['M3 3l18 18', 'M10.6 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1', 'M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.4-.9', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  link: ['M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11.4 4.5', 'M14 11a5 5 0 0 0-7.1 0L4.1 13.8a5 5 0 0 0 7.1 7.1l1.4-1.4'],
};

function Icon({ name }) {
  return h('svg', {
    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
  }, (ICONS[name] ?? []).map((d, index) => h('path', { key: index, d })));
}

function IconButton({ title, icon, onClick, disabled, primary = false, tone }) {
  return h('button', {
    type: 'button',
    title,
    'aria-label': title,
    disabled: Boolean(disabled),
    onClick,
    style: primary
      ? { ...S.button, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0, flexShrink: 0 }
      : { ...S.iconButton, ...(tone === 'error' ? { color: 'var(--dsw-alias-label-error)' } : null) },
  }, h(Icon, { name: icon }));
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

function PeerRow({ peer, busy, onRemove, onUpgrade, currentVersion }) {
  return h('div', { style: S.listRow },
    h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
      h('div', { style: S.row },
        h('span', { style: { fontSize: 12, fontWeight: 600 } }, peer.label),
        h('span', { style: peer.connected ? S.badgeOn : S.badgeOff }, peer.connected ? '已连接' : '离线'),
        peer.version ? h('span', { style: S.meta }, `v${peer.version}`) : null,
        peer.encrypted ? h('span', { style: S.badgeOn }, 'E2E') : null,
        onUpgrade && peer.connected && peer.version && currentVersion && peer.version !== currentVersion
          ? h('button', {
              type: 'button',
              style: { ...S.secondary, marginLeft: 'auto', padding: '2px 8px', fontSize: 11 },
              disabled: Boolean(busy),
              title: `升级到 ${currentVersion}`,
              onClick: () => onUpgrade(peer.label),
            }, busy === `upgrade:${peer.label}` ? '升级中…' : `升级到 ${currentVersion}`)
          : null,
      ),
      peer.description ? h('div', { style: { ...S.meta, whiteSpace: 'pre-wrap' } }, peer.description.slice(0, 200)) : null,
      peer.currentTask ? h('div', { style: S.meta }, `正在执行：${peer.currentTask.title || peer.currentTask.taskId}（${peer.currentTask.status}）`) : null,
      h('div', { style: { ...S.meta, wordBreak: 'break-all' } }, `UUID: ${peer.uuid || peer.instanceId || '-'}`),
    ),
    h('button', {
      type: 'button',
      title: '移除该节点',
      'aria-label': '移除该节点',
      style: S.iconButton,
      disabled: Boolean(busy),
      onClick: () => onRemove(peer.label),
    },
      h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('path', { d: 'M3 6h18' }),
        h('path', { d: 'M8 6V4h8v2' }),
        h('path', { d: 'M19 6l-1 14H6L5 6' }),
        h('path', { d: 'M10 11v6M14 11v6' }),
      ),
    ),
  );
}

const ACTIVITY_KIND = {
  task: { label: '任务', color: '#77a7ef' },
  result: { label: '结果', color: '#55c6ae' },
  queue: { label: '排队', color: '#e0a33e' },
  question: { label: '提问', color: '#a58be8' },
  answer: { label: '回答', color: '#55c6ae' },
  file: { label: '文件', color: '#ff8068' },
  peer: { label: '节点', color: '#8a8f9c' },
  inbound: { label: '入站', color: '#4f8dd8' },
  info: { label: '信息', color: '#8a8f9c' },
};

function CowActivityIcon({ size = 16 }) {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true',
  },
    h('path', { d: 'M4 12a8 8 0 0 1 16 0' }),
    h('path', { d: 'M7 12a5 5 0 0 1 10 0' }),
    h('circle', { cx: 12, cy: 12, r: 1.6, fill: 'currentColor', stroke: 'none' }),
    h('path', { d: 'M12 14v6' }),
  );
}

function CowActivityPanel() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const [answering, setAnswering] = React.useState('');

  const answerQuestion = async (questionId) => {
    setAnswering(questionId);
    setError('');
    try {
      const response = await fetch(api('answer'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId, answer: answers[questionId] ?? '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setAnswers((current) => ({ ...current, [questionId]: '' }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering('');
    }
  };

  const answerTask = async (taskId) => {
    setAnswering(taskId);
    setError('');
    try {
      const response = await fetch(api('answer'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId, answer: answers[taskId] ?? '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setAnswers((current) => ({ ...current, [taskId]: '' }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering('');
    }
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activityResponse, stateResponse] = await Promise.all([
        fetch(activityUrl(), { credentials: 'same-origin' }),
        fetch(stateUrl(), { credentials: 'same-origin' }),
      ]);
      const activity = await activityResponse.json();
      const state = stateResponse.ok ? await stateResponse.json() : null;
      if (!activityResponse.ok) throw new Error(activity?.error?.message || `HTTP ${activityResponse.status}`);
      setData({ activity, state });
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 4000);
    return () => clearInterval(timer);
  }, [load]);

  const items = data?.activity?.items ?? [];
  const stats = data?.activity?.stats ?? {};
  const version = data?.state?.pluginVersion ?? '';
  const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  return h('div', { style: { ...S.wrap, padding: '18px 20px 28px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 } },
      h('div', { style: { width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--dsw-alias-brand-primary)', color: '#fff' } }, h(CowActivityIcon, { size: 16 })),
      h('h2', { style: { margin: 0, fontSize: 16, fontWeight: 650 } }, 'COW状态'),
      version ? h('span', { style: S.badgeOff }, `v${version}`) : null,
      h('span', { style: S.badgeOn }, `连接 ${stats.connected ?? 0}`),
      h('span', { style: stats.encrypted ? S.badgeOn : S.badgeOff }, `加密 ${stats.encrypted ?? 0}`),
      stats.queued ? h('span', { style: S.badgeOff }, `排队 ${stats.queued}`) : null,
      h('button', { type: 'button', style: { ...S.secondary, marginLeft: 'auto' }, onClick: () => { void load(); }, disabled: loading }, loading ? '刷新中…' : '刷新'),
    ),
    h('p', { style: { ...S.hint, margin: '2px 0 14px' } }, '本机节点信息、任务、提问、文件与节点事件；每 4 秒自动刷新。'),
    (() => {
      const info = data?.state?.instance ?? {};
      const cfg = data?.state?.config ?? {};
      const peerRows = data?.state?.peers ?? [];
      const parent = data?.state?.parent ?? {};
      const stats = data?.state?.stats ?? {};
      const tasks = data?.state?.tasks ?? [];
      const roleLabel = parent.connected || info.role === 'member' ? '子 DSH' : '主 DSH';
      const endpoint = info.endpoint ? `${String(info.endpoint).replace(/^http/, 'ws')}/channel` : '未就绪';
      const rows = [
        ['节点名称', info.displayName || '-'],
        ['版本', info.version ? `v${info.version}` : '-'],
        ['角色', `${roleLabel}（已连接 ${stats.connected ?? 0} / ${stats.peers ?? 0} 个节点）`],
        ['唯一标识', info.uuid || info.instanceId || '-'],
        ['WebSocket', endpoint],
        ['上级', parent.url ? `${parent.url}（${parent.connected ? '已连接' : '未连接'}）` : '无'],
        ['工作区根目录', cfg.allowedRoots || '-'],
        ['当前任务', data?.state?.currentInbound ? `${data.state.currentInbound.remoteTaskId}（${data.state.currentInbound.from}）` : '空闲'],
        ['最近任务', tasks.slice(0, 3).map((t) => `${t.taskId.slice(-6)} ${t.status}`).join('，') || '无'],
      ];
      return h('div', { style: S.card },
        h('div', { style: S.cardHead },
          h('h3', { style: S.cardTitle }, '本机节点'),
          h('span', { style: stats.encrypted ? S.badgeOn : S.badgeOff }, stats.encrypted ? `加密连接 ${stats.encrypted}` : '未加密连接'),
        ),
        h('div', { style: { display: 'grid', gap: 4 } }, rows.map(([label, value]) => h('div', { key: label, style: { display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: 8, fontSize: 12, lineHeight: 1.6 } },
          h('span', { style: S.meta }, label),
          h('span', { style: { wordBreak: 'break-all' } }, value),
        ))),
        info.description ? h('div', { style: { ...S.meta, marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 } }, info.description) : null,
      );
    })(),
    (() => {
      const state = data?.state ?? {};
      const info = state.instance ?? {};
      const cfg = state.config ?? {};
      const parent = state.parent ?? {};
      const peers = state.peers ?? [];
      const children = peers.filter((peer) => peer.relation !== 'parent');
      const stats = state.stats ?? {};
      const endpoint = info.endpoint ? `${String(info.endpoint).replace(/^http/, 'ws')}/channel` : '未就绪';
      const parentPeer = peers.find((peer) => peer.relation === 'parent');
      const parentNode = parent.node ?? parentPeer ?? {};
      const parentVersion = parentNode.version || '';
      const childRows = children.map((child) => h('div', { key: child.label, style: { ...S.listRow, alignItems: 'flex-start' } },
        h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
          h('div', { style: S.row },
            h('span', { style: { fontSize: 12, fontWeight: 600 } }, child.label),
            h('span', { style: child.connected ? S.badgeOn : S.badgeOff }, child.connected ? '已连接' : '离线'),
            child.version ? h('span', { style: S.meta }, `v${child.version}`) : null,
            child.encrypted ? h('span', { style: S.badgeOn }, 'E2E') : null,
          ),
          child.currentTask ? h('div', { style: S.meta }, `执行中：${child.currentTask.title || child.currentTask.taskId}（${child.currentTask.status}）`) : null,
        ),
      ));
      return h(React.Fragment, null,
        h('div', { style: S.card },
          h('div', { style: S.cardHead },
            h('h3', { style: S.cardTitle }, '作为主 DSH'),
            h('span', { style: stats.connected ? S.badgeOn : S.badgeOff }, `${children.filter((child) => child.connected).length} / ${children.length} 个子节点在线`),
          ),
          h('div', { style: { display: 'grid', gap: 4 } }, [
            ['监听地址', `${cfg.listenHost || '127.0.0.1'}:${cfg.listenPort || '（复用宿主端口）'}`],
            ['连接地址', endpoint],
            ['连接密码', state.passwordConfigured ? '已设置' : '未设置'],
            ['待处理提问', `${(state.questions ?? []).length} 条`],
          ].map(([label, value]) => h('div', { key: label, style: { display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: 8, fontSize: 12, lineHeight: 1.6 } },
            h('span', { style: S.meta }, label),
            h('span', { style: { wordBreak: 'break-all' } }, value),
          ))),
          h('div', { style: { ...S.meta, margin: '10px 0 2px' } }, '已连接的子 DSH'),
          children.length ? h('div', null, childRows) : h('div', { style: S.hint }, '还没有子 DSH 连上来。'),
        ),
        h('div', { style: S.card },
          h('div', { style: S.cardHead },
            h('h3', { style: S.cardTitle }, '作为子 DSH'),
            h('span', { style: parent.connected ? S.badgeOn : S.badgeOff }, parent.connected ? '上级已连接' : '上级未连接'),
          ),
          h('div', { style: { display: 'grid', gap: 4 } }, [
            ['上级地址', parent.url || '无'],
            ['上级版本', parentVersion ? `v${parentVersion}` : '-'],
            ['连接状态', parent.connected ? '已连接（WebSocket）' : '未连接'],
            ['加密', parentPeer?.encrypted ? 'E2E 已启用' : '未启用'],
            ['本机执行/排队', `${(state.inboundTasks ?? []).filter((task) => ['queued', 'running'].includes(task.status)).length} 条`],
          ].map(([label, value]) => h('div', { key: label, style: { display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: 8, fontSize: 12, lineHeight: 1.6 } },
            h('span', { style: S.meta }, label),
            h('span', { style: { wordBreak: 'break-all' } }, value),
          ))),
        ),
      );
    })(),
    (() => {
      const outbound = (data?.state?.tasks ?? []).slice(0, 8);
      const inbound = (data?.state?.inboundTasks ?? []).slice(0, 8);
      const pending = (data?.state?.tasks ?? []).filter((task) => task.pendingQuestion);
      const row = (task, extra) => h('div', { key: `${extra || ''}${task.taskId}`, style: S.listRow },
        h('div', { style: { display: 'grid', gap: 2, minWidth: 0, flex: '1 1 auto' } },
          h('div', { style: S.row },
            h('span', { style: { fontSize: 12, fontWeight: 600 } }, task.title || task.taskId),
            h('span', { style: ['queued', 'running'].includes(task.status) ? S.badgeOn : S.badgeOff },
              task.status === 'queued' && task.queuePosition ? `排队第 ${task.queuePosition} 位` : task.status),
            h('span', { style: S.meta }, extra || ''),
            task.finishedAt ? h('span', { style: S.meta }, new Date(task.finishedAt).toLocaleTimeString('zh-CN', { hour12: false })) : null,
          ),
          h('div', { style: { ...S.meta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, task.prompt || task.summary || ''),
        ),
      );
      return h(React.Fragment, null,
        h('div', { style: S.card },
          h('div', { style: S.cardHead },
            h('h3', { style: S.cardTitle }, '我派出的任务'),
            h('span', { style: S.badgeOff }, `${outbound.length} 条`),
          ),
          outbound.length === 0 ? h('div', { style: S.hint }, '还没有派发任务。') : h('div', null, outbound.map((task) => row(task, task.peer))),
        ),
        h('div', { style: S.card },
          h('div', { style: S.cardHead },
            h('h3', { style: S.cardTitle }, '本机执行 / 排队'),
            h('span', { style: S.badgeOff }, `${inbound.length} 条`),
          ),
          inbound.length === 0 ? h('div', { style: S.hint }, '当前没有本机执行的入站任务。') : h('div', null, inbound.map((task) => row(task, task.from))),
        ),
        pending.length
          ? h('div', { style: S.card },
              h('div', { style: S.cardHead },
                h('h3', { style: S.cardTitle }, '待人工处理的审批 / 提问'),
                h('span', { style: S.badgeOn }, `${pending.length} 条`),
              ),
              h('div', { style: { display: 'grid', gap: 8 } }, pending.map((task) => h('div', { key: task.taskId, style: { borderTop: '1px solid var(--dsw-alias-border-l2)', paddingTop: 8 } },
                h('div', { style: { fontSize: 12.5, lineHeight: 1.5 } }, `${task.title || task.taskId}：${task.pendingQuestion?.question || ''}`),
                task.pendingQuestion?.options?.length
                  ? h('div', { style: { ...S.row, marginTop: 6 } }, task.pendingQuestion.options.map((option) => h('button', {
                      key: option, type: 'button', style: S.secondary,
                      onClick: () => setAnswers((current) => ({ ...current, [task.taskId]: option })),
                    }, option)))
                  : null,
                h('div', { style: { ...S.row, marginTop: 6 } },
                  h('input', {
                    style: { ...S.inputFlex, flex: '1 1 auto' },
                    placeholder: '回答子 DSH 的提问 / 审批',
                    value: answers[task.taskId] ?? '',
                    onChange: (e) => setAnswers((current) => ({ ...current, [task.taskId]: e.target.value })),
                  }),
                  h('button', { type: 'button', style: S.button, disabled: Boolean(answering), onClick: () => answerTask(task.taskId) }, answering === task.taskId ? '发送中…' : '回答'),
                ),
              ))),
            )
          : null,
        (data?.state?.questions ?? []).length
          ? h('div', { style: S.card },
              h('div', { style: S.cardHead },
                h('h3', { style: S.cardTitle }, '子 DSH 待处理提问 / 审批'),
                h('span', { style: S.badgeOn }, `${data.state.questions.length} 条`),
              ),
              h('div', { style: { display: 'grid', gap: 8 } }, data.state.questions.map((question) => h('div', { key: question.questionId, style: { borderTop: '1px solid var(--dsw-alias-border-l2)', paddingTop: 8 } },
                h('div', { style: { fontSize: 12.5, lineHeight: 1.5 } }, `${question.from || '子 DSH'}：${question.question || ''}`),
                question.options?.length
                  ? h('div', { style: { ...S.row, marginTop: 6 } }, question.options.map((option) => h('button', {
                      key: option, type: 'button', style: S.secondary,
                      onClick: () => setAnswers((current) => ({ ...current, [question.questionId]: option })),
                    }, option)))
                  : null,
                h('div', { style: { ...S.row, marginTop: 6 } },
                  h('input', {
                    style: { ...S.inputFlex, flex: '1 1 auto' },
                    placeholder: '回答子 DSH 的提问 / 审批',
                    value: answers[question.questionId] ?? '',
                    onChange: (e) => setAnswers((current) => ({ ...current, [question.questionId]: e.target.value })),
                  }),
                  h('button', { type: 'button', style: S.button, disabled: Boolean(answering), onClick: () => answerQuestion(question.questionId) }, answering === question.questionId ? '发送中…' : '回答'),
                ),
              ))),
            )
          : null,
      );
    })(),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' } },
      h('h3', { style: S.cardTitle }, '最近活动'),
      h('span', { style: S.meta }, `${items.length} 条`),
    ),
    error ? h('div', { style: { ...S.hint, color: 'var(--dsw-alias-label-danger, #d95e4b)' } }, `加载失败：${error}`) : null,
    items.length === 0
      ? h('div', { style: { ...S.hint, padding: '32px 0', textAlign: 'center' } }, '还没有活动。派发任务或连接节点后会出现在这里。')
      : h('div', { style: { display: 'grid', gap: 6 } }, items.map((item) => {
          const kind = ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info;
          return h('div', {
            key: item.id,
            style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l1)' },
          },
            h('span', { style: { flex: '0 0 auto', marginTop: 1, fontSize: 10, fontWeight: 600, color: kind.color, border: `1px solid ${kind.color}`, borderRadius: 999, padding: '1px 6px' } }, kind.label),
            h('div', { style: { minWidth: 0, flex: '1 1 auto' } },
              h('div', { style: { fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word' } }, item.text || '（无描述）'),
              h('div', { style: { ...S.meta, display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 } },
                h('span', null, timeOf(item.at)),
                item.peer ? h('span', null, item.peer) : null,
                item.taskId ? h('span', { style: S.mono }, item.taskId.slice(-10)) : null,
                item.status ? h('span', null, item.status) : null,
              ),
            ),
          );
        })),
  );
}

function CoCowSettingsPage() {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [tab, setTab] = React.useState('basic');
  const [busy, setBusy] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [pwdInput, setPwdInput] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState('');
  const [parentPassword, setParentPassword] = React.useState('');
  const [showParentPwd, setShowParentPwd] = React.useState(false);
  const [answers, setAnswers] = React.useState({});

  const apply = React.useCallback((next) => {
    setData(next);
    setForm({
      displayName: next?.config?.displayName ?? '',
      capabilityNote: next?.config?.capabilityNote ?? '',
      allowedRoots: next?.config?.allowedRoots ?? '',
      listenHost: next?.config?.listenHost ?? '127.0.0.1',
      listenPort: next?.config?.listenPort ?? 0,
      maxFileMB: next?.config?.maxFileMB ?? 50,
    });
  }, []);

  const load = React.useCallback(async () => {
    setBusy('load');
    setError('');
    try {
      const pwd = await fetch(api('password'), { credentials: 'same-origin' }).catch(() => null);
      if (pwd?.ok) {
        const body = await pwd.json().catch(() => null);
        setPwdConfiguredSafe(Boolean(body?.configured));
      }
      const parent = await fetch(api('parent'), { credentials: 'same-origin' }).catch(() => null);
      if (parent?.ok) {
        const body = await parent.json().catch(() => null);
        if (body?.url) setParentUrl(body.url);
        if (body?.password) setParentPassword(body.password);
      }
      const response = await fetch(stateUrl(), { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusy('');
    }
  }, [apply]);

  const [pwdConfigured, setPwdConfiguredSafe] = React.useState(false);

  React.useEffect(() => {
    void load();
  }, [load]);

  // 停留在「作为主 DSH」时静默刷新任务队列，排队/提问条目无需手动点刷新。
  React.useEffect(() => {
    if (tab !== 'main') return undefined;
    const timer = setInterval(() => {
      fetch(stateUrl(), { credentials: 'same-origin' })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => { if (payload && !payload.error) setData(payload); })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [tab]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveSettings = async () => {
    if (busy) return;
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

;

  const saveServerSettings = async () => {
    if (busy) return;
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
      if (pwdInput) {
        if (pwdInput.length < 6) throw new Error('连接密码至少 6 个字符');
        const pwdResponse = await fetch(api('password'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password: pwdInput }),
        });
        const pwdPayload = await pwdResponse.json();
        if (!pwdResponse.ok) throw new Error(pwdPayload?.error?.message || `HTTP ${pwdResponse.status}`);
        setPwdConfiguredSafe(true);
        setPwdInput('');
      }
      setMessage(pwdInput ? '已保存服务器设置与连接密码。' : '已保存服务器设置。');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  const savePassword = async () => {
    if (busy) return;
    if (!pwdInput) {
      setError('请输入连接密码');
      return;
    }
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
      setPwdConfiguredSafe(true);
      setPwdInput('');
      setMessage('连接密码已更新。');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  const saveParent = async () => {
    if (busy) return;
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
      setMessage('已保存上级配置，正在建立 WebSocket 长连接…');
      await new Promise((resolve) => setTimeout(resolve, 800));
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  const removePeer = async (label) => {
    setBusy(`peer:${label}`);
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
      setMessage(`已移除 ${label}。`);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy('');
    }
  };

  if (!form || !data) {
    return h('div', { style: S.wrap }, error ? h('div', { style: S.err }, error) : h('div', { style: S.lead }, '正在读取状态…'));
  }

  const instance = data.instance ?? {};
  const peers = data.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== 'parent');
  const parent = data.parent ?? {};
  const stats = data.stats ?? {};
  const role = parent.connected || instance.role === 'member' ? '子 DSH' : '主 DSH';
  const statusLine = h('div', { style: S.row },
    message ? h('span', { style: S.ok }, message) : null,
    error ? h('span', { style: S.err }, error) : null,
  );

  const answerQuestion = async (questionId) => {
    setAnswering(questionId);
    setError('');
    try {
      const response = await fetch(api('answer'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId, answer: answers[questionId] ?? '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setAnswers((current) => ({ ...current, [questionId]: '' }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering('');
    }
  };

  const answerTask = async (taskId) => {
    const answer = String(answers[taskId] ?? '').trim();
    if (!answer) { setError('请先填写答案'); return; }
    setBusy(`answer:${taskId}`);
    setError('');
    try {
      const response = await fetch(api('answer'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId, answer }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply(payload);
      setAnswers((current) => ({ ...current, [taskId]: '' }));
      setMessage('已回答远端问题');
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setBusy('');
    }
  };

  const upgradePeer = async (peer) => {
    setBusy(`upgrade:${peer}`);
    setError('');
    setMessage('');
    try {
      const response = await fetch(api('upgrade'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ peer }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      if (payload.status === 'succeeded' || payload.status === 'current') {
        setMessage(`${peer}：${payload.message || '升级完成'}`);
      } else {
        setMessage(`${peer}：${payload.message || '安装完成，等待子端重连'}${payload.version ? `（当前 ${payload.version}）` : ''}`);
      }
      const state = await fetch(stateUrl(), { credentials: 'same-origin' });
      if (state.ok) apply(await state.json());
    } catch (upgradeError) {
      setError(upgradeError.message);
    } finally {
      setBusy('');
    }
  };

  const cancelTask = async (taskId) => {
    setBusy(`cancel:${taskId}`);
    setError('');
    try {
      const response = await fetch(api('cancel'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId, reason: '配置页取消' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      apply(payload);
      setMessage('已取消任务');
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setBusy('');
    }
  };

  const generatePassword = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const key = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    setPwdInput(key);
    setShowPwd(true);
    setMessage('已生成随机连接密钥，保存后生效');
  };

  const refreshTasks = async () => {
    setBusy('refresh');
    try {
      const response = await fetch(stateUrl(), { credentials: 'same-origin' });
      const payload = await response.json();
      if (response.ok) apply(payload);
    } catch { /* 忽略 */ } finally {
      setBusy('');
    }
  };

  const tabButton = (id, label) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': tab === id,
    style: tab === id ? S.tabActive : S.tab,
    onClick: () => setTab(id),
  }, label);

  return h('div', { style: S.wrap },
    h('div', { style: S.tabs }, tabButton('basic', '节点配置'), tabButton('main', '作为主 DSH'), tabButton('child', '作为子 DSH')),

    tab === 'basic'
      ? h('div', { style: S.card },
          h('div', { style: S.formGrid },
            h(Row, { label: '节点名称' },
              h('input', { style: S.inputFlex, value: form.displayName, placeholder: '留空则使用计算机名', onChange: (e) => update('displayName', e.target.value) }),
            ),
            h(Row, { label: '附加说明' },
              h('textarea', { style: { ...S.inputFlex, minHeight: 52, resize: 'vertical' }, placeholder: '可选，附在节点说明后面', value: form.capabilityNote, onChange: (e) => update('capabilityNote', e.target.value) }),
            ),
            h(Row, { label: '工作区根目录' },
              h('input', { style: S.inputFlex, placeholder: data?.defaultAllowedRoot ? `例如 ${data.defaultAllowedRoot}；留空自动使用它` : '留空自动使用默认数据目录', value: String(form.allowedRoots || '').split('\n')[0], onChange: (e) => update('allowedRoots', e.target.value.trim()) }),
            ),
            h('div', { style: { gridColumn: '2', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' } },
              statusLine,
              h('button', { type: 'button', style: S.button, disabled: Boolean(busy), onClick: saveSettings }, busy === 'save' ? '保存中…' : '保存'),
            ),
          ),
        )
      : null,

    tab === 'main'
      ? h(React.Fragment, null,
          h('div', { style: S.card },
            h('div', { style: S.formGrid },
              h(Row, { label: '监听地址' },
                h('select', { style: { ...S.inputFlex, flex: '0 0 200px', height: 33 }, value: form.listenHost, onChange: (e) => update('listenHost', e.target.value) },
                  h('option', { value: '127.0.0.1' }, '127.0.0.1（仅本机）'),
                  h('option', { value: '0.0.0.0' }, '0.0.0.0（所有网卡）'),
                ),
                h('span', { style: { ...S.meta, paddingTop: 7 } }, '端口'),
                h('input', { type: 'number', style: { ...S.inputFlex, flex: '0 0 120px', minWidth: 90 }, placeholder: '默认 59999', value: String(form.listenPort ?? 0), onChange: (e) => update('listenPort', Number(e.target.value) || 0) }),
              ),
              h(Row, { label: '文件上限' },
                h('div', { style: S.row },
                  h('input', { type: 'number', style: { ...S.inputFlex, flex: '0 0 120px', minWidth: 90 }, placeholder: '默认 50', value: String(form.maxFileMB ?? 50), onChange: (e) => update('maxFileMB', Number(e.target.value) || 50) }),
                  h('span', { style: S.meta }, 'MB（单个交换文件的上限）'),
                ),
              ),
              h(Row, { label: '连接密码' },
                h('input', { type: showPwd ? 'text' : 'password', style: S.inputFlex, placeholder: '至少 12 个字符；可点右侧生成随机密钥', value: pwdInput, onChange: (e) => setPwdInput(e.target.value) }),
                h('button', { type: 'button', style: S.secondary, onClick: () => setShowPwd((v) => !v) }, showPwd ? '隐藏' : '显示'),
                h('button', { type: 'button', style: S.secondary, onClick: generatePassword, title: '生成 32 字节随机密钥（base64url）' }, '生成随机密钥'),
                h('span', { style: pwdConfigured ? S.badgeOn : S.badgeOff }, pwdConfigured ? '已设置' : '未设置'),
                pwdInput
                  ? h('span', { style: pwdInput.length >= 32 ? S.badgeOn : pwdInput.length >= 12 ? S.badgeOff : { ...S.badgeOff, color: 'var(--dsw-alias-label-danger, #d95e4b)' } }, pwdInput.length >= 32 ? `强（${pwdInput.length} 位）` : pwdInput.length >= 12 ? `中（${pwdInput.length} 位）` : `太短（${pwdInput.length} 位）`)
                  : null,
              ),
              h(Row, { label: '' },
                h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                  h('button', { type: 'button', style: S.button, disabled: Boolean(busy), onClick: saveServerSettings }, busy === 'save' ? '保存中…' : '保存'),
                ),
              ),
              h(Row, { label: '' }, statusLine),
              h(Row, { label: '连接地址' },
                h('span', { style: { ...S.meta, paddingTop: 7 } }, instance.endpoint ? `${instance.endpoint.replace(/^http/, 'ws')}/channel` : '（未就绪）'),
              ),
              h(Row, { label: '' }, h('span', { style: S.hint }, '子 DSH 在「上级地址」中填上面的连接地址，密码就是上面的连接密码。每个节点各自设置密码：本节点的下级用这个密码，中间节点的下级用中间节点自己的密码。密码只保存摘要，不回显。')),
            ),
          ),
          h('div', { style: S.card },
            h('div', { style: S.cardHead },
              h('h3', { style: S.cardTitle }, '已连接的子 DSH'),
              h('span', { style: S.badgeOff }, `${children.length} 个`),
            ),
            children.length > 0
              ? h('div', null, children.map((peer) => h(PeerRow, { key: peer.label, peer, busy, onRemove: removePeer, onUpgrade: upgradePeer, currentVersion: data?.pluginVersion })))
              : h('div', { style: S.hint }, '还没有子 DSH 连上来。'),
          ),
          h('div', { style: S.card },
            (() => {
              const activeTasks = (data.tasks ?? []).filter((task) => ['queued', 'running'].includes(task.status) || task.pendingQuestion);
              return h(React.Fragment, null,
                h('div', { style: S.cardHead },
                  h('h3', { style: S.cardTitle }, '任务队列与提问'),
                  h('span', { style: S.badgeOff }, `${activeTasks.length} 个待处理`),
                  h('button', { type: 'button', style: S.secondary, disabled: Boolean(busy), onClick: refreshTasks }, busy === 'refresh' ? '刷新中…' : '刷新'),
                ),
                activeTasks.length === 0
                  ? h('div', { style: S.hint }, '当前没有排队/执行中的任务。')
                  : activeTasks.map((task) => h('div', { key: task.taskId, style: S.listRow },
                      h('div', { style: { display: 'grid', gap: 4, minWidth: 0, flex: '1 1 auto' } },
                        h('div', { style: S.row },
                          h('span', { style: { fontSize: 12, fontWeight: 600 } }, task.title || task.taskId),
                          h('span', { style: ['queued', 'running'].includes(task.status) ? S.badgeOn : S.badgeOff }, task.status === 'queued' && task.queuePosition ? `排队第 ${task.queuePosition} 位` : task.status),
                          h('span', { style: S.meta }, task.peer || ''),
                          h('button', {
                            type: 'button',
                            style: { ...S.secondary, marginLeft: 'auto' },
                            disabled: Boolean(busy),
                            title: '取消这个任务（排队中的会直接出队）',
                            onClick: () => cancelTask(task.taskId),
                          }, busy === `cancel:${task.taskId}` ? '取消中…' : '取消'),
                        ),
                        task.pendingQuestion
                          ? h('div', { style: { display: 'grid', gap: 6 } },
                              h('div', { style: S.meta }, `远端提问：${task.pendingQuestion.question}`),
                              Array.isArray(task.pendingQuestion.options) && task.pendingQuestion.options.length
                                ? h('div', { style: S.row }, task.pendingQuestion.options.map((option) => h('button', {
                                    key: option, type: 'button', style: S.secondary,
                                    onClick: () => setAnswers((current) => ({ ...current, [task.taskId]: option })),
                                  }, option)))
                                : null,
                              h('div', { style: S.row },
                                h('input', {
                                  style: { ...S.inputFlex, flex: '1 1 auto' },
                                  placeholder: '回答这个远端问题',
                                  value: answers[task.taskId] ?? '',
                                  onChange: (e) => setAnswers((current) => ({ ...current, [task.taskId]: e.target.value })),
                                }),
                                h('button', { type: 'button', style: S.button, disabled: Boolean(busy), onClick: () => answerTask(task.taskId) }, busy === `answer:${task.taskId}` ? '发送中…' : '回答'),
                              ),
                            )
                          : null,
                        task.artifacts?.length
                          ? h('div', { style: S.meta }, `产物 ${task.artifacts.length} 个：${task.artifacts.slice(0, 3).map((item) => item.localPath || item.name).join('，')}`)
                          : null,
                      ),
                    ))
              );
            })(),
          ),
        )
      : null,

    tab === 'child'
      ? h('div', { style: S.card },
          h('div', { style: S.formGrid },
            h(Row, { label: '上级地址' },
              h('input', { style: S.inputFlex, placeholder: 'ws://192.168.1.10:49170/cow/v1/channel 或 http://…/cow/v1', value: parentUrl, onChange: (e) => setParentUrl(e.target.value) }),
            ),
            h(Row, { label: '连接密码' },
              h('input', { type: showParentPwd ? 'text' : 'password', style: S.inputFlex, placeholder: '主 DSH 设置的连接密码', value: parentPassword, onChange: (e) => setParentPassword(e.target.value) }),
              h('button', { type: 'button', style: S.secondary, onClick: () => setShowParentPwd((v) => !v) }, showParentPwd ? '隐藏' : '显示'),
            ),
            h(Row, { label: '连接状态' },
              h('div', { style: S.row },
                h('span', { style: parent.connected ? S.badgeOn : S.badgeOff }, parent.connected ? '已连接（WebSocket）' : '未连接'),
                parent.node?.version ? h('span', { style: S.meta }, `上级版本 v${parent.node.version}`) : null,
              ),
            ),
            h(Row, { label: '上级 ID' },
              h('span', { style: { ...S.mono, paddingTop: 7, wordBreak: 'break-all' } }, parent.node?.uuid || '-'),
            ),
            parent.node?.description
              ? h(Row, { label: '上级说明' }, h('div', { style: { ...S.meta, flex: '1 1 auto', whiteSpace: 'pre-wrap', lineHeight: 1.7, paddingTop: 6 } }, String(parent.node.description).slice(0, 400)))
              : null,
            h(Row, { label: '当前任务' },
              h('span', { style: { ...S.meta, paddingTop: 7 } }, data.currentInbound ? `${data.currentInbound.remoteTaskId}（执行中）` : '空闲'),
            ),
            h('div', { style: { gridColumn: '2', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 4 } },
              statusLine,
              h('button', { type: 'button', style: S.button, disabled: Boolean(busy), onClick: saveParent }, busy === 'parent' ? '连接中…' : '保存并连接'),
            ),
            h(Row, { label: '' }, h('span', { style: S.hint }, '保存后子 DSH 会主动建立并维持 WebSocket 长连接；断线自动重连。子 DSH 不上报自己的监听端口。')),
          ),
        )
      : null,

    h('div', { style: S.hint }, 'dsh-cow 通过 WebSocket 全双工 JSON 通讯；同一密码用于所有子 DSH。'),
  );
}

export const name = 'dsh-cow-client';
export const inject = ['slots'];
export function apply(ctx) {
  try {
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: 'cow-activity',
    }, CowActivityPanel));
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
        { name: 'settings.section', id: 'dsh-cow', order: 23, label: () => 'dsh-cow', inject: () => ({}) },
        () => h(SettingsBoundary, null, h(CoCowSettingsPage)),
      );
      return () => unregister();
    });
  } catch (error) {
    console.error('[dsh-cow] settings slot failed', error);
  }
}
