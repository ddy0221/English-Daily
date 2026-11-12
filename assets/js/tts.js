// 브라우저 speechSynthesis 래퍼. 지원하지 않으면 supported=false.
export const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let voices = [];
function refresh() { try { voices = speechSynthesis.getVoices() || []; } catch { voices = []; } }
if (supported) { refresh(); try { speechSynthesis.addEventListener('voiceschanged', refresh); } catch {} }

function pick(lang) {
  const l = lang.toLowerCase();
  return voices.find(v => v.lang && v.lang.toLowerCase() === l) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(l.slice(0, 2)));
}
export function hasVoice(lang) { refresh(); return !!pick(lang); }

/** 문장 하나 읽기. 끝나면 resolve (취소·오류도 resolve) */
export function say(text, { lang = 'en-US', rate = 1 } = {}) {
  if (!supported || !text) return Promise.resolve();
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    const v = pick(lang); if (v) u.voice = v;
    let done = false; const fin = () => { if (!done) { done = true; clearTimeout(t); res(); } };
    u.onend = fin; u.onerror = fin;
    const t = setTimeout(fin, 4000 + text.length * 180 / rate); // onend가 안 오는 브라우저 대비
    speechSynthesis.speak(u);
  });
}
export function stop() { if (supported) try { speechSynthesis.cancel(); } catch {} }
