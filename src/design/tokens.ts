/** Oceafin: semantic theme and design tokens for web and native. */
export const OCEAFIN = {
  name: 'Oceafin',
  tagline: 'Seu dinheiro em equilíbrio.',
  colors: { deep: '#071727', navy: '#0C293D', navyRaised: '#14394D',
    ocean: '#0B7189', link: '#09657A', aqua: '#67DCCE', pearl: '#EAF7F9' },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 },
  motion: { quick: 140, standard: 220, gentle: 320 },
} as const;

export const OCEAFIN_THEME = {
  light: { page: '#EFF6F8', surface: '#FFFFFF', surfaceSubtle: '#F6FAFB',
    input: '#F8FBFC', border: '#D5E3E9', text: '#102C3D',
    muted: '#536F7C', primary: '#0B7189', link: '#09657A',
    accent: '#67DCCE', selected: '#DAF5F2', navigation: '#0C293D',
    navigationRaised: '#14394D', navigationText: '#D9EDF3',
    successSurface: '#E3F7EC', errorSurface: '#FFF0F0' },
  dark: { page: '#071727', surface: '#102A3C', surfaceSubtle: '#173649',
    input: '#183B4F', border: '#35566A', text: '#EDF9FC',
    muted: '#B2CDD8', primary: '#0B7189', link: '#80E7DB',
    accent: '#67DCCE', selected: '#194C54', navigation: '#071727',
    navigationRaised: '#14394D', navigationText: '#DBF1F5',
    successSurface: '#163F35', errorSurface: '#402D35' },
} as const;

export type OceafinTheme = keyof typeof OCEAFIN_THEME;
export const getOceafinTheme = (isDark: boolean) =>
  isDark ? OCEAFIN_THEME.dark : OCEAFIN_THEME.light;

/** Temporary bridge for old hard-coded colors. New screens should use semantic tokens. */
export function migrateLegacyColor(value: string, property: string, isDark: boolean): string {
  const c = value.toUpperCase(), t = getOceafinTheme(isDark);
  const isText = ['color', 'tintColor', 'textDecorationColor'].includes(property);
  const isBorder = property.toLowerCase().includes('border');
  if (['#21143C', '#3A2957', '#42305F'].includes(c))
    return c === '#21143C' ? t.navigation : t.navigationRaised;
  if (['#CBF28A', '#EBC7AA'].includes(c)) return t.accent;
  if (['#7C3AED','#8557F5','#6D28D9','#5B21B6','#8B5CF6','#A78BFA',
    '#C4B5FD','#D8B4FE','#DDD6FE'].includes(c))
    return isText || (isBorder && isDark) ? t.link : t.primary;
  if (['#D9CDEE','#C4B5D9','#EAE5F5','#E7DCF9'].includes(c)) return t.navigationText;
  if (isText) {
    if (['#111827','#F8FAFC','#374151','#E2E8F0'].includes(c)) return t.text;
    if (['#4B5563','#6B7280','#C1CBD8','#CBD5E1','#94A3B8','#B6C2D9'].includes(c)) return t.muted;
  }
  if (isBorder && ['#DDD6E6','#ECE8F1','#E6E0EC','#39475B','#536177',
    '#E5E7EB','#D8D2E2','#283650','#34435B','#44516A','#475569'].includes(c))
    return t.border;
  if (property === 'backgroundColor') {
    if (['#F7F5FA','#0B1220','#090F1B'].includes(c)) return t.page;
    if (['#FFFFFF','#142033','#142136','#111A2E'].includes(c)) return t.surface;
    if (['#FCFBFD','#19273D','#18263D'].includes(c)) return t.input;
    if (['#F3F4F6','#F4F1F8','#243248','#27334A'].includes(c)) return t.surfaceSubtle;
    if (['#EDE9FE','#312448'].includes(c)) return t.selected;
    if (['#ECFDF5','#12352D'].includes(c)) return t.successSurface;
    if (['#FEF2F2','#FFF1F2','#3D2028'].includes(c)) return t.errorSurface;
  }
  return value;
}
