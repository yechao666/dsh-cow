import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('任务层文件已删除', () => {
  for (const name of ['tasks.js', 'cow-tasks.js', 'remote-tasks.js', 'notify.js', 'inbox.js', 'prompt.js', 'upgrade.js', 'haos-transport.js', 'client.js']) {
    assert.equal(existsSync(join(root, 'src', name)), false, `src/${name} 应已删除`);
  }
});

test('源码中不存在 CowTasks/TaskManager/taskId 任务链', () => {
  const offenders = [];
  for (const dir of ['src', 'client-src']) {
    for (const name of readdirSync(join(root, dir))) {
      if (!name.endsWith('.js')) continue;
      const text = readFileSync(join(root, dir, name), 'utf8');
      for (const pattern of [/CowTasks/, /TaskManager/, /taskId/, /cow_task\b/, /cow_delegate/, /cow_claim/, /remote-tasks/, /cow-tasks/]) {
        if (pattern.test(text)) offenders.push(`${dir}/${name}: ${pattern}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('工具定义里不再出现任务工具', () => {
  const text = readFileSync(join(root, 'src', 'tools.js'), 'utf8');
  for (const name of ['cow_delegate', 'cow_task', 'cow_claim', 'cow_retry', 'cow_answer', 'cow_notify']) {
    assert.equal(text.includes(name), false, `${name} 应已移除`);
  }
});
