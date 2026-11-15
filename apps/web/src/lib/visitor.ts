/**
 * An id for this browser tab, sent to the API as `?sid=` so every visitor has their own simulation (their own events,
 * mission clock and alerts). It lives in sessionStorage: a reload keeps the scenario, a new tab starts a new one.
 * Not an identity: it is random and carries nothing about the person.
 */
const KEY = 'ahm.sid';
let memory: string | undefined;

function create(): string {
  const bytes = new Uint8Array(12);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256); // not the engine: no determinism needed
  }
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}

export function visitorId(): string {
  if (memory) return memory;
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved && /^[A-Za-z0-9_-]{8,40}$/.test(saved)) return (memory = saved);
  } catch { /* storage blocked: the id lasts until the page is closed */ }
  memory = create();
  try { sessionStorage.setItem(KEY, memory); } catch { /* same */ }
  return memory;
}
