import Link from 'next/link';
export default function NotFound() { return <section className="content-card"><h1>الصفحة غير موجودة</h1><p>تحقق من الرابط أو عد إلى الصفحة الترحيبية.</p><Link className="button" href="/">العودة إلى البداية</Link></section>; }
