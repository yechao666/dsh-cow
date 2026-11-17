import assert from 'node:assert/strict';
import test from 'node:test';
import { ProxyLog } from '../src/proxy-log.js';

test('代理日志只保留最近 n 条，且不记录正文', () => {
  const log = new ProxyLog(3);
  for (let index = 1; index <= 5; index += 1) {
    log.add(index % 2 ? 'info' : 'warn', 'tunnel_open', { host: `h${index}.example.com`, port: 443 });
  }
  const entries = log.list();
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map((entry) => entry.host), ['h3.example.com', 'h4.example.com', 'h5.example.com']);
  assert.equal(entries[0].event, 'tunnel_open');
  assert.equal(entries[0].level, 'info');
  assert.equal('body' in entries[0], false);
  log.setLimit(1);
  assert.equal(log.list().length, 1);
});
