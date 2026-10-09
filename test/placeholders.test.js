import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLACEHOLDER_IDS, placeholderSvg } from '../src/ui/placeholders.js';

const VIEWBOXES = {
  knight: '0 0 200 300',
  gunner: '0 0 200 300',
  spellwright: '0 0 200 300',
  titancaller: '0 0 200 300',
  droid: '0 0 200 200',
  scrap_raptor: '0 0 300 300',
  volt_jelly: '0 0 300 300',
  magnet_beetle: '0 0 300 300',
  ink_slime: '0 0 300 300',
  dominion_drone: '0 0 300 300',
  geode_titan: '0 0 400 400',
  titan_starter: '0 0 400 400',
  monkey: '0 0 120 120',
};

/** Every id="..." declared in the markup. */
const declaredIds = (svg) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
/** The ids declared inside <defs>. */
const defsIds = (svg) => {
  const defs = svg.match(/<defs>([\s\S]*?)<\/defs>/);
  assert.ok(defs, 'svg has a <defs> block');
  return declaredIds(defs[1]);
};

test('PLACEHOLDER_IDS lists every sprite exactly once', () => {
  assert.deepEqual([...PLACEHOLDER_IDS].sort(), Object.keys(VIEWBOXES).sort());
  assert.equal(new Set(PLACEHOLDER_IDS).size, PLACEHOLDER_IDS.length);
});

for (const id of PLACEHOLDER_IDS) {
  test(`${id}: returns sized <svg> markup with the right viewBox`, () => {
    const svg = placeholderSvg(id, 'u1');
    assert.equal(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'), 'starts with <svg (no XML prolog)');
    assert.ok(svg.trimEnd().endsWith('</svg>'));
    assert.match(svg, /viewBox="[^"]+"/);
    assert.ok(svg.includes(`viewBox="${VIEWBOXES[id]}"`), `viewBox is ${VIEWBOXES[id]}`);
    assert.ok(svg.includes('width="100%"') && svg.includes('height="100%"'));
    assert.ok(svg.includes('preserveAspectRatio="xMidYMax meet"'));
  });

  test(`${id}: namespaces every defs id with the uid`, () => {
    const uid = 'holoTest42';
    const svg = placeholderSvg(id, uid);
    const ids = defsIds(svg);
    assert.ok(ids.length > 0, 'defs declare ids');
    for (const x of declaredIds(svg)) assert.ok(x.includes(uid), `id "${x}" contains the uid`);
    // Every url(#...) reference points at one of this SVG's own ids.
    const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, 'uses its gradients and filters');
    for (const r of refs) assert.ok(ids.includes(r), `url(#${r}) is defined in defs`);
  });

  test(`${id}: different uids produce different id namespaces`, () => {
    const a = new Set(defsIds(placeholderSvg(id, 'alpha')));
    const b = defsIds(placeholderSvg(id, 'beta'));
    assert.ok(b.length > 0);
    for (const x of b) assert.ok(!a.has(x), `id "${x}" is not shared`);
  });

  test(`${id}: is self-contained, well-formed markup`, () => {
    const svg = placeholderSvg(id, 'wf');
    assert.ok(!/<script|<image|<foreignObject|\bclass=|href="(?!#)/i.test(svg), 'no scripts, images, classes or external links');
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), 'no broken numbers');
    // Tags balance (a light check that the string will parse as SVG).
    const stack = [];
    for (const [, close, name, selfClose] of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
      if (selfClose) continue;
      if (close) assert.equal(stack.pop(), name, `</${name}> closes the open tag`);
      else stack.push(name);
    }
    assert.deepEqual(stack, [], 'every tag is closed');
  });
}

test('unknown ids fall back to a glowing diamond', () => {
  const svg = placeholderSvg('no_such_sprite', 'fallback1');
  assert.ok(svg.startsWith('<svg'));
  assert.match(svg, /viewBox="0 0 200 200"/);
  for (const x of defsIds(svg)) assert.ok(x.includes('fallback1'));
});

test('uids with unsafe characters still produce valid ids', () => {
  const svg = placeholderSvg('knight', 'a b"c#1');
  for (const x of declaredIds(svg)) assert.match(x, /^[A-Za-z0-9_-]+$/);
});

test('calls without a uid still get unique namespaces', () => {
  const a = new Set(defsIds(placeholderSvg('droid')));
  for (const x of defsIds(placeholderSvg('droid'))) assert.ok(!a.has(x));
});
