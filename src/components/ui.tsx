import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sprout, type LucideIcon } from 'lucide-react';
export function Brand() {
  return <Link className="brand" href="/" aria-label="GHIDAI — غذائي قبل دوائي"><span className="brand-icon"><Sprout aria-hidden="true" size={28}/></span><span><b dir="ltr">GHIDAI</b><small>غذائي قبل دوائي</small></span></Link>;
}
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return <section className="empty-state"><span className="empty-icon"><Icon aria-hidden="true" size={30}/></span><h2>{title}</h2><p>{children}</p><Link className="text-link" href="/help">تعرف على المرحلة الحالية</Link></section>;
}
export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <div className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{children}</p></div>;
}
