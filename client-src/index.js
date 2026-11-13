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
        peer.encrypted ? h(E2EChip, { compact: true }) : null,
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
      peer.currentTask ? h('div', { style: S.meta }, `正在执行：${peer.currentTask.title || peer.currentTask.taskId}（${taskStatusLabel(peer.currentTask.status)}）`) : null,
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


const PANEL = {
  page: {
    ...S.wrap,
    padding: '22px 24px 44px',
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
    background: 'radial-gradient(900px 260px at 20% -80px, color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent), transparent 70%)',
  },
  header: { display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  logo: {
    width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center',
    background: 'linear-gradient(135deg, var(--dsw-alias-brand-primary), color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, #7c5cff))',
    color: '#fff', boxShadow: '0 6px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent)',
  },
  title: { margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-0.25px' },
  subtitle: { ...S.hint, margin: '3px 0 0', fontSize: 12 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 10, marginBottom: 14 },
  stat: {
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 11, padding: '10px 12px',
    background: 'var(--dsw-alias-bg-l1)', display: 'grid', gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.3px' },
  statLabel: { ...S.meta, fontSize: 11 },
  card: {
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, padding: '14px 16px',
    background: 'var(--dsw-alias-bg-l1)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.035)', marginBottom: 12,
  },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 650, letterSpacing: '-0.1px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 12 },
  kvRow: { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 10, fontSize: 12, lineHeight: 1.65, padding: '2px 0' },
  kvKey: { ...S.meta, fontSize: 11.5 },
  kvVal: { wordBreak: 'break-all' },
  taskRow: { display: 'grid', gap: 4, padding: '9px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' },
  taskTitle: { fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  taskMeta: { ...S.meta, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 11 },
  progress: { ...S.meta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 },
  empty: { ...S.hint, padding: '18px 0', textAlign: 'center', fontSize: 12 },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 999, border: '1px solid var(--dsw-alias-border-l2)', fontSize: 10.5, fontWeight: 600 },
  activityRow: { display: 'grid', gridTemplateColumns: '9px minmax(0, 1fr)', gap: 10, padding: '6px 0' },
  activityDot: { width: 8, height: 8, borderRadius: 999, marginTop: 5 },
  activityText: { fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word' },
};

const TASK_STATUS_LABELS = {
  queued: '排队中',
  running: '执行中',
  succeeded: '已完成',
  failed: '失败',
  canceled: '已取消',
  interrupted: '已中断',
  waiting: '等待中',
};

function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] ?? String(status ?? '');
}

function panelStatusStyle(status) {
  const map = {
    queued: { color: '#b7791f', background: 'rgba(183, 121, 31, 0.12)', border: 'rgba(183, 121, 31, 0.35)' },
    running: { color: 'var(--dsw-alias-brand-primary)', background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)', border: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent)' },
    succeeded: { color: '#2f855a', background: 'rgba(47, 133, 90, 0.12)', border: 'rgba(47, 133, 90, 0.3)' },
    failed: { color: '#c53030', background: 'rgba(197, 48, 48, 0.1)', border: 'rgba(197, 48, 48, 0.3)' },
    canceled: { color: 'var(--dsw-alias-label-secondary)', background: 'var(--dsw-alias-bg-l2)', border: 'var(--dsw-alias-border-l2)' },
    interrupted: { color: '#c53030', background: 'rgba(197, 48, 48, 0.1)', border: 'rgba(197, 48, 48, 0.3)' },
  };
  return map[status] ?? map.canceled;
}

function PanelChip({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { ...PANEL.chip, color: 'var(--dsw-alias-label-secondary)', background: 'var(--dsw-alias-bg-l2)' },
    on: { ...PANEL.chip, color: '#2f855a', borderColor: 'rgba(47, 133, 90, 0.3)', background: 'rgba(47, 133, 90, 0.1)' },
    off: { ...PANEL.chip, color: 'var(--dsw-alias-label-secondary)' },
    brand: { ...PANEL.chip, color: 'var(--dsw-alias-brand-primary)', borderColor: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent)', background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)' },
  };
  return h('span', { style: tones[tone] ?? tones.neutral }, children);
}

function PanelKV({ rows }) {
  return h('div', { style: { display: 'grid', gap: 1 } }, rows.map(([key, value]) => h('div', { key, style: PANEL.kvRow },
    h('span', { style: PANEL.kvKey }, key),
    h('span', { style: PANEL.kvVal }, value ?? '-'),
  )));
}

function TopologyNode({ label, version, connected, encrypted, currentTask, self = false }) {
  return h('div', {
    style: {
      minWidth: self ? 210 : 168,
      maxWidth: 238,
      border: `1px solid ${self ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}`,
      borderRadius: 12,
      padding: '10px 12px',
      background: self ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-l1))' : 'var(--dsw-alias-bg-l1)',
      boxShadow: self ? '0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent), 0 6px 18px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.04)',
      display: 'grid',
      gap: 4,
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
      h('span', { style: { width: 7, height: 7, borderRadius: 99, background: connected ? '#38a169' : 'var(--dsw-alias-label-tertiary)' } }),
      h('span', { style: { fontSize: 12.5, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 } }, label || '未命名节点'),
      self ? h(PanelChip, { tone: 'brand' }, '当前') : null,
    ),
    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
      version ? h(PanelChip, null, `v${version}`) : null,
      encrypted ? h(E2EChip, { compact: true }) : null,
      connected ? null : h(PanelChip, { tone: 'off' }, '离线'),
    ),
    currentTask
      ? h('div', { style: { ...S.meta, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `任务：${currentTask.title || currentTask.taskId}`)
      : null,
  );
}

function CowTopology({ state }) {
  const STORAGE_KEY = 'dsh-cow:topology:v1';
  const NODE_W = 236;
  const [positions, setPositions] = React.useState(() => {
    try {
      if (typeof window === 'undefined') return {};
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  });
  const [view, setView] = React.useState({ x: 0, y: 0, zoom: 0.68 });
  const drag = React.useRef(null);

  React.useEffect(() => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); } catch { /* 忽略 */ }
  }, [positions]);

  React.useEffect(() => {
    const move = (event) => {
      const current = drag.current;
      if (!current) return;
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (current.kind === 'pan') {
        setView((value) => ({ ...value, x: current.origin.x + dx, y: current.origin.y + dy }));
        return;
      }
      setPositions((value) => ({
        ...value,
        [current.key]: {
          x: Math.max(0, Math.min(current.bounds.width - NODE_W, current.origin.x + dx / current.zoom)),
          y: Math.max(0, Math.min(current.bounds.height - 90, current.origin.y + dy / current.zoom)),
        },
      }));
    };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  if (!state) return null;
  const instance = state.instance ?? {};
  const peers = state.peers ?? [];
  const parent = peers.find((peer) => peer.relation === 'parent') ?? null;
  const children = peers.filter((peer) => peer.relation !== 'parent');
  const canvasHeight = Math.max(420, 330 + children.length * 96);
  const canvasWidth = 720;
  const defaults = {
    self: { x: (canvasWidth - NODE_W) / 2, y: 150 },
    ...(parent ? { [`parent:${parent.label}`]: { x: (canvasWidth - NODE_W) / 2, y: 20 } } : {}),
    ...Object.fromEntries(children.map((child, index) => [`child:${child.label}`, { x: (canvasWidth - NODE_W) / 2, y: 300 + index * 96 }])),
  };
  const positionOf = (key) => positions[key] ?? defaults[key] ?? { x: 20, y: 20 };
  const centerX = (key) => positionOf(key).x + NODE_W / 2;
  const startDrag = (event, key) => {
    event.stopPropagation();
    drag.current = {
      kind: 'node', key, startX: event.clientX, startY: event.clientY,
      origin: { ...positionOf(key) }, zoom: view.zoom,
      bounds: { width: canvasWidth, height: canvasHeight },
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const startPan = (event) => {
    if (event.target?.closest?.('[data-node]')) return;
    drag.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, origin: { ...view } };
  };
  const resetLayout = () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* 忽略 */ }
    setPositions({});
    setView({ x: 0, y: 0, zoom: 1 });
  };

  const nodeCard = (key, label, meta, options = {}) => {
    const accent = panelAccent(label);
    const position = positionOf(key);
    return h('div', {
      key,
      'data-node': 'true',
      onPointerDown: (event) => startDrag(event, key),
      onDoubleClick: () => setPositions((value) => { const next = { ...value }; delete next[key]; return next; }),
      title: '拖动调整位置；双击恢复默认位置',
      style: {
        position: 'absolute', left: position.x, top: position.y, width: NODE_W,
        border: `1px solid ${options.self ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}`,
        borderRadius: 12, padding: '10px 12px', cursor: 'grab', userSelect: 'none',
        background: options.self
          ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-l1))'
          : 'var(--dsw-alias-bg-l1)',
        boxShadow: options.self
          ? '0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent), 0 10px 24px rgba(0,0,0,0.10)'
          : '0 6px 18px rgba(0,0,0,0.06)',
        display: 'grid', gap: 5,
      },
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 } },
        h('span', { style: { width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', background: accent.main, fontSize: 11, fontWeight: 700, flex: '0 0 auto' } }, String(label || '?').slice(0, 1)),
        h('span', { style: { fontSize: 12.5, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label || '未命名节点'),
        options.self ? h(PanelChip, { tone: 'brand' }, '当前') : null,
      ),
      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
        h('span', { style: { width: 6, height: 6, borderRadius: 99, background: options.connected ? '#34c38f' : 'var(--dsw-alias-label-tertiary)' } }),
        h(PanelChip, { tone: options.connected ? 'on' : 'off' }, options.connected ? '在线' : '离线'),
        meta.version ? h(PanelChip, null, `v${meta.version}`) : null,
        meta.encrypted ? h(E2EChip, { compact: true }) : null,
      ),
      meta.currentTask ? h('div', { style: { ...S.meta, fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `任务：${meta.currentTask.title || meta.currentTask.taskId}`) : null,
    );
  };

  const edges = [];
  if (parent) {
    const from = positionOf(`parent:${parent.label}`);
    const to = positionOf('self');
    edges.push({ key: 'p', d: `M ${from.x + NODE_W / 2} ${from.y + 78} C ${from.x + NODE_W / 2} ${from.y + 110}, ${to.x + NODE_W / 2} ${to.y - 30}, ${to.x + NODE_W / 2} ${to.y}` });
  }
  for (const child of children) {
    const from = positionOf('self');
    const to = positionOf(`child:${child.label}`);
    edges.push({ key: child.label, d: `M ${from.x + NODE_W / 2} ${from.y + 82} C ${from.x + NODE_W / 2} ${from.y + 120}, ${to.x + NODE_W / 2} ${to.y - 34}, ${to.x + NODE_W / 2} ${to.y}` });
  }

  return h('div', { style: { ...PANEL.card, background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, var(--dsw-alias-bg-l1)), var(--dsw-alias-bg-l1))' } },
    h('div', { style: PANEL.cardHead },
      h('div', { style: { display: 'grid', gap: 1 } },
        h('h3', { style: PANEL.cardTitle }, '节点拓扑'),
        h('span', { style: { ...S.meta, fontSize: 11 } }, '拖动节点调整位置；拖空白处平移；双击节点恢复默认'),
      ),
      h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
        h(PanelChip, { tone: 'brand' }, `${children.filter((child) => child.connected).length}/${children.length} 在线`),
        h('button', { type: 'button', style: { ...S.secondary, height: 26, padding: '0 8px', fontSize: 11 }, onClick: () => setView((value) => ({ ...value, zoom: Math.min(1.5, value.zoom + 0.1) })) }, '+'),
        h('span', { style: { ...S.meta, minWidth: 34, textAlign: 'center' } }, `${Math.round(view.zoom * 100)}%`),
        h('button', { type: 'button', style: { ...S.secondary, height: 26, padding: '0 8px', fontSize: 11 }, onClick: () => setView((value) => ({ ...value, zoom: Math.max(0.6, value.zoom - 0.1) })) }, '−'),
        h('button', { type: 'button', style: { ...S.secondary, height: 26, padding: '0 8px', fontSize: 11 }, onClick: resetLayout }, '重置布局'),
      ),
    ),
    h('div', {
      onPointerDown: startPan,
      style: {
        position: 'relative', height: 540, overflow: 'hidden', borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2)',
        backgroundImage: 'radial-gradient(circle, var(--dsw-alias-border-l2) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        cursor: 'grab',
        touchAction: 'none',
      },
    },
      h('div', { style: { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, width: canvasWidth, height: canvasHeight } },
        h('svg', { width: canvasWidth, height: canvasHeight, style: { position: 'absolute', left: 0, top: 0, pointerEvents: 'none' } },
          edges.map((edge) => h('path', { key: edge.key, d: edge.d, fill: 'none', stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 1.4, strokeOpacity: 0.35, strokeDasharray: '4 5' })),
        ),
        parent ? nodeCard(`parent:${parent.label}`, parent.label, { version: parent.version, encrypted: parent.encrypted, currentTask: parent.currentTask }, { connected: parent.connected }) : null,
        nodeCard('self', instance.displayName || '本机', { version: instance.version, encrypted: (state.stats?.encrypted ?? 0) > 0, currentTask: state.currentInbound ?? null }, { self: true, connected: true }),
        children.map((child) => nodeCard(`child:${child.label}`, child.label, { version: child.version, encrypted: child.encrypted, currentTask: child.currentTask }, { connected: child.connected })),
        !parent ? h('div', { style: { position: 'absolute', left: (canvasWidth - 150) / 2, top: 18, ...PANEL.chip, color: 'var(--dsw-alias-label-tertiary)', borderStyle: 'dashed' } }, '无直接上级') : null,
        children.length === 0
          ? h('div', { style: { position: 'absolute', left: (canvasWidth - 150) / 2, top: 308, ...PANEL.chip, color: 'var(--dsw-alias-label-tertiary)', borderStyle: 'dashed' } }, '无直接下级')
          : null,
      ),
    ),
  );
}

function TaskLine({ task, extra }) {
  const status = task.status === 'queued' && task.queuePosition ? `排队第 ${task.queuePosition} 位` : taskStatusLabel(task.status);
  const tone = panelStatusStyle(task.status);
  const glyph = task.status === 'running' ? '▶' : task.status === 'queued' ? '⏳' : task.status === 'succeeded' ? '✓' : task.status === 'failed' || task.status === 'interrupted' ? '✕' : '–';
  const last = task.progress?.slice(-1)[0]?.text || task.prompt || '';
  return h('div', {
    style: {
      display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) auto', gap: 9, alignItems: 'start',
      padding: '9px 10px', marginBottom: 7, borderRadius: 9,
      border: `1px solid ${tone.border}`, borderLeft: `3px solid ${tone.color}`,
      background: `linear-gradient(90deg, ${tone.background}, transparent 65%)`,
    },
  },
    h('span', { style: { width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: tone.color, background: tone.background, border: `1px solid ${tone.border}` } }, glyph),
    h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
      h('div', { style: { fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, task.title || task.taskId),
      h('div', { style: { ...S.meta, display: 'flex', gap: 7, flexWrap: 'wrap', fontSize: 10.5 } },
        extra ? h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, extra) : null,
        task.createdAt ? h('span', null, new Date(task.createdAt).toLocaleTimeString('zh-CN', { hour12: false })) : null,
        task.finishedAt ? h('span', null, `完成 ${new Date(task.finishedAt).toLocaleTimeString('zh-CN', { hour12: false })}`) : null,
      ),
      last ? h('div', { style: { ...S.meta, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, last) : null,
    ),
    h('span', { style: { ...PANEL.chip, color: tone.color, background: tone.background, borderColor: tone.border, whiteSpace: 'nowrap' } }, status),
  );
}


const PANEL_ACCENTS = [
  { main: '#4f8df7', soft: 'rgba(79,141,247,0.14)', border: 'rgba(79,141,247,0.32)' },
  { main: '#34c38f', soft: 'rgba(52,195,143,0.14)', border: 'rgba(52,195,143,0.30)' },
  { main: '#a78bfa', soft: 'rgba(167,139,250,0.16)', border: 'rgba(167,139,250,0.34)' },
  { main: '#f59e0b', soft: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.32)' },
  { main: '#f472b6', soft: 'rgba(244,114,182,0.14)', border: 'rgba(244,114,182,0.30)' },
  { main: '#22d3ee', soft: 'rgba(34,211,238,0.14)', border: 'rgba(34,211,238,0.30)' },
];

function panelAccent(label = '') {
  let sum = 0;
  for (const char of String(label)) sum = (sum + char.codePointAt(0)) % 9973;
  return PANEL_ACCENTS[sum % PANEL_ACCENTS.length];
}

function PanelIcon({ name, size = 15 }) {
  const paths = {
    cube: ['M12 3l7 4v10l-7 4-7-4V7l7-4z', 'M12 3v14', 'M5 7l7 4 7-4'],
    network: ['M12 5v5', 'M7 19l5-5 5 5', 'M12 10a2 2 0 100-4 2 2 0 000 4z', 'M6 21a2 2 0 100-4 2 2 0 000 4z', 'M18 21a2 2 0 100-4 2 2 0 000 4z'],
    users: ['M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M17 3a4 4 0 010 8', 'M21 21v-2a4 4 0 00-3-3.87'],
    activity: ['M3 12h4l3-8 4 16 3-8h4'],
    alert: ['M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
    lock: ['M6 11V8a6 6 0 1112 0v3', 'M5 11h14v10H5z'],
  };
  return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    (paths[name] ?? paths.cube).map((d) => h('path', { key: d, d })),
  );
}

function E2EChip({ compact = false, enabled = true }) {
  const color = enabled ? '#34c38f' : 'var(--dsw-alias-label-secondary)';
  return h('span', {
    title: enabled ? 'AES-256-GCM 端到端加密' : '未启用端到端加密',
    style: {
      ...PANEL.chip, display: 'inline-flex', alignItems: 'center', gap: 3,
      color, borderColor: enabled ? 'rgba(52,195,143,0.35)' : 'var(--dsw-alias-border-l2)',
      background: enabled ? 'rgba(52,195,143,0.10)' : 'var(--dsw-alias-bg-l2)',
      whiteSpace: 'nowrap',
    },
  },
    h(PanelIcon, { name: 'lock', size: 10 }),
    h('span', null, enabled ? (compact ? 'E2E' : 'E2E 加密') : '未加密'),
  );
}

function StatCard({ label, value, sub, accent, icon }) {
  return h('div', {
    style: {
      position: 'relative', overflow: 'hidden', border: `1px solid ${accent.border}`, borderRadius: 12,
      padding: '11px 13px 10px', background: `linear-gradient(145deg, ${accent.soft}, var(--dsw-alias-bg-l1) 72%)`,
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
      h('span', { style: { ...S.meta, fontSize: 11, color: accent.main, fontWeight: 600 } }, label),
      h('span', { style: { width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', color: accent.main, background: accent.soft } }, h(PanelIcon, { name: icon })),
    ),
    h('div', { style: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.4px', marginTop: 2 } }, value),
    sub ? h('div', { style: { ...S.meta, fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, sub) : null,
  );
}

function PanelDonut({ segments, size = 120, thickness = 14, centerValue, centerLabel }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let offset = 0;
  return h('div', { style: { position: 'relative', width: size, height: size, flex: '0 0 auto' } },
    h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { transform: 'rotate(-90deg)' } },
      h('circle', { cx: size / 2, cy: size / 2, r: radius, fill: 'none', stroke: 'var(--dsw-alias-bg-l2)', strokeWidth: thickness }),
      total > 0
        ? segments.map((item) => {
            const length = (Number(item.value) / total) * circumference;
            const dash = `${Math.max(0, length - 2)} ${circumference}`;
            const el = h('circle', {
              key: item.label, cx: size / 2, cy: size / 2, r: radius, fill: 'none',
              stroke: item.color, strokeWidth: thickness, strokeLinecap: 'round',
              strokeDasharray: dash, strokeDashoffset: -offset,
            });
            offset += length;
            return el;
          })
        : null,
    ),
    h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', gap: 1 } },
      h('div', { style: { fontSize: 19, fontWeight: 700, lineHeight: 1.1 } }, centerValue),
      h('div', { style: { ...S.meta, fontSize: 10 } }, centerLabel),
    ),
  );
}

function PanelTaskBars({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return h('div', { style: { display: 'grid', gap: 8 } },
    rows.map((row) => h('div', { key: row.label, style: { display: 'grid', gap: 3 } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11.5 } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
          h('span', { style: { width: 7, height: 7, borderRadius: 99, background: row.color } }),
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, row.label),
        ),
        h('span', { style: { fontWeight: 650 } }, row.value),
      ),
      h('div', { style: { height: 5, borderRadius: 99, background: 'var(--dsw-alias-bg-l2)', overflow: 'hidden' } },
        h('div', { style: { height: '100%', width: `${Math.round((row.value / max) * 100)}%`, background: row.color, borderRadius: 99, opacity: row.value ? 1 : 0 } }),
      ),
    )),
  );
}

function CowActivityPanel() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const [answering, setAnswering] = React.useState('');
  const [section, setSection] = React.useState('overview');
  const [taskFilter, setTaskFilter] = React.useState('all');
  const [activityFilter, setActivityFilter] = React.useState('all');

  const postAnswer = async (body) => {
    const response = await fetch(api('answer'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    return payload;
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

  const answer = async (key, body) => {
    setAnswering(key);
    setError('');
    try {
      await postAnswer(body);
      setAnswers((current) => ({ ...current, [key]: '' }));
      await load();
    } catch (answerError) {
      setError(answerError.message);
    } finally {
      setAnswering('');
    }
  };

  const state = data?.state ?? {};
  const instance = state.instance ?? {};
  const config = state.config ?? {};
  const peers = state.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== 'parent');
  const parent = state.parent ?? {};
  const parentPeer = peers.find((peer) => peer.relation === 'parent');
  const stats = state.stats ?? {};
  const tasks = state.tasks ?? [];
  const inbound = state.inboundTasks ?? [];
  const questions = state.questions ?? [];
  const pendingTasks = tasks.filter((task) => task.pendingQuestion);
  const pendingTotal = questions.length + pendingTasks.length;
  const activeOutbound = tasks.filter((task) => ['queued', 'running'].includes(task.status));
  const activeInbound = inbound.filter((task) => ['queued', 'running'].includes(task.status));
  const items = data?.activity?.items ?? [];
  const roleLabel = parent.connected || instance.role === 'member' ? '子 DSH' : '主 DSH';
  const taskCounts = ['queued', 'running', 'succeeded', 'failed', 'interrupted', 'canceled'].map((status) => ({
    status,
    value: [...tasks, ...inbound].filter((task) => task.status === status).length,
  }));
  const taskColors = { queued: '#f59e0b', running: '#4f8df7', succeeded: '#34c38f', failed: '#ef4444', interrupted: '#ef4444', canceled: '#94a3b8' };
  const taskLabels = { queued: '排队', running: '执行中', succeeded: '成功', failed: '失败', interrupted: '中断', canceled: '取消' };
  const endpoint = instance.endpoint ? `${String(instance.endpoint).replace(/^http/, 'ws')}/channel` : '未就绪';
  const parentVersion = parentPeer?.version || parent.node?.version || '';
  const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const renderPending = (question, key, body) => h('div', { key, style: { display: 'grid', gap: 7, padding: '10px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' } },
    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
      h('span', { style: { ...PANEL.chip, color: '#b7791f', background: 'rgba(183,121,31,0.12)', borderColor: 'rgba(183,121,31,0.35)' } }, '待处理'),
      h('span', { style: { fontSize: 12.5, lineHeight: 1.55, minWidth: 0 } }, question.text),
    ),
    question.options?.length
      ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, question.options.map((option) => h('button', {
          key: option, type: 'button',
          style: {
            ...S.secondary, padding: '4px 10px', borderRadius: 999, fontSize: 11.5,
            borderColor: answers[key] === option ? 'var(--dsw-alias-brand-primary)' : undefined,
            color: answers[key] === option ? 'var(--dsw-alias-brand-primary)' : undefined,
            background: answers[key] === option ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)' : undefined,
          },
          onClick: () => setAnswers((current) => ({ ...current, [key]: option })),
        }, option)))
      : null,
    h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      h('input', {
        style: { ...S.inputFlex, flex: '1 1 auto', height: 30, borderRadius: 7 },
        placeholder: '输入回答或选择上面的选项',
        value: answers[key] ?? '',
        onChange: (e) => setAnswers((current) => ({ ...current, [key]: e.target.value })),
      }),
      h('button', { type: 'button', style: { ...S.button, height: 30, padding: '0 14px' }, disabled: Boolean(answering), onClick: () => answer(key, body) }, answering === key ? '发送中…' : '回答'),
    ),
  );

  const tab = (key, label, count) => h('button', {
    key,
    type: 'button',
    onClick: () => setSection(key),
    style: {
      border: '1px solid ' + (section === key ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'),
      background: section === key ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)' : 'transparent',
      color: section === key ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
      borderRadius: 999,
      padding: '5px 12px',
      fontSize: 12,
      fontWeight: section === key ? 650 : 500,
      cursor: 'pointer',
    },
  }, count ? `${label} ${count}` : label);

  const filterButton = (active, label, onClick) => h('button', {
    type: 'button', onClick,
    style: {
      ...PANEL.chip, cursor: 'pointer', fontSize: 11,
      color: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
      borderColor: active ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)' : 'var(--dsw-alias-border-l2)',
      background: active ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)' : 'transparent',
    },
  }, label);

  const connectionOf = (label) => (state.connections ?? []).find((item) => item.peer === label) ?? null;
  const nodeDetail = (peer, isParent = false) => {
    const conn = connectionOf(peer.label);
    const facts = [
      ['唯一标识', peer.uuid || peer.instanceId || '', true],
      ['实例 ID', peer.instanceId || '', true],
      ['连接方向', peer.direction === 'out' ? '本机 → 对端' : peer.direction === 'in' ? '对端 → 本机' : '', false],
      ['连接时间', conn?.since ? new Date(conn.since).toLocaleString('zh-CN', { hour12: false }) : '', false],
      ['最近心跳', conn?.lastSeenAt ? new Date(conn.lastSeenAt).toLocaleString('zh-CN', { hour12: false }) : '', false],
      ['当前任务', peer.currentTask ? `${peer.currentTask.title || peer.currentTask.taskId}（${taskStatusLabel(peer.currentTask.status)}）` : '', false],
    ].filter(([, value]) => value);
    return h('div', { key: `${isParent ? 'parent' : 'child'}:${peer.label}`, style: { ...PANEL.card, padding: '12px 14px', marginBottom: 0 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 9 } },
        h('span', { style: { width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', background: panelAccent(peer.label).main, fontSize: 12, fontWeight: 700, boxShadow: `0 4px 12px ${panelAccent(peer.label).border}` } }, String(peer.label || '?').slice(0, 1)),
        h('span', { style: { fontSize: 13, fontWeight: 650 } }, peer.label),
        h(PanelChip, { tone: peer.connected ? 'on' : 'off' }, peer.connected ? '在线' : '离线'),
        peer.version ? h(PanelChip, null, `v${peer.version}`) : null,
        peer.encrypted ? h(E2EChip, { compact: true }) : null,
        h('span', { style: { ...S.meta, fontSize: 10.5, marginLeft: 'auto' } }, isParent ? '直接上级' : '直接下级'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '7px 14px' } },
        facts.map(([label, value, mono]) => h('div', { key: label, style: { display: 'grid', gap: 1, minWidth: 0 } },
          h('span', { style: { ...S.meta, fontSize: 10, letterSpacing: '0.2px' } }, label),
          h('span', { style: { fontSize: 11.5, lineHeight: 1.45, wordBreak: 'break-all', ...(mono ? { fontFamily: 'var(--dsw-font-mono, ui-monospace, monospace)' } : {}) } }, value),
        )),
      ),
      peer.description
        ? h('div', {
            style: {
              ...S.meta, marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--dsw-alias-border-l2)',
              fontSize: 11, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            },
            title: peer.description,
          }, peer.description)
        : null,
    );
  };

  const activityList = (limit) => items.filter(activityMatch).length
    ? h('div', { style: { position: 'relative', paddingLeft: 16 } },
        h('div', { style: { position: 'absolute', left: 6, top: 6, bottom: 6, width: 1, background: 'var(--dsw-alias-border-l2)' } }),
        items.filter(activityMatch).slice(0, limit).map((item) => {
          const kind = ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info;
          return h('div', { key: item.id, style: { display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', gap: 10, padding: '7px 0', position: 'relative' } },
            h('span', {
              style: {
                position: 'relative', zIndex: 1, width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center',
                color: kind.color, background: 'var(--dsw-alias-bg-l1)', border: `1px solid ${kind.color}55`,
                fontSize: 9.5, fontWeight: 700, marginLeft: -5,
              },
            }, String(kind.label || '·').slice(0, 1)),
            h('div', { style: { minWidth: 0, marginTop: 1 } },
              h('div', { style: { fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word' } }, item.text || '（无描述）'),
              h('div', { style: { ...S.meta, display: 'flex', gap: 7, flexWrap: 'wrap', fontSize: 10.5, marginTop: 2 } },
                h('span', { style: { color: kind.color, fontWeight: 600 } }, kind.label),
                h('span', null, timeOf(item.at)),
                item.peer ? h('span', null, item.peer) : null,
                item.taskId ? h('span', { style: S.mono }, item.taskId.slice(-10)) : null,
                item.status ? h('span', null, taskStatusLabel(item.status)) : null,
              ),
            ),
          );
        }),
      )
    : h('div', { style: PANEL.empty }, '没有符合筛选的活动');

  const incomingVisible = inbound.length > 0;
  const taskMatch = (task) => taskFilter === 'all' || (taskFilter === 'active' ? ['queued', 'running'].includes(task.status) : ['succeeded', 'failed', 'canceled', 'interrupted'].includes(task.status));
  const visibleTasks = tasks.filter(taskMatch);
  const visibleInbound = inbound.filter(taskMatch);
  const activityMatch = (item) => activityFilter === 'all'
    || (activityFilter === 'task' && ['task', 'result', 'queue', 'inbound'].includes(item.kind))
    || (activityFilter === 'question' && ['question', 'answer'].includes(item.kind))
    || (activityFilter === 'file' && item.kind === 'file')
    || (activityFilter === 'peer' && ['peer', 'info'].includes(item.kind));
  const approvalBlock = pendingTotal
    ? h('div', { style: { ...PANEL.card, marginBottom: 0, borderColor: 'rgba(183,121,31,0.35)' } },
        h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '需要你决定'), h(PanelChip, { tone: 'brand' }, `${pendingTotal} 条`)),
        pendingTasks.map((task) => renderPending(
          { text: `${task.title || task.taskId}：${task.pendingQuestion?.question || ''}`, options: task.pendingQuestion?.options },
          task.taskId,
          { taskId: task.taskId, answer: answers[task.taskId] ?? '' },
        )),
        questions.map((question) => renderPending(
          { text: `${question.from || '子 DSH'}：${question.question || ''}`, options: question.options },
          question.questionId,
          { questionId: question.questionId, answer: answers[question.questionId] ?? '' },
        )),
      )
    : h('div', { style: PANEL.card }, h('div', { style: PANEL.empty }, '当前没有需要人工处理的审批或提问'));

  return h('div', { style: PANEL.page },
    h('div', { style: PANEL.header },
      h('div', { style: PANEL.logo }, h(CowActivityIcon, { size: 18 })),
      h('div', { style: { display: 'grid', gap: 1, minWidth: 0 } },
        h('h1', { style: PANEL.title }, 'COW状态'),
        h('p', { style: PANEL.subtitle }, `${instance.displayName || '本机'} · ${roleLabel} · 每 4 秒自动刷新`),
      ),
      h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
        h(PanelChip, { tone: 'on' }, `${stats.connected ?? 0} 连接`),
        h(PanelChip, { tone: 'brand' }, `${stats.encrypted ?? 0} 加密`),
        pendingTotal ? h(PanelChip, { tone: 'brand' }, `${pendingTotal} 待处理`) : null,
        h('button', { type: 'button', style: { ...S.secondary, height: 28, padding: '0 10px', fontSize: 11.5 }, onClick: () => { void load(); }, disabled: loading }, loading ? '刷新中…' : '刷新'),
      ),
    ),
    error ? h('div', { style: { ...S.err, marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(197,48,48,0.08)' } }, `加载失败：${error}`) : null,
    h('div', { style: { ...PANEL.statGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))' } },
      h(StatCard, { label: '本机版本', value: instance.version ? `v${instance.version}` : '-', sub: 'dsh-cow', accent: PANEL_ACCENTS[0], icon: 'cube' }),
      h(StatCard, { label: '在线节点', value: stats.connected ?? 0, sub: `共 ${peers.length} 个节点`, accent: PANEL_ACCENTS[1], icon: 'network' }),
      h(StatCard, { label: '在线子 DSH', value: children.filter((child) => child.connected).length, sub: `${children.length} 个直接下级`, accent: PANEL_ACCENTS[2], icon: 'users' }),
      h(StatCard, { label: '执行 / 排队', value: activeOutbound.length + activeInbound.length, sub: `父端 ${activeOutbound.length} · 子端 ${activeInbound.length}`, accent: PANEL_ACCENTS[3], icon: 'activity' }),
      h(StatCard, { label: '待人工', value: pendingTotal, sub: `${pendingTasks.length} 审批 · ${questions.length} 提问`, accent: PANEL_ACCENTS[4], icon: 'alert' }),
      h(StatCard, { label: '加密连接', value: stats.encrypted ?? 0, sub: 'AES-256-GCM', accent: PANEL_ACCENTS[5], icon: 'lock' }),
    ),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 12 } },
      h('div', { style: { ...PANEL.card, marginBottom: 0 } },
        h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '节点连接'), h(PanelChip, null, `${peers.length} 个`)),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
          h(PanelDonut, {
            segments: [
              { label: '在线', value: stats.connected ?? 0, color: '#34c38f' },
              { label: '离线', value: Math.max(0, peers.length - (stats.connected ?? 0)), color: '#64748b' },
            ],
            centerValue: `${stats.connected ?? 0}/${peers.length}`,
            centerLabel: '在线',
          }),
          h('div', { style: { display: 'grid', gap: 7, flex: '1 1 130px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '在线'), h('b', { style: { color: '#34c38f' } }, stats.connected ?? 0)),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '离线'), h('b', { style: { color: '#94a3b8' } }, Math.max(0, peers.length - (stats.connected ?? 0)))),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '子节点'), h('b', null, children.length)),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '上级'), h('b', { style: { color: parent.connected ? '#34c38f' : '#94a3b8' } }, parent.connected ? '已连接' : '未连接')),
          ),
        ),
      ),
      h('div', { style: { ...PANEL.card, marginBottom: 0 } },
        h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '任务状态'), h(PanelChip, null, `${tasks.length + inbound.length} 条`)),
        h(PanelTaskBars, { rows: taskCounts.map((row) => ({ label: taskLabels[row.status], value: row.value, color: taskColors[row.status] })) }),
      ),
    ),
    h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14, padding: 4, borderRadius: 11, background: 'var(--dsw-alias-bg-l2)', width: 'fit-content' } },
      tab('overview', '概览'),
      tab('nodes', '节点', peers.length),
      tab('tasks', '任务', activeOutbound.length + activeInbound.length),
      tab('approvals', '审批/提问', pendingTotal),
      tab('activity', '活动', items.length),
    ),
    section === 'overview'
      ? h(React.Fragment, null,
          h(CowTopology, { state }),
          h('div', { style: PANEL.grid2 },
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '本机节点'), h(E2EChip, { enabled: Boolean(stats.encrypted) })),
              h(PanelKV, { rows: [
                ['唯一标识', h('span', { style: S.mono }, instance.uuid || instance.instanceId || '-')],
                ['WebSocket', endpoint],
                ['工作区根目录', config.allowedRoots || '-'],
                ['当前任务', state.currentInbound ? `${state.currentInbound.remoteTaskId}（${state.currentInbound.from}）` : '空闲'],
              ] }),
            ),
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '作为主 DSH'), h(PanelChip, { tone: children.some((child) => child.connected) ? 'on' : 'neutral' }, `${children.filter((child) => child.connected).length}/${children.length} 在线`)),
              h(PanelKV, { rows: [
                ['监听地址', `${config.listenHost || '127.0.0.1'}:${config.listenPort || '复用宿主'}`],
                ['连接地址', endpoint],
                ['连接密码', state.passwordConfigured ? '已设置' : '未设置'],
                ['子节点', children.length ? children.map((child) => `${child.label}（${child.connected ? '在线' : '离线'}${child.version ? ` v${child.version}` : ''}）`).join('；') : '无'],
              ] }),
            ),
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '作为子 DSH'), h(PanelChip, { tone: parent.connected ? 'on' : 'neutral' }, parent.connected ? '已连接上级' : '未连接上级')),
              h(PanelKV, { rows: [
                ['上级地址', parent.url || '无'],
                ['上级版本', parentVersion ? `v${parentVersion}` : '-'],
                ['连接状态', parent.connected ? '已连接（WebSocket）' : '未连接'],
                ['加密', h(E2EChip, { compact: true, enabled: Boolean(parentPeer?.encrypted) })],
                ...(activeInbound.length ? [['执行/排队', `${activeInbound.length} 条`]] : []),
              ] }),
            ),
          ),
        )
      : null,
    section === 'nodes'
      ? h('div', { style: { display: 'grid', gap: 12 } },
          h('div', { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: '0.4px' } }, '上级节点'),
          parentPeer ? nodeDetail(parentPeer, true) : h('div', { style: PANEL.card }, h('div', { style: PANEL.empty }, '无直接上级')),
          h('div', { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: '0.4px', marginTop: 4 } }, '本机节点'),
          nodeDetail({
            label: instance.displayName || '本机',
            connected: true,
            version: instance.version,
            uuid: instance.uuid,
            instanceId: instance.instanceId,
            encrypted: (stats.encrypted ?? 0) > 0,
            direction: '',
            currentTask: state.currentInbound ?? null,
            description: instance.description || '',
          }),
          h('div', { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: '0.4px', marginTop: 4 } }, '子节点（垂直排列）'),
          children.length
            ? h('div', { style: { display: 'grid', gap: 10 } }, children.map((child) => nodeDetail(child)))
            : h('div', { style: PANEL.card }, h('div', { style: PANEL.empty }, '当前没有子 DSH')),
        )
      : null,
    section === 'tasks'
      ? h(React.Fragment, null,
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
            filterButton(taskFilter === 'all', `全部 ${tasks.length + inbound.length}`, () => setTaskFilter('all')),
            filterButton(taskFilter === 'active', `进行中 ${activeOutbound.length + activeInbound.length}`, () => setTaskFilter('active')),
            filterButton(taskFilter === 'done', `已完成 ${tasks.length + inbound.length - activeOutbound.length - activeInbound.length}`, () => setTaskFilter('done')),
          ),
          h('div', { style: { display: 'grid', gap: 12, gridTemplateColumns: incomingVisible ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr' } },
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '我派出的任务'), h(PanelChip, null, `${visibleTasks.length} 条`)),
              visibleTasks.length ? h('div', null, visibleTasks.slice(0, 10).map((task) => h(TaskLine, { key: task.taskId, task, extra: task.peer }))) : h('div', { style: PANEL.empty }, '没有符合筛选的任务'),
            ),
            incomingVisible
              ? h('div', { style: { ...PANEL.card, marginBottom: 0 } },
                  h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '本机执行 / 排队'), h(PanelChip, null, `${visibleInbound.length} 条`)),
                  visibleInbound.length ? visibleInbound.slice(0, 10).map((task) => h(TaskLine, { key: task.taskId, task, extra: task.from })) : h('div', { style: PANEL.empty }, '没有符合筛选的任务'),
                )
              : null,
          ),
        )
      : null,
    section === 'approvals' ? approvalBlock : null,
    section === 'activity'
      ? h('div', { style: PANEL.card },
          h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '活动时间线'), h(PanelChip, null, `${items.filter(activityMatch).length} 条`)),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
            filterButton(activityFilter === 'all', '全部', () => setActivityFilter('all')),
            filterButton(activityFilter === 'task', '任务', () => setActivityFilter('task')),
            filterButton(activityFilter === 'question', '提问/审批', () => setActivityFilter('question')),
            filterButton(activityFilter === 'file', '文件', () => setActivityFilter('file')),
            filterButton(activityFilter === 'peer', '节点', () => setActivityFilter('peer')),
          ),
          activityList(200),
        )
      : null,
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
                          h('span', { style: ['queued', 'running'].includes(task.status) ? S.badgeOn : S.badgeOff }, task.status === 'queued' && task.queuePosition ? `排队第 ${task.queuePosition} 位` : taskStatusLabel(task.status)),
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
