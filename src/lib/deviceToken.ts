// 本机设备 token：单会话用来区分「哪台设备占用了账号」。持久存 localStorage。2026-07-22。

const KEY = 'pm-device-token';

export function getDeviceToken(): string {
  if (typeof window === 'undefined') return '';
  let t = localStorage.getItem(KEY);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(KEY, t);
  }
  return t;
}
