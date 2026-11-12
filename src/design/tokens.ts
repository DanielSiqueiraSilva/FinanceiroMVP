/** Oceafin: semantic theme and design tokens for web and native. */
export const OCEAFIN = {
  name: 'Oceafin',
  tagline: 'Suas finanças, mais simples.',
  colors: { deep: '#071E34', navy: '#0B1F4B', navyRaised: '#123D63',
    ocean: '#0077C8', link: '#006D9A', aqua: '#00E5D2', pearl: '#D6FAFF' },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 },
  motion: { quick: 150, standard: 230, gentle: 280, liquid: 650, sheet: 300 },
  glass: { navigationBlur: 16, floatingBlur: 18, softBlur: 8, buttonBlur: 17 },
  button: { radius: 999, height: 46, pressScale: 0.965, pressTiltDegrees: 12,
    lightTint: 'rgba(87,185,195,0.20)', darkTint: 'rgba(103,207,215,0.16)',
    solidPrimaryLight: '#096276', solidPrimaryDark: '#0A6174',
    solidDangerLight: '#A32946', solidDangerDark: '#942C44',
    lightGlass: 'rgba(255,255,255,0.42)', darkGlass: 'rgba(174,224,238,0.11)',
    lightBorder: 'rgba(255,255,255,0.94)', darkBorder: 'rgba(207,250,254,0.32)' },
  typography: { heading: 'Manrope', body: 'Inter', brand: 'Montserrat' },
} as const;

export const OCEAFIN_THEME = {
  light: { page: '#F2F7F9', surface: '#FFFFFF', surfaceSubtle: '#EAF3F5',
    input: '#F6FBFC', border: '#CADFE6', text: '#0B1F4B',
    muted: '#506E81', primary: '#0A7083', link: '#006B80',
    accent: '#00E5D2', selected: '#D9F3F3', navigation: '#0B1F4B',
    navigationRaised: '#123D63', navigationText: '#E6FAFD',
    successSurface: '#E3F7EC', errorSurface: '#FFF0F0' },
  dark: { page: '#0D1C29', surface: '#162C3B', surfaceSubtle: '#203B4A',
    input: '#203B4C', border: '#3B6170', text: '#EFFCFF',
    muted: '#B4CFDD', primary: '#0B7186', link: '#83E8E3',
    accent: '#00E5D2', selected: '#194B56', navigation: '#071E34',
    navigationRaised: '#123D63', navigationText: '#E6FAFD',
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
    return isText ? t.link : isBorder ? t.border : t.primary;
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
