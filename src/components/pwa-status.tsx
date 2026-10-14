'use client';
import { useEffect, useState } from 'react';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export async function clearPublicCache() {
  if ('caches' in window) await Promise.all((await caches.keys()).filter(key => key.startsWith('ghidai-public-')).map(key => caches.delete(key)));
  navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_PUBLIC_CACHE' });
}
export function PwaStatus() {
  const [offline, setOffline] = useState(false), [install, setInstall] = useState<InstallEvent | null>(null), [message, setMessage] = useState('');
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const offer = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const installed = () => { setInstall(null); setMessage('تم تثبيت التطبيق.'); };
    const logout = () => { void clearPublicCache().catch(() => setMessage('تعذر تنظيف الأصول العامة. أعد تحميل الصفحة.')); };
    queueMicrotask(update);
    window.addEventListener('offline', update); window.addEventListener('online', update);
    window.addEventListener('beforeinstallprompt', offer); window.addEventListener('appinstalled', installed); window.addEventListener('ghidai:logout', logout);
    if ('serviceWorker' in navigator && window.isSecureContext) void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => setMessage('التثبيت غير متاح حاليًا؛ يمكنك متابعة الاستخدام عبر المتصفح.'));
    return () => { window.removeEventListener('offline', update); window.removeEventListener('online', update); window.removeEventListener('beforeinstallprompt', offer); window.removeEventListener('appinstalled', installed); window.removeEventListener('ghidai:logout', logout); };
  }, []);
  async function installApp() { if (!install) return; try { await install.prompt(); await install.userChoice; setInstall(null); } catch { setMessage('تعذر التثبيت. أعد المحاولة من قائمة المتصفح.'); } }
  return <div className="pwa-status">{offline && <p role="alert">أنت غير متصل بالشبكة. لم يُحفظ أي تعديل؛ أعد الاتصال ثم حاول مجددًا.</p>}{install && <button className="text-link" onClick={() => void installApp()}>تثبيت التطبيق</button>}{message && <p role="status">{message}</p>}</div>;
}
