// 퀴즈 자동 생성: 뜻 고르기(4지선다), 예문 빈칸 채우기.
export function shuffle(a, rnd = Math.random) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** 오답 보기 후보: 같은 set·같은 품사 우선, 모자라면 같은 set, 그래도 모자라면 전체 */
export function distractors(target, pool, n = 3, rnd = Math.random) {
  const others = pool.filter(w => w.word !== target.word && w.ko !== target.ko);
  const tiers = [
    others.filter(w => w.set === target.set && w.pos === target.pos),
    others.filter(w => w.set === target.set && w.pos !== target.pos),
    others.filter(w => w.set !== target.set),
  ];
  const out = [];
  for (const t of tiers) for (const w of shuffle(t, rnd)) { if (out.length >= n) break; if (!out.some(o => o.word === w.word)) out.push(w); }
  return out;
}

/** 예문에서 표제어 위치 찾기(대소문자 무시). 없으면 null */
export function blankOut(word) {
  const i = word.ex.toLowerCase().indexOf(word.word.toLowerCase());
  if (i < 0) return null;
  return word.ex.slice(0, i) + '_____' + word.ex.slice(i + word.word.length);
}

/** 문제 목록 생성. 빈칸이 가능한 단어는 번갈아 빈칸 문제로 낸다. */
export function buildQuiz(targets, pool, rnd = Math.random) {
  return shuffle(targets, rnd).map((w, i) => {
    const opts = distractors(w, pool, 3, rnd);
    const blank = i % 2 === 1 ? blankOut(w) : null;
    if (blank) return { type: 'blank', word: w, prompt: blank, choices: shuffle([w, ...opts], rnd).map(x => x.word), answer: w.word };
    return { type: 'meaning', word: w, prompt: w.word, choices: shuffle([w, ...opts], rnd).map(x => x.ko), answer: w.ko };
  });
}
