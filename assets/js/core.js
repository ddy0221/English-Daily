// 순수 함수: 날짜(Asia/Seoul), 일차 계산, Leitner 복습 스케줄. DOM·저장소에 의존하지 않는다.
export const TOTAL_DAYS = 50;
export const INTERVALS = [1, 2, 4, 7]; // box 1..4

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Date → 'YYYY-MM-DD' (서울 기준) */
export function seoulDate(now = new Date()) { return fmt.format(now); }

function toUTC(ymd) { const [y, m, d] = ymd.split('-').map(Number); return Date.UTC(y, m - 1, d); }

/** 두 날짜 문자열의 일수 차이 (b - a) */
export function diffDays(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }

/** 날짜 문자열에 n일 더하기 */
export function addDays(ymd, n) { return new Date(toUTC(ymd) + n * 86400000).toISOString().slice(0, 10); }

/** 시작일과 오늘로 일차 계산. 시작일 전이면 1, 50 초과면 그대로 반환(복습 모드 판단은 호출 측). */
export function dayNumber(start, today) { return Math.max(1, diffDays(start, today) + 1); }

/** n일차가 오늘이 되도록 하는 시작일 */
export function startForDay(n, today) { return addDays(today, -(Math.max(1, n) - 1)); }

export function isReviewOnly(day) { return day > TOTAL_DAYS; }

/**
 * Leitner 갱신. grade: 'know' | 'unsure' | 'unknown'
 * entry: { box, due } 또는 undefined(큐에 없음). 반환: 새 entry 또는 null(큐에서 제거/추가 안 함)
 */
export function schedule(entry, grade, today) {
  if (grade === 'unknown' || grade === 'unsure') return { box: 1, due: addDays(today, INTERVALS[0]) };
  if (!entry) return null;
  const box = entry.box + 1;
  if (box > INTERVALS.length) return null; // 졸업
  return { box, due: addDays(today, INTERVALS[box - 1]) };
}

/** 오늘 복습할 항목: due <= today, 오래된 순, 최대 limit */
export function dueItems(queue, today, limit = 10) {
  return Object.entries(queue)
    .filter(([, e]) => e && e.due <= today)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : a[1].box - b[1].box))
    .slice(0, limit)
    .map(([k, e]) => ({ key: k, ...e }));
}

/** 연속 학습 일수: 오늘(또는 어제)부터 거꾸로 이어진 날 수 */
export function streak(doneDates, today) {
  const set = new Set(doneDates);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** 이번 주(월요일 시작) 날짜 7개 */
export function weekDates(today) {
  const dow = (new Date(toUTC(today)).getUTCDay() + 6) % 7; // 월=0
  const mon = addDays(today, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
