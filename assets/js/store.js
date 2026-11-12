// localStorage 상태. 모든 읽기/쓰기는 실패해도 앱이 돌아가게 감싼다.
import { seoulDate, dayNumber } from './core.js';

const KEY = 'englishDaily.v1';
const blank = () => ({ start: null, queue: {}, words: {}, history: {}, rate: 1 });

export function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s && typeof s === 'object' ? { ...blank(), ...s } : blank(); }
  catch { return blank(); }
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }

export function today() { return seoulDate(); }
export function currentDay(s) { return s.start ? dayNumber(s.start, today()) : 1; }

/** 오늘 기록 갱신 */
export function logToday(s, patch) {
  const t = today();
  s.history[t] = { ...(s.history[t] || {}), ...patch };
}

export function exportJSON(s) { return JSON.stringify({ app: 'english-daily', v: 1, exported: new Date().toISOString(), state: s }, null, 1); }
export function importJSON(text) {
  const j = JSON.parse(text);
  const st = j && j.state;
  if (!st || typeof st !== 'object' || typeof st.queue !== 'object') throw new Error('형식이 맞지 않아요');
  return { ...blank(), ...st };
}
