/**
 * dsh-cow 客户端：侧边栏底部节点标识 + COW 状态面板 + 简洁的设置页。
 *
 * 纯消息架构：面板展示节点拓扑、连接明细与活动时间线；询问由被询问节点的 Agent 处理；
 * 设置页保留节点名称、子会话 preset、工作区根、连接密码、作为子 DSH 与折叠的高级项。
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
  inputFlex: { flex: '1 1 auto', minWidth: 120, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 'var(--dsw-radius-sm, 6px)', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', fontSize: 12, outline: 'none' },
  textarea: { flex: '1 1 auto', minWidth: 120, minHeight: 56, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 'var(--dsw-radius-sm, 6px)', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', fontSize: 12, outline: 'none', resize: 'vertical' },
  button: { border: '1px solid var(--dsw-alias-button-primary-fill)', background: 'var(--dsw-alias-button-primary-fill)', color: 'var(--dsw-alias-label-primary-foreground)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  secondary: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-l2)', color: 'var(--dsw-alias-label-primary)', borderRadius: 'var(--dsw-radius-sm, 6px)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  hint: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.6 },
  meta: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
  err: { fontSize: 12, color: 'var(--dsw-alias-label-error)' },
  ok: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
  row: { display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 },
};

function Row({ label, children, nowrap = false }) {
  return h('div', { style: { display: 'contents' } },
    h('span', { style: S.formLabel }, label),
    h('div', { style: nowrap ? { ...S.formValue, flexWrap: 'nowrap' } : S.formValue }, children),
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

// ── 面板视觉 ────────────────────────────────────────────────────

const ACTIVITY_KIND = {
  message: { label: '消息', short: '消', color: '#4f8df7' },
  peer: { label: '节点', short: '节', color: '#34c38f' },
  file: { label: '文件', short: '文', color: '#f59e0b' },
  question: { label: '询问', short: '问', color: '#a78bfa' },
  answer: { label: '回答', short: '答', color: '#22d3ee' },
  error: { label: '错误', short: '错', color: '#ef4444' },
  info: { label: '信息', short: '信', color: '#8a8f9c' },
};

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
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))', gap: 10, marginBottom: 14 },
  card: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, padding: '14px 16px', background: 'var(--dsw-alias-bg-l1)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.035)', marginBottom: 12 },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 13, fontWeight: 650, letterSpacing: '-0.1px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 12 },
  kvRow: { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 10, fontSize: 12, lineHeight: 1.65, padding: '2px 0' },
  kvKey: { ...S.meta, fontSize: 11.5 },
  kvVal: { wordBreak: 'break-all' },
  empty: { ...S.hint, padding: '18px 0', textAlign: 'center', fontSize: 12 },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 999, border: '1px solid var(--dsw-alias-border-l2)', fontSize: 10.5, fontWeight: 600 },
};

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
    clock: ['M12 8v4l3 2', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
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

function PanelBars({ rows }) {
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

function roleSurface(role) {
  if (role === 'self') {
    return { background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-l1))', border: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 38%, var(--dsw-alias-border-l2))' };
  }
  if (role === 'parent') {
    return { background: 'color-mix(in srgb, #6366f1 5%, var(--dsw-alias-bg-l1))', border: 'color-mix(in srgb, #6366f1 22%, var(--dsw-alias-border-l2))' };
  }
  return { background: 'color-mix(in srgb, #14b8a6 4%, var(--dsw-alias-bg-l1))', border: 'color-mix(in srgb, #14b8a6 20%, var(--dsw-alias-border-l2))' };
}

function CowActivityIcon({ size = 16 }) {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true',
  },
    h('path', { d: 'M8.2 6.7C7.4 5.5 7.2 4.4 7.7 3.4c1.2.5 2.1 1.5 2.6 2.8' }),
    h('path', { d: 'M15.8 6.7c.8-1.2 1-2.3.5-3.3-1.2.5-2.1 1.5-2.6 2.8' }),
    h('path', { d: 'M5.2 10.8C3.8 10.6 2.8 10 2.3 9.1c1.1-.5 2.3-.5 3.4 0' }),
    h('path', { d: 'M18.8 10.8c1.4-.2 2.4-.8 2.9-1.7-1.1-.5-2.3-.5-3.4 0' }),
    h('path', { d: 'M6 11.2a6 6 0 0 1 12 0v2.4a6 6 0 0 1-12 0z' }),
    h('circle', { cx: 9.7, cy: 10.8, r: 0.95, fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: 14.3, cy: 10.8, r: 0.95, fill: 'currentColor', stroke: 'none' }),
    h('rect', { x: 9, y: 14.1, width: 6, height: 4.6, rx: 2.3 }),
    h('circle', { cx: 10.9, cy: 16.3, r: 0.58, fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: 13.1, cy: 16.3, r: 0.58, fill: 'currentColor', stroke: 'none' }),
  );
}

// ── 拓扑图 ──────────────────────────────────────────────────────

function CowTopology({ state }) {
  const STORAGE_KEY = 'dsh-cow:topology:v3';
  const NODE_W = 236;
  const [positions, setPositions] = React.useState(() => {
    try {
      if (typeof window === 'undefined') return {};
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  });
  const [view, setView] = React.useState({ x: 0, y: 0, zoom: 0.9 });
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
  const gap = 28;
  const childTotalWidth = children.length ? children.length * NODE_W + (children.length - 1) * gap : NODE_W;
  const canvasWidth = Math.max(760, childTotalWidth + 80);
  const canvasHeight = 470;
  const childStartX = (canvasWidth - childTotalWidth) / 2;
  const defaults = {
    self: { x: (canvasWidth - NODE_W) / 2, y: 150 },
    ...(parent ? { [`parent:${parent.peerName}`]: { x: (canvasWidth - NODE_W) / 2, y: 20 } } : {}),
    ...Object.fromEntries(children.map((child, index) => [`child:${child.peerName}`, { x: childStartX + index * (NODE_W + gap), y: 340 }])),
  };
  const positionOf = (key) => positions[key] ?? defaults[key] ?? { x: 20, y: 20 };
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
    setView({ x: 0, y: 0, zoom: 0.9 });
  };

  const nodeCard = (key, label, meta, options = {}) => {
    const accent = panelAccent(label);
    const position = positionOf(key);
    const tone = roleSurface(options.self ? 'self' : options.role ?? 'child');
    return h('div', {
      key,
      'data-node': 'true',
      onPointerDown: (event) => startDrag(event, key),
      onDoubleClick: () => setPositions((value) => { const next = { ...value }; delete next[key]; return next; }),
      title: '拖动调整位置；双击恢复默认位置',
      style: {
        position: 'absolute', left: position.x, top: position.y, width: NODE_W,
        border: `1px solid ${tone.border}`,
        borderRadius: 12, padding: '10px 12px', cursor: 'grab', userSelect: 'none',
        background: tone.background,
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
      meta.note
        ? h('div', { style: { ...S.meta, fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, meta.note)
        : null,
    );
  };

  const edges = [];
  if (parent) {
    const from = positionOf(`parent:${parent.peerName}`);
    const to = positionOf('self');
    edges.push({ key: 'p', d: `M ${from.x + NODE_W / 2} ${from.y + 78} C ${from.x + NODE_W / 2} ${from.y + 110}, ${to.x + NODE_W / 2} ${to.y - 30}, ${to.x + NODE_W / 2} ${to.y}` });
  }
  for (const child of children) {
    const from = positionOf('self');
    const to = positionOf(`child:${child.peerName}`);
    const fromX = from.x + NODE_W / 2;
    const toX = to.x + NODE_W / 2;
    edges.push({ key: child.peerName, d: `M ${fromX} ${from.y + 82} C ${fromX} ${from.y + 128}, ${toX} ${to.y - 48}, ${toX} ${to.y}` });
  }

  return h('div', { style: { ...PANEL.card, background: 'linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, var(--dsw-alias-bg-l1)), var(--dsw-alias-bg-l1))' } },
    h('div', { style: PANEL.cardHead },
      h('div', { style: { display: 'grid', gap: 1 } },
        h('h3', { style: PANEL.cardTitle }, '节点拓扑'),
        h('span', { style: { ...S.meta, fontSize: 11 } }, '上层上级、中层当前、下层子节点；拖动节点调整，拖空白平移'),
      ),
      h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
        h(PanelChip, { tone: 'brand' }, `${children.filter((child) => child.connected).length}/${children.length} 子节点在线`),
        h('button', { type: 'button', style: { ...S.secondary, height: 26, padding: '0 8px', fontSize: 11 }, onClick: () => setView((value) => ({ ...value, zoom: Math.min(1.5, value.zoom + 0.1) })) }, '+'),
        h('span', { style: { ...S.meta, minWidth: 34, textAlign: 'center' } }, `${Math.round(view.zoom * 100)}%`),
        h('button', { type: 'button', style: { ...S.secondary, height: 26, padding: '0 8px', fontSize: 11 }, onClick: () => setView((value) => ({ ...value, zoom: Math.max(0.6, value.zoom - 0.1) })) }, '−'),
        h('button', { type: 'button', style: { ...S.secondary, height: 26, padding: '0 8px', fontSize: 11 }, onClick: resetLayout }, '重置布局'),
      ),
    ),
    h('div', {
      onPointerDown: startPan,
      style: {
        position: 'relative', height: 430, overflow: 'hidden', borderRadius: 10,
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
        parent ? nodeCard(`parent:${parent.peerName}`, parent.peerName, { version: parent.version, encrypted: parent.encrypted, note: parent.description }, { connected: parent.connected, role: 'parent' }) : null,
        nodeCard('self', instance.displayName || '本机', { version: instance.version, encrypted: (state.stats?.encrypted ?? 0) > 0, note: instance.endpoint }, { self: true, connected: true }),
        children.map((child) => nodeCard(`child:${child.peerName}`, child.peerName, { version: child.version, encrypted: child.encrypted, note: child.description }, { connected: child.connected, role: 'child' })),
        !parent ? h('div', { style: { position: 'absolute', left: (canvasWidth - 150) / 2, top: 18, ...PANEL.chip, color: 'var(--dsw-alias-label-tertiary)', borderStyle: 'dashed' } }, '无直接上级') : null,
        children.length === 0
          ? h('div', { style: { position: 'absolute', left: (canvasWidth - 150) / 2, top: 332, ...PANEL.chip, color: 'var(--dsw-alias-label-tertiary)', borderStyle: 'dashed' } }, '无直接下级')
          : null,
      ),
    ),
  );
}

// ── COW 状态面板 ────────────────────────────────────────────────

function CowActivityPanel() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [toolMessage, setToolMessage] = React.useState('');
  const [section, setSection] = React.useState('overview');
  const [activityFilter, setActivityFilter] = React.useState('all');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activityResponse, stateResponse] = await Promise.all([
        fetch(activityUrl(200), { credentials: 'same-origin' }),
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

  const runDoctor = async () => {
    setToolMessage('正在生成诊断包…');
    try {
      const response = await fetch(api('doctor'), { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      setToolMessage(`诊断包：${payload?.path ?? ''}`);
    } catch (doctorError) {
      setError(doctorError.message);
      setToolMessage('');
    }
  };

  const state = data?.state ?? {};
  const instance = state.instance ?? {};
  const installedVersion = String(state.installedVersion || instance.installedVersion || instance.version || '');
  const runningVersion = String(instance.version || '');
  const versionMismatch = Boolean(installedVersion && runningVersion && installedVersion !== runningVersion);
  const config = state.config ?? {};
  const peers = state.peers ?? [];
  const children = peers.filter((peer) => peer.relation !== 'parent');
  const parentPeer = peers.find((peer) => peer.relation === 'parent') ?? null;
  const parent = state.parent ?? {};
  const stats = state.stats ?? {};
  const pending = state.pendingAsks ?? [];
  const items = data?.activity?.items ?? [];
  const connectedCount = stats.connected ?? peers.filter((peer) => peer.connected).length;
  const encryptedCount = stats.encrypted ?? peers.filter((peer) => peer.encrypted).length;
  const roleLabel = instance.role === 'member' ? '子 DSH' : '主 DSH';
  const endpoint = instance.endpoint ? `${String(instance.endpoint).replace(/^http/, 'ws')}/channel` : '未就绪';
  const parentVersion = parentPeer?.version || parent.node?.version || '';
  const timeOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('zh-CN', { hour12: false });
  };
  const dateOf = (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false });
  };
  const connectionOf = (label) => (state.connections ?? []).find((item) => item.peerName === label) ?? null;

  const activityKind = (item) => ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info;
  const activityMatch = (item) => activityFilter === 'all'
    || (activityFilter === 'message' && item.kind === 'message')
    || (activityFilter === 'peer' && item.kind === 'peer')
    || (activityFilter === 'file' && item.kind === 'file');
  const visibleItems = items.filter(activityMatch);

  const activityKinds = ['message', 'peer', 'file', 'info'].map((kind) => ({
    kind,
    label: ACTIVITY_KIND[kind].label,
    color: ACTIVITY_KIND[kind].color,
    value: items.filter((item) => (ACTIVITY_KIND[item.kind] ?? ACTIVITY_KIND.info) === ACTIVITY_KIND[kind]).length,
  }));

  const tab = (key, label, count, icon) => {
    const active = section === key;
    return h('button', {
      key,
      type: 'button',
      onClick: () => setSection(key),
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
        border: 'none', borderBottom: `2px solid ${active ? 'var(--dsw-alias-brand-primary)' : 'transparent'}`,
        background: 'transparent', padding: '8px 1px 9px', marginBottom: -1,
        color: active ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
        cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 650 : 500,
      },
    },
      h('span', { style: { display: 'inline-flex', color: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-tertiary)' } }, h(PanelIcon, { name: icon, size: 13 })),
      h('span', null, label),
      count
        ? h('span', {
            style: {
              minWidth: 17, padding: '0 5px', height: 16, borderRadius: 999, display: 'inline-grid', placeItems: 'center',
              fontSize: 9.5, fontWeight: 650,
              color: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
              background: active ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent)' : 'var(--dsw-alias-bg-l2)',
            },
          }, count)
        : null,
    );
  };

  const filterButton = (active, label, onClick) => h('button', {
    type: 'button', onClick,
    style: {
      ...PANEL.chip, cursor: 'pointer', fontSize: 11,
      color: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
      borderColor: active ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)' : 'var(--dsw-alias-border-l2)',
      background: active ? 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)' : 'transparent',
    },
  }, label);

  const nodeDetail = (peer, role = 'child') => {
    const tone = roleSurface(role);
    const roleText = role === 'parent' ? '上级节点' : role === 'self' ? '本机节点' : '下级节点';
    const conn = connectionOf(peer.peerName);
    const facts = [
      ['唯一标识', peer.uuid || peer.peerId || '', true],
      ['peerId', peer.peerId || '', true],
      ['连接方向', peer.direction === 'out' ? '本机 → 对端' : peer.direction === 'in' ? '对端 → 本机' : '', false],
      ['连接时间', conn?.since ? dateOf(conn.since) : '', false],
      ['最近心跳', conn?.lastSeenAt ? dateOf(conn.lastSeenAt) : '', false],
      ['加密', peer.encrypted ? 'AES-256-GCM' : '未加密', false],
    ].filter(([, value]) => value);
    return h('div', { key: `${role}:${peer.peerName}`, style: { ...PANEL.card, padding: '12px 14px', marginBottom: 0, background: tone.background, borderColor: tone.border } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 9 } },
        h('span', { style: { width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff', background: panelAccent(peer.peerName).main, fontSize: 12, fontWeight: 700, boxShadow: `0 4px 12px ${panelAccent(peer.peerName).border}` } }, String(peer.peerName || '?').slice(0, 1)),
        h('span', { style: { fontSize: 13, fontWeight: 650 } }, peer.peerName),
        h(PanelChip, { tone: peer.connected ? 'on' : 'off' }, peer.connected ? '在线' : '离线'),
        peer.version ? h(PanelChip, null, `v${peer.version}`) : null,
        peer.encrypted ? h(E2EChip, { compact: true }) : null,
        h('span', { style: { ...S.meta, fontSize: 10.5, marginLeft: 'auto' } }, roleText),
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

  const activityList = (limit) => visibleItems.length
    ? h('div', { style: { position: 'relative', paddingLeft: 16 } },
        h('div', { style: { position: 'absolute', left: 6, top: 6, bottom: 6, width: 1, background: 'var(--dsw-alias-border-l2)' } }),
        visibleItems.slice(0, limit).map((item) => {
          const kind = activityKind(item);
          return h('div', { key: item.id, style: { display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr)', gap: 10, padding: '7px 0', position: 'relative' } },
            h('span', {
              style: {
                position: 'relative', zIndex: 1, width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center',
                color: kind.color, background: 'var(--dsw-alias-bg-l1)', border: `1px solid ${kind.color}55`,
                fontSize: 9.5, fontWeight: 700, marginLeft: -5,
              },
            }, kind.short),
            h('div', { style: { minWidth: 0, marginTop: 1 } },
              h('div', { style: { fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word' } }, item.text || '（无描述）'),
              h('div', { style: { ...S.meta, display: 'flex', gap: 7, flexWrap: 'wrap', fontSize: 10.5, marginTop: 2 } },
                h('span', { style: { color: kind.color, fontWeight: 600 } }, kind.label),
                h('span', null, timeOf(item.at)),
                item.from || item.to
                  ? h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, `${item.from || '?'} → ${item.to || '?'}`)
                  : (item.peerName ? h('span', null, item.peerName) : null),
                item.messageId ? h('span', { style: S.mono }, String(item.messageId).slice(-12)) : null,
                item.status ? h('span', null, item.status) : null,
              ),
            ),
          );
        }),
      )
    : h('div', { style: PANEL.empty }, '没有符合筛选的活动');

  return h('div', { style: PANEL.page },
    h('div', { style: PANEL.header },
      h('div', { style: PANEL.logo }, h(CowActivityIcon, { size: 18 })),
      h('div', { style: { display: 'grid', gap: 1, minWidth: 0 } },
        h('h1', { style: PANEL.title }, 'COW状态'),
        h('p', { style: PANEL.subtitle }, `${instance.displayName || '本机'} · ${roleLabel} · 每 4 秒自动刷新`),
      ),
      h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
        h(PanelChip, { tone: 'on' }, `${connectedCount} 连接`),
        h(PanelChip, { tone: 'brand' }, `${encryptedCount} 加密`),
        pending.length ? h(PanelChip, { tone: 'brand', title: '由被询问节点的 Agent 处理（可请示上级或让用户在本机界面回答）' }, `${pending.length} 询问中`) : null,
        h('button', { type: 'button', style: { ...S.secondary, height: 28, padding: '0 10px', fontSize: 11.5 }, onClick: () => void runDoctor() }, '诊断包'),
        h('button', { type: 'button', style: { ...S.secondary, height: 28, padding: '0 10px', fontSize: 11.5 }, onClick: () => { void load(); }, disabled: loading }, loading ? '刷新中…' : '刷新'),
      ),
    ),
    error ? h('div', { style: { ...S.err, marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(197,48,48,0.08)' } }, `加载失败：${error}`) : null,
    toolMessage ? h('div', { style: { ...S.meta, marginBottom: 10, wordBreak: 'break-all' } }, toolMessage) : null,
    h('div', { style: PANEL.statGrid },
      h(StatCard, {
        label: '本机版本',
        value: instance.version
          ? h('a', {
              href: api('package'),
              download: `dsh-cow-${installedVersion || instance.version}.tgz`,
              title: versionMismatch ? `下载已安装的 dsh-cow ${installedVersion} 插件包（运行中仍是 ${runningVersion}）` : '下载本机 dsh-cow 插件包',
              'aria-label': `下载 dsh-cow ${installedVersion || instance.version} 插件包`,
              style: { color: 'inherit', textDecoration: 'underline', textDecorationThickness: '1px', textUnderlineOffset: 3, cursor: 'pointer' },
            }, `v${instance.version}`)
          : '-',
        sub: versionMismatch ? `已安装 v${installedVersion} · 重启后生效 · 点击下载` : 'dsh-cow · 点击下载插件包',
        accent: PANEL_ACCENTS[0],
        icon: 'cube',
      }),
      h(StatCard, { label: '在线节点', value: `${connectedCount}/${peers.length}`, sub: `共 ${peers.length} 个节点`, accent: PANEL_ACCENTS[1], icon: 'network' }),
      h(StatCard, { label: '在线子 DSH', value: children.filter((child) => child.connected).length, sub: `${children.length} 个直接下级`, accent: PANEL_ACCENTS[2], icon: 'users' }),
      h(StatCard, { label: '询问中', value: pending.length, sub: '由被询问节点 Agent 处理', accent: PANEL_ACCENTS[3], icon: 'alert' }),
      h(StatCard, { label: '加密连接', value: encryptedCount, sub: 'AES-256-GCM', accent: PANEL_ACCENTS[4], icon: 'lock' }),
      h(StatCard, { label: '活动', value: items.length, sub: '最近 200 条', accent: PANEL_ACCENTS[5], icon: 'activity' }),
    ),
    h('div', { style: PANEL.grid2 },
      h('div', { style: { ...PANEL.card, marginBottom: 0 } },
        h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '节点连接'), h(PanelChip, null, `${peers.length} 个`)),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
          h(PanelDonut, {
            segments: [
              { label: '在线', value: connectedCount, color: '#34c38f' },
              { label: '离线', value: Math.max(0, peers.length - connectedCount), color: '#64748b' },
            ],
            centerValue: `${connectedCount}/${peers.length}`,
            centerLabel: '在线',
          }),
          h('div', { style: { display: 'grid', gap: 7, flex: '1 1 130px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '在线'), h('b', { style: { color: '#34c38f' } }, connectedCount)),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '离线'), h('b', { style: { color: '#94a3b8' } }, Math.max(0, peers.length - connectedCount))),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '子节点'), h('b', null, children.length)),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11.5 } }, h('span', { style: S.meta }, '上级'), h('b', { style: { color: parent.connected ? '#34c38f' : '#94a3b8' } }, parent.connected ? '已连接' : '未连接')),
          ),
        ),
      ),
      h('div', { style: { ...PANEL.card, marginBottom: 0 } },
        h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '活动构成'), h(PanelChip, null, `${items.length} 条`)),
        h(PanelBars, { rows: activityKinds.map((row) => ({ label: row.label, value: row.value, color: row.color })) }),
      ),
    ),
    h('div', { style: { display: 'flex', gap: 20, marginBottom: 14, padding: 0, borderBottom: '1px solid var(--dsw-alias-border-l2)', width: '100%', maxWidth: '100%', overflowX: 'auto' } },
      tab('overview', '概览', null, 'network'),
      tab('nodes', '节点', peers.length, 'users'),
      tab('activity', '活动', items.length, 'clock'),
    ),
    section === 'overview'
      ? h(React.Fragment, null,
          h(CowTopology, { state }),
          h('div', { style: PANEL.grid2 },
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '本机节点'), h(E2EChip, { enabled: encryptedCount > 0 })),
              h(PanelKV, { rows: [
                ['唯一标识', h('span', { style: S.mono }, instance.uuid || instance.peerId || '-')],
                ['WebSocket', endpoint],
                ['工作区根目录', config.allowedRoots || '-'],
                ['子会话 preset', config.agentPreset || 'profile 默认'],
              ] }),
            ),
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '作为主 DSH'), h(PanelChip, { tone: children.some((child) => child.connected) ? 'on' : 'neutral' }, `${children.filter((child) => child.connected).length}/${children.length} 在线`)),
              h(PanelKV, { rows: [
                ['监听地址', `${config.listenHost || '127.0.0.1'}:${config.listenPort || '复用宿主'}`],
                ['连接地址', endpoint],
                ['连接密码', state.passwordConfigured ? '已设置' : '未设置'],
                ['子节点', `历史 ${children.length} 个 · 在线 ${children.filter((child) => child.connected).length} 个`],
              ] }),
            ),
            h('div', { style: { ...PANEL.card, marginBottom: 0 } },
              h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '作为子 DSH'), h(PanelChip, { tone: parent.connected ? 'on' : 'neutral' }, parent.connected ? '已连接上级' : '未连接上级')),
              h(PanelKV, { rows: [
                ['上级地址', parent.url || '无'],
                ['上级版本', parentVersion ? `v${parentVersion}` : '-'],
                ['连接状态', parent.connected ? '已连接（WebSocket）' : '未连接'],
                ['加密', h(E2EChip, { compact: true, enabled: Boolean(parentPeer?.encrypted) })],
              ] }),
            ),
          ),
        )
      : null,
    section === 'nodes'
      ? h('div', { style: { display: 'grid', gap: 12 } },
          h('div', { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: '0.4px' } }, '上级节点'),
          parentPeer ? nodeDetail(parentPeer, 'parent') : h('div', { style: PANEL.card }, h('div', { style: PANEL.empty }, '无直接上级')),
          h('div', { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: '0.4px', marginTop: 4 } }, '本机节点'),
          nodeDetail({
            label: instance.displayName || '本机',
            connected: true,
            version: instance.version,
            uuid: instance.uuid,
            peerId: instance.peerId,
            encrypted: encryptedCount > 0,
            direction: '',
            description: instance.description || '',
          }, 'self'),
          h('div', { style: { ...S.meta, fontSize: 10.5, fontWeight: 650, letterSpacing: '0.4px', marginTop: 4 } }, '子节点'),
          children.length
            ? h('div', { style: { display: 'grid', gap: 10 } }, children.map((child) => nodeDetail(child, 'child')))
            : h('div', { style: PANEL.card }, h('div', { style: PANEL.empty }, '当前没有子 DSH')),
        )
      : null,
    section === 'activity'
      ? h('div', { style: PANEL.card },
          h('div', { style: PANEL.cardHead }, h('h3', { style: PANEL.cardTitle }, '活动时间线'), h(PanelChip, null, `${visibleItems.length} 条`)),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
            filterButton(activityFilter === 'all', '全部', () => setActivityFilter('all')),
            filterButton(activityFilter === 'message', '消息', () => setActivityFilter('message')),
            filterButton(activityFilter === 'peer', '节点', () => setActivityFilter('peer')),
            filterButton(activityFilter === 'file', '文件', () => setActivityFilter('file')),
          ),
          activityList(200),
        )
      : null,
  );
}

// ── 简洁设置页 ──────────────────────────────────────────────────

function field(label, control) {
  return h('label', { key: label, style: { display: 'grid', gap: 5, minWidth: 0 } },
    h('span', { style: { ...S.meta, fontSize: 11, fontWeight: 550 } }, label),
    control,
  );
}

function CoCowSettingsPage() {
  const [data, setData] = React.useState(null);
  const [form, setForm] = React.useState(null);
  const [advanced, setAdvanced] = React.useState(false);
  const [busy, setBusy] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [pwdInput, setPwdInput] = React.useState('');
  const [pwdConfigured, setPwdConfigured] = React.useState(false);
  const [parentUrl, setParentUrl] = React.useState('');
  const [parentPassword, setParentPassword] = React.useState('');

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
      const [pwd, parent, state] = await Promise.all([
        fetch(api('password'), { credentials: 'same-origin' }).catch(() => null),
        fetch(api('parent'), { credentials: 'same-origin' }).catch(() => null),
        fetch(stateUrl(), { credentials: 'same-origin' }),
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
      window.dispatchEvent(new Event('dsh-cow:state-changed'));
      setMessage('已保存。');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  const savePassword = async () => {
    if (busy || !pwdInput) return;
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
      window.dispatchEvent(new Event('dsh-cow:state-changed'));
      setMessage('连接密码已保存。');
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
      window.dispatchEvent(new Event('dsh-cow:state-changed'));
      setMessage(payload?.url ? '已保存上级地址，正在重连。' : '已清除上级地址。');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy('');
    }
  };

  if (!data || !form) {
    return h('div', { style: S.wrap }, error ? h('div', { style: S.err }, error) : h('div', { style: S.hint }, '正在读取 dsh-cow 状态…'));
  }

  const instance = data.instance ?? {};

  return h('div', { style: S.wrap },
    h('p', { style: S.lead }, 'dsh-cow 让多台 DSH 通过一条 WebSocket 长连接协同：主 DSH 派消息，子 DSH 回合结束自动回报，ask/answer 回到同一会话。详细状态点侧边栏底部的节点按钮打开。'),

    error ? h('div', { style: { ...S.err, marginBottom: 10 } }, error) : null,
    message ? h('div', { style: { ...S.ok, marginBottom: 10 } }, message) : null,

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '本机节点'),
        h('div', { style: S.row },
          h(PanelChip, { tone: instance.role === 'member' ? 'neutral' : 'on' }, instance.role === 'member' ? '子 DSH' : '主 DSH'),
          h(PanelChip, null, `v${data.pluginVersion || instance.version || ''}`),
        ),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 } },
        field('节点名称', h('input', { style: S.inputFlex, value: form.displayName, placeholder: '留空用计算机名', onChange: (event) => update('displayName', event.target.value) })),
        field('子会话 preset', h('input', { style: S.inputFlex, value: form.agentPreset, placeholder: '留空用 profile 默认', onChange: (event) => update('agentPreset', event.target.value) })),
        field('工作区根目录', h('textarea', {
          style: { ...S.textarea, gridColumn: '1 / -1' },
          value: form.allowedRoots,
          placeholder: '每行一个绝对路径',
          onChange: (event) => update('allowedRoots', event.target.value),
        })),
      ),
      h('div', { style: { ...S.row, marginTop: 12, justifyContent: 'space-between' } },
        h('button', { type: 'button', style: S.secondary, onClick: () => setAdvanced((value) => !value) }, advanced ? '收起高级设置' : '高级设置'),
        h('button', { type: 'button', style: S.button, disabled: busy === 'save', onClick: () => void saveSettings() }, busy === 'save' ? '保存中…' : '保存'),
      ),
      advanced
        ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--dsw-alias-border-l2)' } },
            field('监听地址', h('input', { style: S.inputFlex, value: form.listenHost, onChange: (event) => update('listenHost', event.target.value) })),
            field('监听端口', h('input', { style: S.inputFlex, type: 'number', min: 0, value: form.listenPort, onChange: (event) => update('listenPort', event.target.value) })),
            field('文件上限 MB', h('input', { style: S.inputFlex, type: 'number', min: 1, max: 1024, value: form.maxFileMB, onChange: (event) => update('maxFileMB', event.target.value) })),
            field('并发传输', h('input', { style: S.inputFlex, type: 'number', min: 1, max: 16, value: form.maxConcurrentFiles, onChange: (event) => update('maxConcurrentFiles', event.target.value) })),
            field('能力说明', h('textarea', { style: S.textarea, value: form.capabilityNote, onChange: (event) => update('capabilityNote', event.target.value) })),
          )
        : null,
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '连接密码'),
        h(PanelChip, { tone: pwdConfigured ? 'on' : 'off' }, pwdConfigured ? '已配置' : '未配置'),
      ),
      h('div', { style: S.row },
        h('input', { style: S.inputFlex, type: 'password', value: pwdInput, placeholder: '至少 12 个字符', onChange: (event) => setPwdInput(event.target.value) }),
        h('button', { type: 'button', style: S.button, disabled: busy === 'password' || pwdInput.trim().length < 12, onClick: () => void savePassword() }, busy === 'password' ? '保存中…' : '保存'),
      ),
      h('div', { style: { ...S.hint, marginTop: 8 } }, '同一密码用于所有子 DSH；修改后已连接的节点需要重新连接。'),
    ),

    h('div', { style: S.card },
      h('div', { style: S.cardHead },
        h('h3', { style: S.cardTitle }, '作为子 DSH：连到上级'),
        h(PanelChip, { tone: data.parent?.connected ? 'on' : 'off' }, data.parent?.connected ? '已连接' : '未连接'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 } },
        field('上级地址', h('input', { style: S.inputFlex, value: parentUrl, placeholder: 'ws://192.168.1.10:59999/cow/v1/channel', onChange: (event) => setParentUrl(event.target.value) })),
        field('共用密码', h('input', { style: S.inputFlex, type: 'password', value: parentPassword, onChange: (event) => setParentPassword(event.target.value) })),
      ),
      h('div', { style: { ...S.row, marginTop: 12 } },
        h('button', { type: 'button', style: S.button, disabled: busy === 'parent', onClick: () => void saveParent() }, busy === 'parent' ? '保存中…' : '保存并重连'),
      ),
    ),

    h('div', { style: S.hint }, '纯消息架构：消息直接进入对方会话输入队列，不建任务、不轮询。'),
  );
}

// ── 侧边栏底部：本机节点标识 ──────────────────────────────────

// 由 apply() 注入的布局服务；用于点击节点标识打开 COW 状态。
let ctxLayout = null;

function useCowNode() {
  const [node, setNode] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(stateUrl(), { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        if (alive) setNode(data);
      } catch {
        if (alive) setNode(null);
      }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 15_000);
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('dsh-cow:state-changed', onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('dsh-cow:state-changed', onFocus);
    };
  }, []);
  return node;
}

function CowNodeBadge({ wide }) {
  const state = useCowNode();
  const [hover, setHover] = React.useState(false);
  if (!state?.instance) return null;
  const instance = state.instance;
  const name = String(instance.displayName || state.config?.displayName || '').trim() || '未命名节点';
  const role = instance.role === 'leader' ? '主 DSH' : instance.role === 'member' ? '子 DSH' : '节点';
  const connected = Number(state.stats?.connected) || 0;
  const peerId = String(instance.peerId || '');
  const online = connected > 0;
  const title = `本机 COW 节点：${name}\n${peerId}${online ? `\n${connected} 个连接` : '\n未连接'}\n点击查看 COW 状态`;
  const openStatus = () => {
    try { ctxLayout?.selectPanel?.('cow-activity'); } catch { /* 面板不可用时忽略 */ }
  };

  if (!wide) {
    return h('button', {
      type: 'button',
      title,
      'aria-label': `打开 COW 状态：${name}`,
      onClick: openStatus,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        width: 36, height: 36, display: 'grid', placeItems: 'center', margin: '0 auto',
        border: 0, borderRadius: 'var(--dsw-radius-md)', cursor: 'pointer',
        color: 'var(--dsw-alias-brand-primary)',
        background: hover ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
      },
    },
      h('span', { style: { position: 'relative', display: 'inline-flex' } },
        h(CowActivityIcon, { size: 19 }),
        h('span', { style: {
          position: 'absolute', right: -2, bottom: -1, width: 7, height: 7, borderRadius: 999,
          background: online ? '#34c38f' : '#94a3b8', border: '1.5px solid var(--dsw-alias-bg-base)',
        } }),
      ),
    );
  }

  return h('button', {
    type: 'button',
    title,
    'aria-label': `打开 COW 状态：${name}`,
    onClick: openStatus,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, height: 40,
      padding: '4px 8px', boxSizing: 'border-box', border: 0, borderRadius: 'var(--dsw-radius-md)',
      background: hover ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
      color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', textAlign: 'left', font: 'inherit',
    },
  },
    h('span', { style: {
      width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', flex: 'none',
      color: 'var(--dsw-alias-brand-primary)',
      background: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)',
    } }, h(CowActivityIcon, { size: 16 })),
    h('span', { style: { display: 'grid', gap: 1, minWidth: 0, flex: '1 1 auto' } },
      h('span', { style: { fontSize: 12, fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
      h('span', { style: { display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, fontSize: 10.5, lineHeight: 1.3, color: 'var(--dsw-alias-label-tertiary)' } },
        h('span', { style: { width: 6, height: 6, borderRadius: 999, flex: 'none', background: online ? '#34c38f' : '#94a3b8' } }),
        h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `COW · ${role} · ${online ? `${connected} 连接` : '未连接'}`),
      ),
    ),
  );
}

// ── 注册 ────────────────────────────────────────────────────────

export const name = 'dsh-cow-client';
export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'layout'];
const COW_RIGHT_KIND = 'cow-status';
const COW_RIGHT_ID = 'dsh-cow/status';

function CowRightStatus() {
  return h(CowActivityPanel, null);
}

export function apply(ctx) {
  ctxLayout = ctx.layout ?? null;
  try {
    const registerTab = () => ctx.sidebarRightTabs.register({
      id: COW_RIGHT_ID,
      kind: COW_RIGHT_KIND,
      title: () => 'COW状态',
      guide: [{ order: 5, title: () => 'COW状态', description: () => '节点拓扑、连接明细与活动时间线' }],
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
    }, CowActivityPanel));
  } catch { /* 主面板插槽不可用时忽略 */ }
  try {
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'cow-node',
      order: 10,
    }, CowNodeBadge));
  } catch (error) {
    console.error('[dsh-cow] node badge slot failed', error);
  }
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
