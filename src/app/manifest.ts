import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { id: '/', name: 'GHIDAI | غذائي قبل دوائي', short_name: 'غذائي', description: 'متابعة برنامجك ونشاطك اليومي', start_url: '/today', scope: '/', display: 'standalone', background_color: '#faf7f0', theme_color: '#16432e', lang: 'ar', dir: 'rtl', icons: [{ src: '/icons/ghidai-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icons/ghidai-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icons/ghidai-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
}
