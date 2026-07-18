import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

describe('jeju/webapp.html — _govRelayCompletion() 폴백 수정 확인', () => {
  let dom, requests;

  function setup(primaryFails) {
    requests = [];
    dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: 'outside-only', url: 'https://jeju.hondi.net/webapp.html' });
    dom.window.fetch = async (url, opts) => {
      const u = String(url);
      requests.push({ url: u, body: opts?.body ? JSON.parse(opts.body) : null });
      if (u.includes('/gov/relay')) {
        if (primaryFails) return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, json: async () => ({ choices: [{ message: { content: '정상 안내' } }] }) };
      }
      if (u.includes('/chat/completions')) {
        return { ok: true, json: async () => ({ choices: [{ message: { content: '폴백 안내' } }] }) };
      }
      throw new Error('예상치 못한 fetch: ' + u);
    };
    dom.window._getUserGuid = () => 'test-guid';

    const html = fs.readFileSync(new URL('../../webapp.html', import.meta.url), 'utf-8');
    const lines = html.split('\n');
    const proxyLine = lines.findIndex(l => l.startsWith('const PROXY '));
    const start = lines.findIndex(l => l.startsWith('async function _govRelayCompletion'));
    const end   = lines.findIndex((l, i) => i > start && l.trim() === '}' && lines[i+1]?.trim() === '');
    if (proxyLine < 0 || start < 0 || end < 0) throw new Error('webapp.html 구조가 바뀌어 대상 코드를 못 찾음');
    dom.window.eval([lines[proxyLine], ...lines.slice(start, end + 1)].join('\n'));
  }

  after(() => { dom?.window.close(); });

  test('취약점 수정 확인: api.anthropic.com을 실제로 호출하는 코드가 없다', () => {
    const html = fs.readFileSync(new URL('../../webapp.html', import.meta.url), 'utf-8');
    assert.equal(/fetch\(\s*['"]https:\/\/api\.anthropic\.com/.test(html), false);
  });

  test('gov/relay 정상이면 폴백은 호출되지 않는다', async () => {
    setup(false);
    const result = await dom.window._govRelayCompletion('시스템 프롬프트', [{ role: 'user', content: '질문' }], 'jeju_do');
    assert.equal(result, '정상 안내');
    assert.equal(requests.length, 1);
  });

  test('gov/relay 실패 시 폴백(/chat/completions)이 실제로 응답을 반환한다(이전엔 폴백도 항상 실패)', async () => {
    setup(true);
    const result = await dom.window._govRelayCompletion('시스템 프롬프트', [{ role: 'user', content: '질문' }], 'jeju_do');
    assert.equal(result, '폴백 안내');
    const fallbackReq = requests.find(r => r.url.includes('/chat/completions'));
    assert.ok(fallbackReq);
  });
});
