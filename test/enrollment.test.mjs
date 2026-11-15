import assert from 'node:assert/strict';
import test from 'node:test';
import { EnrollmentError, buildEnrollmentUrl, decodeEnrollment, encodeEnrollment, parseEnrollmentUrl } from '../src/enrollment.js';

const URL_OK = 'http://mac-mini.local:3080/cow/v1';
const TOKEN = 'cods_0123456789abcdefghijklmnop';

test('登记串可以往返编解码', () => {
  const text = encodeEnrollment({ url: URL_OK, token: TOKEN, label: 'mac-mini', peerId: 'cods_abcdef0123456789' });
  assert.match(text, /^cods1\.[A-Za-z0-9_-]+$/);
  const decoded = decodeEnrollment(text);
  assert.equal(decoded.url, URL_OK);
  assert.equal(decoded.token, TOKEN);
  assert.equal(decoded.label, 'mac-mini');
  assert.equal(decoded.peerId, 'cods_abcdef0123456789');
});

test('尾斜杠被规范化，标签与实例 id 可缺省', () => {
  const text = encodeEnrollment({ url: `${URL_OK}/`, token: TOKEN });
  const decoded = decodeEnrollment(text);
  assert.equal(decoded.url, URL_OK);
  assert.equal(decoded.label, '');
  assert.equal(decoded.peerId, '');
});

test('前缀不对时给出明确错误码', () => {
  assert.throws(() => decodeEnrollment('nope.abc'), (error) => {
    assert.ok(error instanceof EnrollmentError);
    assert.equal(error.code, 'invalid_prefix');
    return true;
  });
});

test('空登记串被拒绝', () => {
  assert.throws(() => decodeEnrollment('   '), (error) => {
    assert.equal(error.code, 'empty');
    return true;
  });
});

test('URL 带用户名密码被拒绝', () => {
  assert.throws(() => encodeEnrollment({ url: 'http://user:pass@host/cow/v1', token: TOKEN }), (error) => {
    assert.equal(error.code, 'invalid_url');
    return true;
  });
});

test('非 http(s) 协议被拒绝', () => {
  assert.throws(() => encodeEnrollment({ url: 'ftp://host/x', token: TOKEN }), (error) => {
    assert.equal(error.code, 'invalid_url');
    return true;
  });
});

test('token 形态不合法被拒绝', () => {
  assert.throws(() => encodeEnrollment({ url: URL_OK, token: 'short' }), (error) => {
    assert.equal(error.code, 'invalid_token');
    return true;
  });
});

test('登记 URL 往返：带 token，缺 /cow/v1 时自动补上', () => {
  const url = buildEnrollmentUrl({ endpoint: 'http://127.0.0.1:3099', token: TOKEN, label: 'mac-mini', peerId: 'cods_x' });
  assert.match(url, /^http:\/\/127\.0\.0\.1:3099\/cow\/v1\?/);
  const parsed = parseEnrollmentUrl(url);
  assert.equal(parsed.endpoint, 'http://127.0.0.1:3099/cow/v1');
  assert.equal(parsed.token, TOKEN);
  assert.equal(parsed.label, 'mac-mini');
  assert.equal(parsed.peerId, 'cods_x');
});

test('只有 base 地址时也能解析（token 留空）', () => {
  const parsed = parseEnrollmentUrl('http://host:3080');
  assert.equal(parsed.endpoint, 'http://host:3080/cow/v1');
  assert.equal(parsed.token, '');
});

test('载荷被篡改时报错而不是静默通过', () => {
  const text = encodeEnrollment({ url: URL_OK, token: TOKEN });
  const corrupted = `${text.slice(0, -3)}!!!`;
  assert.throws(() => decodeEnrollment(corrupted), (error) => error instanceof EnrollmentError);
});
