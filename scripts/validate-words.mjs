// 단어장 검증: node scripts/validate-words.mjs  (문제만 출력)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'words');
const DAYS = Number(process.argv[2]) || 50;
const POS = new Set(['n', 'v', 'adj', 'adv', 'phrv', 'phrase']);
const seen = new Map();
const errs = [];
let review = 0, noBlank = 0, total = 0;

for (let d = 1; d <= DAYS; d++) {
  const f = join(dir, `day-${String(d).padStart(2, '0')}.json`);
  if (!existsSync(f)) { errs.push(`day ${d}: 파일 없음`); continue; }
  let j;
  try { j = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { errs.push(`day ${d}: JSON 오류 ${e.message}`); continue; }
  if (j.day !== d) errs.push(`day ${d}: day 값 ${j.day}`);
  const w = Array.isArray(j.words) ? j.words : [];
  const c = { talk: 0, fin: 0 };
  w.forEach((x, i) => {
    total++;
    for (const k of ['word', 'pos', 'ko', 'ex', 'set']) if (!x[k] || typeof x[k] !== 'string') errs.push(`day ${d} #${i + 1}: ${k} 없음`);
    if (!POS.has(x.pos)) errs.push(`day ${d} ${x.word}: pos "${x.pos}"`);
    if (x.set in c) c[x.set]++; else errs.push(`day ${d} ${x.word}: set "${x.set}"`);
    const key = String(x.word || '').toLowerCase().trim();
    if (seen.has(key)) errs.push(`중복 "${x.word}": day ${seen.get(key)}, ${d}`); else seen.set(key, d);
    if (x.review) review++;
    if (x.ex && x.word && !x.ex.toLowerCase().includes(x.word.toLowerCase())) noBlank++;
  });
  if (c.talk !== 20 || c.fin !== 20) errs.push(`day ${d}: talk ${c.talk} / fin ${c.fin}`);
}
errs.forEach(e => console.log(e));
console.log(`단어 ${total}, 오류 ${errs.length}, review ${review}, 예문에 표제어 그대로 없음 ${noBlank}`);
process.exit(errs.length ? 1 : 0);
