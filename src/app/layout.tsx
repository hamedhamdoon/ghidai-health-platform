import type { Metadata } from 'next';
import Link from 'next/link';
import localFont from 'next/font/local';
import './globals.css';
import { Brand } from '@/components/ui';
import { Navigation } from '@/components/navigation';
import { PwaStatus } from '@/components/pwa-status';
const cairo = localFont({
  src: [
    { path: '../../node_modules/@fontsource/cairo/files/cairo-arabic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/cairo/files/cairo-arabic-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/cairo/files/cairo-arabic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
});
export const metadata: Metadata = { title: { default: 'GHIDAI | غذائي قبل دوائي', template: '%s | GHIDAI' }, description: 'الأساس المحلي لمنصة غذائي قبل دوائي' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" className={cairo.variable}><body><a className="skip-link" href="#main">انتقل إلى المحتوى</a><header className="header"><Brand/><Link className="help-link" href="/help" prefetch={false}>عن المنصة</Link></header><PwaStatus/><div className="app-shell"><Navigation/><main id="main" tabIndex={-1}>{children}</main></div><footer>GHIDAI · بيئة تطوير محلية · بيانات اصطناعية فقط</footer></body></html>;
}
