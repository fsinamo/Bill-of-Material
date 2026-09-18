import { AppThemeConfig, AppThemeId } from '../types';

export const THEME_OPTIONS: AppThemeConfig[] = [
  {
    id: 'army-green',
    name: 'Hijau Army (Tactical Olive)',
    tagline: 'Nuansa standar militer TNI & tactical gear (Default)',
    primaryColor: '#496f3f',
    badgeBg: '#e2ede0',
    headerBg: '#1a2717',
    accentText: '#21331c',
    militaryTone: 'TNI AD / Tactical Combat',
  },
  {
    id: 'camo-forest',
    name: 'Komando Rimba (Forest Camo)',
    tagline: 'Nuansa hijau rimba hutan pekat & pasukan komando',
    primaryColor: '#2b674e',
    badgeBg: '#d6ebdf',
    headerBg: '#122119',
    accentText: '#1b372c',
    militaryTone: 'Hutan Rimba / Pasukan Khusus',
  },
  {
    id: 'desert-khaki',
    name: 'Khaki Gurun (Desert Tan)',
    tagline: 'Nuansa pasir gurun militer hangat bernuansa tactical outdoor',
    primaryColor: '#8e6834',
    badgeBg: '#f3ebda',
    headerBg: '#261e14',
    accentText: '#4e3620',
    militaryTone: 'Operasi Gurun / Safari Outdoor',
  },
  {
    id: 'stealth-black',
    name: 'Hitam Taktis (Night Ops)',
    tagline: 'Monokrom taktis charcoal & slate modern night operations',
    primaryColor: '#475569',
    badgeBg: '#e2e8f0',
    headerBg: '#0b0f17',
    accentText: '#0f172a',
    militaryTone: 'Night Ops / Anti-Teror',
  },
  {
    id: 'navy-blue',
    name: 'Biru Presisi (Classic Navy)',
    tagline: 'Nuansa biru navy klasik standar industri garment manufaktur',
    primaryColor: '#2563eb',
    badgeBg: '#dbeafe',
    headerBg: '#0f172a',
    accentText: '#1e3a8a',
    militaryTone: 'Manufaktur & PPIC Garment',
  },
];

export const DEFAULT_THEME_ID: AppThemeId = 'army-green';

export function applyThemeToDocument(themeId: AppThemeId): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-app-theme', themeId);
    
    // Update theme-color meta tag for mobile browsers & PWA
    const themeConfig = THEME_OPTIONS.find((t) => t.id === themeId);
    if (themeConfig) {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', themeConfig.headerBg);
    }
  }
}
