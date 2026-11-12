import { TOTAL_DAYS, schedule, dueItems, startForDay, isReviewOnly } from './core.js';
import { load, save, today, currentDay, logToday, exportJSON, importJSON } from './store.js';
import { buildQuiz, shuffle } from './quiz.js';
import * as tts from './tts.js';

const $ = id => document.getElementById(id);
const VIEWS = ['setup', 'today', 'card', 'quiz', 'done', 'listen', 'settings'];
let S = load();
let items = [];       // 오늘 세트(단어 객체)
let topics = {};
let quiz = null, listen = null, wakeLock = null;
const keyOf = w => w.word.toLowerCase().trim();

function show(v) { VIEWS.forEach(n => { $('v-' + n).hidden = n !== v; }); window.scrollTo(0, 0); }
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 2600); }
function persist() { if (!save(S)) toast('저장하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
const pad = n => String(n).padStart(2, '0');

async function loadDay(d) {
  const r = await fetch(`../data/words/day-${pad(d)}.json`);
  if (!r.ok) throw new Error('단어를 불러오지 못했어요');
  return (await r.json()).words;
}
async function loadTopics() {
  try {
    const t = await (await fetch('../data/curriculum.md')).text();
    for (const m of t.matchAll(/^(\d+)\.\s+(.+)$/gm)) topics[+m[1]] = m[2];
  } catch {}
}

/* ---------- 오늘 세트 ---------- */
function freshSession(day, redo) {
  const t = today();
  const studyDay = redo || (isReviewOnly(day) ? 0 : day);
  const due = dueItems(S.queue, t, studyDay ? 10 : 40).map(e => e.w).filter(Boolean);
  return { date: t, day, studyDay, idx: 0, grades: {}, orig: {}, extra: due };
}
async function prepare(redo) {
  const day = currentDay(S);
  if (redo || !S.sess || S.sess.date !== today() || S.sess.day !== day) { S.sess = freshSession(day, redo); persist(); }
  const base = S.sess.studyDay ? await loadDay(S.sess.studyDay) : [];
  const baseKeys = new Set(base.map(keyOf));
  items = [...S.sess.extra.filter(w => !baseKeys.has(keyOf(w))).map(w => ({ ...w, _review: true })), ...base];
}

function renderToday() {
  const day = currentDay(S), ro = isReviewOnly(day), sess = S.sess;
  const graded = Object.keys(sess.grades).length;
  $('hdr').textContent = today();
  $('t-eyebrow').textContent = ro ? `${day}일째 · 복습 전용` : `${TOTAL_DAYS}일 과정`;
  $('t-title').textContent = sess.studyDay ? `${sess.studyDay}일차${ro ? ' 다시 보기' : ''}` : '오늘의 복습';
  $('t-topic').textContent = sess.studyDay ? (topics[sess.studyDay] || '') : '';
  const rev = items.filter(w => w._review).length;
  $('t-status').textContent = items.length
    ? `새 단어 ${items.length - rev} · 복습 ${rev} · 평가 ${graded}/${items.length}`
    : '오늘 복습할 단어가 없어요. 아래에서 다시 볼 일차를 골라 보세요.';
  $('t-bar').style.width = items.length ? (graded / items.length * 100) + '%' : '0';
  $('go-cards-label').textContent = graded === 0 ? '카드 학습 시작' : graded < items.length ? '카드 이어서 보기' : '카드 다시 보기';
  $('go-cards-sub').textContent = `${items.length}장`;
  $('go-cards').disabled = !items.length;
  $('go-quiz').disabled = items.length < 4;
  $('go-listen').disabled = !items.length || !tts.supported;
  $('go-listen').hidden = !tts.supported;
  const h = S.history[today()];
  $('go-quiz-sub').textContent = h && h.quiz ? `${h.quiz.right}/${h.quiz.total} 맞힘` : '뜻·빈칸';
  $('review-only').hidden = !ro;
  if (ro && !$('redo-day').options.length) {
    for (let d = 1; d <= TOTAL_DAYS; d++) $('redo-day').add(new Option(`${d}일차 ${topics[d] ? '· ' + topics[d].slice(0, 24) : ''}`, d));
  }
  show('today');
}

/* ---------- 카드 ---------- */
let flipped = false;
function renderCard() {
  const sess = S.sess;
  if (sess.idx >= items.length) return finishCards();
  const w = items[sess.idx];
  flipped = false;
  $('c-count').textContent = `${sess.idx + 1} / ${items.length}`;
  $('c-bar').style.width = (sess.idx / items.length * 100) + '%';
  $('c-tag').innerHTML = '';
  const tag = document.createElement('span');
  tag.className = 'tag' + (w._review ? ' review' : '');
  tag.textContent = w._review ? '복습' : (w.set === 'fin' ? '금융' : '회화');
  $('c-tag').append(tag);
  $('c-pos').textContent = { n: '명사', v: '동사', adj: '형용사', adv: '부사', phrv: '구동사', phrase: '표현' }[w.pos] || w.pos;
  $('c-word').textContent = w.word;
  $('c-ko').textContent = w.ko;
  $('c-ex').textContent = w.ex;
  $('c-note').textContent = w.note || '';
  $('c-note').hidden = !w.note;
  $('c-back').hidden = true;
  $('c-hint').hidden = false;
  $('c-prev').disabled = sess.idx === 0;
  $('c-say').hidden = !tts.supported;
  $('c-say-ex').hidden = true;
  const g = sess.grades[keyOf(w)];
  document.querySelectorAll('.grade').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === g)));
  show('card');
  $('c-card').focus({ preventScroll: true });
}
function flip() {
  flipped = !flipped;
  $('c-back').hidden = !flipped;
  $('c-hint').hidden = flipped;
  $('c-say-ex').hidden = !flipped || !tts.supported;
}
function grade(g) {
  const sess = S.sess, w = items[sess.idx], k = keyOf(w), t = today();
  if (!(k in sess.orig)) sess.orig[k] = S.queue[k] ? { box: S.queue[k].box, due: S.queue[k].due } : null;
  const next = schedule(sess.orig[k] || undefined, g, t);
  if (next) S.queue[k] = { ...next, w: stripMeta(w) }; else delete S.queue[k];
  sess.grades[k] = g;
  sess.idx++;
  logToday(S, { day: sess.studyDay || sess.day, cards: Object.keys(sess.grades).length, total: items.length });
  persist();
  tts.stop();
  renderCard();
}
function stripMeta(w) { const { _review, ...rest } = w; return rest; }
function finishCards() {
  logToday(S, { done: true });
  persist();
  const g = Object.values(S.sess.grades);
  const c = x => g.filter(v => v === x).length;
  $('d-title').textContent = '카드 학습 끝!';
  $('d-text').textContent = `알아요 ${c('know')} · 헷갈려요 ${c('unsure')} · 몰라요 ${c('unknown')}. 헷갈리거나 모른 단어는 내일부터 1·2·4·7일 간격으로 다시 나와요.`;
  $('d-quiz').hidden = items.length < 4;
  show('done');
}

/* ---------- 퀴즈 ---------- */
function startQuiz() {
  const g = S.sess.grades;
  const weak = items.filter(w => g[keyOf(w)] === 'unsure' || g[keyOf(w)] === 'unknown');
  const rest = shuffle(items.filter(w => !weak.includes(w)));
  const targets = [...weak, ...rest].slice(0, Math.max(10, Math.min(15, weak.length)));
  quiz = { qs: buildQuiz(targets, items), i: 0, right: 0, answered: false };
  renderQuiz();
}
function renderQuiz() {
  if (quiz.i >= quiz.qs.length) return finishQuiz();
  const q = quiz.qs[quiz.i];
  quiz.answered = false;
  $('q-count').textContent = `퀴즈 ${quiz.i + 1} / ${quiz.qs.length}`;
  $('q-score').textContent = `맞힘 ${quiz.right}`;
  $('q-bar').style.width = (quiz.i / quiz.qs.length * 100) + '%';
  $('q-kind').textContent = q.type === 'blank' ? '빈칸에 들어갈 말은?' : '뜻을 고르세요';
  $('q-prompt').textContent = q.prompt;
  $('q-prompt').className = 'prompt' + (q.type === 'blank' ? ' sentence' : '');
  $('q-feedback').textContent = '';
  $('q-next').hidden = true;
  const box = $('q-choices');
  box.textContent = '';
  q.choices.forEach((c, n) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn choice';
    b.textContent = `${n + 1}. ${c}`;
    if (q.type === 'blank') b.lang = 'en';
    b.addEventListener('click', () => answer(c, b));
    box.append(b);
  });
  show('quiz');
  box.firstChild && box.firstChild.focus({ preventScroll: true });
}
function answer(c, btn) {
  if (quiz.answered) return;
  quiz.answered = true;
  const q = quiz.qs[quiz.i], ok = c === q.answer;
  [...$('q-choices').children].forEach(b => { b.disabled = true; if (b.textContent.slice(3) === q.answer) b.classList.add('right'); });
  if (ok) { quiz.right++; $('q-feedback').textContent = '정답!'; }
  else {
    btn.classList.add('wrong');
    $('q-feedback').textContent = `정답: ${q.answer} — ${q.word.word}: ${q.word.ko}`;
    const k = keyOf(q.word);
    S.queue[k] = { ...schedule(undefined, 'unknown', today()), w: stripMeta(q.word) };
  }
  if (q.type === 'blank' && tts.supported) tts.say(q.word.ex, { rate: S.rate });
  $('q-next').hidden = false;
  $('q-next').focus({ preventScroll: true });
}
function finishQuiz() {
  logToday(S, { quiz: { right: quiz.right, total: quiz.qs.length } });
  persist();
  $('d-title').textContent = '퀴즈 끝!';
  $('d-text').textContent = `${quiz.qs.length}문제 중 ${quiz.right}개 맞혔어요. 틀린 단어는 복습 큐에 넣었어요.`;
  $('d-quiz').hidden = false;
  $('d-quiz').textContent = '퀴즈 다시 풀기';
  show('done');
}

/* ---------- 듣기 ---------- */
async function lockScreen() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch {}
}
function unlockScreen() { try { wakeLock && wakeLock.release(); } catch {} wakeLock = null; }
function renderListen() {
  const w = items[listen.i];
  $('l-count').textContent = `듣기 ${listen.i + 1} / ${items.length}`;
  $('l-word').textContent = w.word; $('l-ko').textContent = w.ko; $('l-ex').textContent = w.ex;
  $('l-play').textContent = listen.playing ? '일시정지' : '재생';
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function playLoop() {
  const run = ++listen.run;
  while (listen.playing && run === listen.run && listen.i < items.length) {
    const w = items[listen.i], rate = S.rate;
    renderListen();
    await tts.say(w.word, { lang: 'en-US', rate }); if (run !== listen.run) return;
    await wait(500);
    if ($('l-ko-on').checked) { await tts.say(w.ko, { lang: 'ko-KR', rate }); if (run !== listen.run) return; await wait(400); }
    await tts.say(w.ex, { lang: 'en-US', rate }); if (run !== listen.run) return;
    await wait(1200);
    if (run !== listen.run) return;
    listen.i++;
  }
  if (listen.i >= items.length) { listen.i = items.length - 1; listen.playing = false; unlockScreen(); renderListen(); toast('끝까지 들었어요.'); }
}
function togglePlay() {
  listen.playing = !listen.playing;
  if (listen.playing) { lockScreen(); playLoop(); } else { listen.run++; tts.stop(); unlockScreen(); }
  renderListen();
}
function jump(d) {
  listen.i = Math.min(items.length - 1, Math.max(0, listen.i + d));
  listen.run++; tts.stop();
  renderListen();
  if (listen.playing) playLoop();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && listen && listen.playing) lockScreen(); });

/* ---------- 설정 ---------- */
function openSettings() {
  $('s-day').value = currentDay(S);
  $('s-start').value = S.start || today();
  const n = Object.keys(S.queue).length, days = Object.values(S.history).filter(h => h.done).length;
  $('s-stats').textContent = `복습 큐 ${n}개 · 학습 완료한 날 ${days}일`;
  show('settings');
}
async function applySettings() {
  const d = parseInt($('s-day').value, 10);
  const start = $('s-start').value;
  if (d && d !== currentDay(S)) S.start = startForDay(d, today());
  else if (start) S.start = start;
  S.sess = null; persist();
  await prepare(); renderToday(); toast(`${currentDay(S)}일차로 맞췄어요.`);
}
function doExport() {
  const blob = new Blob([exportJSON(S)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `english-daily-${today()}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function doImport(file) {
  try {
    S = importJSON(await file.text()); persist();
    await prepare(); renderToday(); toast('진도를 가져왔어요.');
  } catch (e) { toast('가져오지 못했어요: ' + e.message); }
}

/* ---------- 연결 ---------- */
function bind() {
  $('setup-date').value = today();
  $('setup-go').onclick = async () => { S.start = $('setup-date').value || today(); persist(); await prepare(); renderToday(); };
  $('go-cards').onclick = () => { if (S.sess.idx >= items.length) S.sess.idx = 0; renderCard(); };
  $('go-quiz').onclick = startQuiz;
  $('go-listen').onclick = () => { listen = { i: Math.min(S.sess.idx, items.length - 1), playing: false, run: 0 }; $('l-rate').value = String(S.rate); renderListen(); show('listen'); };
  $('go-settings').onclick = openSettings;
  $('c-card').onclick = flip;
  $('c-card').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  $('c-say').onclick = () => tts.say(items[S.sess.idx].word, { rate: S.rate });
  $('c-say-ex').onclick = () => tts.say(items[S.sess.idx].ex, { rate: S.rate });
  $('c-prev').onclick = () => { if (S.sess.idx > 0) { S.sess.idx--; persist(); renderCard(); } };
  document.querySelectorAll('.grade').forEach(b => { b.onclick = () => grade(b.dataset.g); });
  document.addEventListener('keydown', e => {
    if ($('v-card').hidden || e.target.tagName === 'INPUT') return;
    const m = { 1: 'know', 2: 'unsure', 3: 'unknown' }[e.key];
    if (m) grade(m);
  });
  $('q-next').onclick = () => { quiz.i++; renderQuiz(); };
  $('d-quiz').onclick = startQuiz;
  $('d-home').onclick = renderToday;
  $('l-play').onclick = togglePlay;
  $('l-prev').onclick = () => jump(-1);
  $('l-next').onclick = () => jump(1);
  $('l-rate').onchange = () => { S.rate = Number($('l-rate').value) || 1; persist(); };
  $('l-exit').onclick = () => { listen.playing = false; listen.run++; tts.stop(); unlockScreen(); renderToday(); };
  $('s-apply').onclick = applySettings;
  $('s-export').onclick = doExport;
  $('s-import').onclick = () => $('s-file').click();
  $('s-file').onchange = e => { const f = e.target.files[0]; if (f) doImport(f); e.target.value = ''; };
  $('s-close').onclick = renderToday;
  $('redo-go').onclick = async () => { await prepare(parseInt($('redo-day').value, 10)); renderToday(); };
}

async function init() {
  bind();
  await loadTopics();
  $('hdr').textContent = today();
  if (!S.start) { show('setup'); return; }
  try { await prepare(); renderToday(); }
  catch (e) { toast(e.message); }
}
init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {});
