import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

test('index 接线：只注册消息与文件工具，系统提示说明消息机制', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-index-'));
  const previousHome = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  const { apply } = await import('../src/index.js');

  const tools = [];
  const promptSections = [];
  const disposers = [];
  const services = {
    tools: { register: (definition) => tools.push(definition) },
    systemPrompt: { section: (section) => { promptSections.push(section); return () => {}; } },
    agents: { get: () => null, create: async () => ({ agent: null }) },
    sessions: { flush: async () => {} },
    agentDefaultModel: { currentSelection: () => ({ provider: 'deepseek', model: 'deepseek-chat' }) },
  };
  const ctx = {
    get: (name) => services[name],
    inject: (names, callback) => {
      const sctx = {
        get: (name) => services[name],
        effect: (fn) => { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return dispose; },
        on: () => () => {},
      };
      callback(sctx);
    },
    effect: (fn) => {
      const dispose = fn();
      if (typeof dispose === 'function') disposers.push(dispose);
      return dispose;
    },
    on: () => () => {},
  };

  try {
    apply(ctx, { displayName: '测试节点', listenPort: 0 });
    await tick();
    const names = tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [
      'cow_cancel_file',
      'cow_doctor',
      'cow_peers',
      'cow_pull_dir',
      'cow_receive_file',
      'cow_send',
      'cow_send_file',
      'cow_set_file_policy',
      'cow_status',
      'cow_upgrade',
    ]);
    assert.ok(!names.includes('cow_task'));
    assert.ok(!names.includes('cow_delegate'));
    const section = promptSections.find((item) => item.name === 'plugin:dsh-cow');
    assert.ok(section, '应注册系统提示段');
    assert.match(String(section.text()), /cow_send/);
    assert.match(String(section.text()), /cow_upgrade/);
    assert.match(String(section.text()), /msg\.upgrade/);
    assert.doesNotMatch(String(section.text()), /cow_task/);
  } finally {
    for (const dispose of disposers.reverse()) {
      try { dispose(); } catch { /* 忽略 */ }
    }
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
  }
});
