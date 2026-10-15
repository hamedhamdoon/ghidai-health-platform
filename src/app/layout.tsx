import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import './globals.css';
import { Brand } from '@/components/ui';
import { Navigation } from '@/components/navigation';
import { PwaStatus } from '@/components/pwa-status';
export const metadata: Metadata = { title: { default: 'GHIDAI | غذائي قبل دوائي', template: '%s | GHIDAI' }, description: 'الأساس المحلي لمنصة غذائي قبل دوائي' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><a className="skip-link" href="#main">انتقل إلى المحتوى</a><header className="header"><Brand/><Link className="help-link" href="/help">عن المنصة</Link></header><PwaStatus/><div className="app-shell"><Navigation/><main id="main" tabIndex={-1}>{children}</main></div><footer>GHIDAI · بيئة تطوير محلية · بيانات اصطناعية فقط</footer></body></html>;
}
