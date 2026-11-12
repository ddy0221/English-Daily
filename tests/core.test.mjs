import test from 'node:test';
import assert from 'node:assert/strict';
import { seoulDate, diffDays, addDays, dayNumber, startForDay, isReviewOnly, schedule, dueItems, streak, weekDates } from '../assets/js/core.js';

test('seoulDate는 서울 기준 날짜', () => {
  assert.equal(seoulDate(new Date('2026-11-12T15:30:00Z')), '2026-11-13'); // KST 00:30
  assert.equal(seoulDate(new Date('2026-11-12T14:59:00Z')), '2026-11-12');
});
test('날짜 계산', () => {
  assert.equal(diffDays('2026-02-27', '2026-03-01'), 2);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
test('일차 계산과 수동 변경', () => {
  assert.equal(dayNumber('2026-11-12', '2026-11-12'), 1);
  assert.equal(dayNumber('2026-11-12', '2026-11-21'), 10);
  assert.equal(dayNumber('2026-11-20', '2026-11-12'), 1);
  assert.equal(dayNumber(startForDay(17, '2026-11-12'), '2026-11-12'), 17);
  assert.equal(isReviewOnly(50), false);
  assert.equal(isReviewOnly(51), true);
});
test('Leitner 스케줄 1/2/4/7', () => {
  const t = '2026-11-12';
  assert.deepEqual(schedule(undefined, 'know', t), null);
  let e = schedule(undefined, 'unknown', t);
  assert.deepEqual(e, { box: 1, due: '2026-11-13' });
  e = schedule(e, 'know', '2026-11-13'); assert.deepEqual(e, { box: 2, due: '2026-11-15' });
  e = schedule(e, 'know', '2026-11-15'); assert.deepEqual(e, { box: 3, due: '2026-11-19' });
  e = schedule(e, 'know', '2026-11-19'); assert.deepEqual(e, { box: 4, due: '2026-11-26' });
  assert.equal(schedule(e, 'know', '2026-11-26'), null);
  assert.deepEqual(schedule({ box: 3, due: t }, 'unsure', t), { box: 1, due: '2026-11-13' });
});
test('복습 큐 추출', () => {
  const q = { a: { box: 1, due: '2026-11-10' }, b: { box: 2, due: '2026-11-13' }, c: { box: 1, due: '2026-11-12' } };
  assert.deepEqual(dueItems(q, '2026-11-12').map(x => x.key), ['a', 'c']);
  assert.equal(dueItems(q, '2026-11-20', 2).length, 2);
});
test('연속 일수와 주간', () => {
  assert.equal(streak(['2026-11-10', '2026-11-11', '2026-11-12'], '2026-11-12'), 3);
  assert.equal(streak(['2026-11-10', '2026-11-11'], '2026-11-12'), 2);
  assert.equal(streak(['2026-11-09'], '2026-11-12'), 0);
  const w = weekDates('2026-11-12'); // 목요일
  assert.equal(w[0], '2026-11-09'); assert.equal(w[6], '2026-11-15');
});
