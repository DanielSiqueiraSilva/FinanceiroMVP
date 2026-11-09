import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export const BRAND = {
  ink: '#21143C',
  violet: '#7C3AED',
  lime: '#CBF28A',
  sand: '#EBC7AA',
  paper: '#F7F5FA',
  muted: '#D9CDEE',
} as const;

type IconName =
  | 'painel' | 'lancamentos' | 'graficos' | 'dados' | 'automacao'
  | 'contas' | 'metas' | 'planos' | 'carteiras' | 'configuracoes';

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      <Rect x="0" y="0" width="48" height="48" rx="14" fill={BRAND.lime} />
      <Path
        d="M11 32V16H23.5M11 24H20M22 32L29 23L34 27L39 14"
        fill="none" stroke={BRAND.ink} strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx="39" cy="14" r="2.5" fill={BRAND.ink} />
    </Svg>
  );
}

export function WorkspaceIcon({
  name, size = 20, color = BRAND.ink,
}: { name: IconName; size?: number; color?: string }) {
  const common = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {name === 'painel' && <>
        <Rect x="3" y="3" width="8" height="8" rx="2" {...common}/>
        <Rect x="13" y="3" width="8" height="5" rx="2" {...common}/>
        <Rect x="13" y="10" width="8" height="11" rx="2" {...common}/>
        <Rect x="3" y="13" width="8" height="8" rx="2" {...common}/>
      </>}
      {name === 'lancamentos' && <>
        <Rect x="4" y="4" width="16" height="16" rx="4" {...common}/>
        <Path d="M12 8v8M8 12h8" {...common}/>
      </>}
      {name === 'graficos' && <>
        <Path d="M3 20h18M5 17v-5M10 17V7M15 17v-9M20 17V4" {...common}/>
      </>}
      {name === 'dados' && <>
        <Rect x="3" y="4" width="18" height="16" rx="3" {...common}/>
        <Line x1="3" y1="10" x2="21" y2="10" {...common}/>
        <Line x1="10" y1="10" x2="10" y2="20" {...common}/>
        <Line x1="3" y1="15" x2="21" y2="15" {...common}/>
      </>}
      {name === 'automacao' && <>
        <Path d="M19 9a7 7 0 1 0 1 6M19 4v5h-5" {...common}/>
        <Path d="M12 8v4l3 2" {...common}/>
      </>}
      {name === 'contas' && <>
        <Rect x="3" y="6" width="18" height="14" rx="3" {...common}/>
        <Path d="M3 10V6a3 3 0 0 1 3-3h12" {...common}/>
        <Path d="M16 12h5v5h-5a2.5 2.5 0 0 1 0-5Z" {...common}/>
        <Circle cx="16.5" cy="14.5" r="0.8" fill={color}/>
      </>}
      {name === 'metas' && <>
        <Circle cx="12" cy="12" r="9" {...common}/>
        <Circle cx="12" cy="12" r="5" {...common}/>
        <Circle cx="12" cy="12" r="1.5" fill={color}/>
      </>}
      {name === 'planos' && <>
        <Path d="M3 19h18M5 16l4-4 4 2 6-8M15 6h4v4" {...common}/>
        <Path d="M5 7h3M5 7v3" {...common}/>
      </>}
      {name === 'carteiras' && <>
        <Circle cx="8" cy="8" r="3" {...common}/>
        <Circle cx="17" cy="9" r="2.5" {...common}/>
        <Path d="M2.5 19v-2a5.5 5.5 0 0 1 11 0v2H2.5ZM15 16h1.5a4.5 4.5 0 0 1 4.5 4.5" {...common}/>
      </>}
      {name === 'configuracoes' && <>
        <Path d="M4 7h16M4 12h16M4 17h16" {...common}/>
        <Circle cx="9" cy="7" r="2" fill={BRAND.paper} stroke={color} strokeWidth="1.8"/>
        <Circle cx="16" cy="12" r="2" fill={BRAND.paper} stroke={color} strokeWidth="1.8"/>
        <Circle cx="11" cy="17" r="2" fill={BRAND.paper} stroke={color} strokeWidth="1.8"/>
      </>}
    </Svg>
  );
}

/** A subtle visual signature for the summary card. Does not encode financial data. */
export function HeroSignature() {
  return (
    <Svg width={178} height={172} viewBox="0 0 178 172" accessible={false}>
      <Circle cx="153" cy="77" r="80" fill="none" stroke="#CBF28A" strokeOpacity={0.18} strokeWidth={1.5}/>
      <Circle cx="153" cy="77" r="56" fill="none" stroke="#CBF28A" strokeOpacity={0.24} strokeWidth={1.5}/>
      <Circle cx="153" cy="77" r="32" fill="none" stroke="#CBF28A" strokeOpacity={0.32} strokeWidth={1.5}/>
      <Path d="M18 127L57 108L89 116L124 77L161 57" fill="none" stroke="#CBF28A" strokeOpacity={0.65}
        strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="124" cy="77" r="5" fill="#CBF28A" />
    </Svg>
  );
}
