export const DEMO_SESSION_EXPIRED = "resolve-signal:session-expired";
export function notifySessionExpired() { window.dispatchEvent(new Event(DEMO_SESSION_EXPIRED)); }
