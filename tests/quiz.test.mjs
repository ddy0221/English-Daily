import test from 'node:test';
import assert from 'node:assert/strict';
import { distractors, blankOut, buildQuiz } from '../assets/js/quiz.js';
const W = (word, pos, set, ko, ex = `I like ${word}.`) => ({ word, pos, set, ko, ex });
const pool = [W('a', 'n', 'fin', '가'), W('b', 'n', 'fin', '나'), W('c', 'n', 'fin', '다'), W('d', 'v', 'fin', '라'), W('e', 'n', 'talk', '마')];
test('오답은 같은 품사·set 우선', () => {
  const d = distractors(pool[0], pool, 3);
  assert.equal(d.length, 3);
  assert.ok(d.slice(0, 2).every(w => w.pos === 'n' && w.set === 'fin'));
  assert.ok(!d.some(w => w.word === 'a'));
});
test('빈칸 만들기', () => {
  assert.equal(blankOut(W('Top line', 'n', 'fin', '', 'The top line grew.')), 'The _____ grew.');
  assert.equal(blankOut(W('grow up', 'phrv', 'talk', '', 'I grew up here.')), null);
});
test('퀴즈 생성: 정답이 보기에 있다', () => {
  const q = buildQuiz(pool.slice(0, 4), pool);
  assert.equal(q.length, 4);
  q.forEach(x => { assert.ok(x.choices.includes(x.answer)); assert.equal(new Set(x.choices).size, x.choices.length); });
});
