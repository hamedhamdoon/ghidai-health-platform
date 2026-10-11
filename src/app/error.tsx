'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="content-card" role="alert"><h1>تعذر عرض الصفحة</h1><p>حدث خطأ أثناء التحميل. حاول مرة أخرى.</p><button className="button" onClick={reset}>إعادة المحاولة</button></section>; }
