import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { OCEAFIN } from '../../design/tokens';
import { moeda } from '../workspace/FinanceVisuals';

function HeroOceanArt() {
  return <Svg pointerEvents="none" width="100%" height="100%"
    preserveAspectRatio="xMidYMid slice" viewBox="0 0 920 330"
    style={StyleSheet.absoluteFill}>
    <Defs>
      <LinearGradient id="hero-ocean" x1="0" y1="0" x2="1" y2="0.86">
        <Stop offset="0" stopColor="#071E34"/>
        <Stop offset="0.5" stopColor="#0A3855"/>
        <Stop offset="1" stopColor="#075E75"/>
      </LinearGradient>
      <RadialGradient id="hero-glow" cx="82%" cy="11%" rx="62%" ry="78%">
        <Stop offset="0" stopColor="#00E5D2" stopOpacity="0.53"/>
        <Stop offset="0.36" stopColor="#0077C8" stopOpacity="0.19"/>
        <Stop offset="1" stopColor="#0A3855" stopOpacity="0"/>
      </RadialGradient>
      <LinearGradient id="hero-wave" x1="0" y1="0" x2="1" y2="0.3">
        <Stop offset="0" stopColor="#008BCA" stopOpacity="0"/>
        <Stop offset="0.55" stopColor="#00C7DB" stopOpacity="0.27"/>
        <Stop offset="1" stopColor="#00E5D2" stopOpacity="0.51"/>
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="920" height="330" fill="url(#hero-ocean)"/>
    <Rect x="0" y="0" width="920" height="330" fill="url(#hero-glow)"/>
    <Path d="M200 260C410 174 620 343 922 168L922 334H0Z"
      fill="url(#hero-wave)"/>
    <Path d="M140 288C348 215 600 363 926 208" stroke="#43E9E4"
      strokeOpacity="0.29" strokeWidth="2" fill="none"/>
    <Path d="M450 4C620 42 780 14 912 8" stroke="#C5FFFF"
      strokeOpacity="0.4" strokeWidth="1.4" fill="none"/>
  </Svg>;
}

export function OceanHero({ balance, monthResult, period, hidden, onToggle, onAccounts }: {
  balance: number | null; monthResult: number | null; period: string;
  hidden: boolean; onToggle: () => void; onAccounts: () => void;
}) {
  const value = balance === null ? 'Sem estimativa' : hidden ? 'R$ •••••' : moeda(balance);
  return <View style={styles.hero}>
    <HeroOceanArt />
    <View style={styles.topLight} pointerEvents="none" />
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>OCEAFIN  /  SUAS CONTAS</Text>
        <Text style={styles.label}>Saldo disponível</Text>
      </View>
      <Pressable accessibilityRole="button"
        accessibilityLabel={hidden ? 'Mostrar valores financeiros' : 'Ocultar valores financeiros'}
        accessibilityState={{ checked: hidden }}
        onPress={onToggle} style={styles.privacyButton}>
        <Text style={styles.privacyText}>{hidden ? '◉  Mostrar' : '◌  Ocultar'}</Text>
      </Pressable>
    </View>
    <Text style={styles.balance} numberOfLines={2}
      adjustsFontSizeToFit minimumFontScale={0.62}
      accessibilityLabel={balance === null ? 'Saldo indisponível' :
        hidden ? 'Saldo oculto' : 'Saldo estimado: ' + moeda(balance)}>{value}</Text>
    <Text style={styles.caption}>Estimativa baseada nas contas e movimentações vinculadas.</Text>
    <View style={styles.rule}/>
    <View style={styles.footer}>
      <View style={styles.footerCopy}>
        <Text style={styles.footerLabel}>RESULTADO DO MÊS · {period}</Text>
        <Text style={styles.footerValue}>
          {monthResult === null ? 'Indisponível' : hidden ? 'R$ •••••' : moeda(monthResult)}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onAccounts}
        style={styles.accountButton}>
        <Text style={styles.accountButtonText}>Ver contas  ›</Text>
      </Pressable>
    </View>
    {balance === null && <Text style={styles.unavailable}>
      Cadastre ou vincule suas contas para visualizar seu saldo estimado.
    </Text>}
  </View>;
}

const styles = StyleSheet.create({
  hero: { position: 'relative', minHeight: 225, borderRadius: 23,
    paddingHorizontal: 25, paddingVertical: 23, justifyContent: 'space-between', gap: 13,
    overflow: 'hidden', backgroundColor: '#071E34', borderWidth: 1,
    borderColor: 'rgba(210,255,255,0.28)',
    shadowColor: '#04486A', shadowOpacity: 0.28, shadowRadius: 28,
    ...(Platform.OS === 'web' ? { boxShadow: '0 20px 42px rgba(4,39,67,0.18)' } : {}) },
  topLight: { position: 'absolute', left: 20, right: 20, top: 0, height: 1,
    backgroundColor: 'rgba(217,255,255,0.68)' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 10 },
  headerCopy: { gap: 6, flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#8CF8EE' },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  privacyButton: { borderWidth: 1, borderColor: 'rgba(191,255,255,0.43)',
    backgroundColor: 'rgba(14,66,84,0.57)', borderRadius: 999,
    minHeight: 42, paddingHorizontal: 12, justifyContent: 'center' },
  privacyText: { color: '#EDFFFF', fontSize: 12, fontWeight: '800' },
  balance: { fontSize: 38, fontWeight: '900', letterSpacing: -0.9, color: '#FFFFFF',
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  caption: { color: '#D2EFF5', fontSize: 11.5, lineHeight: 18 },
  rule: { height: 1, backgroundColor: 'rgba(195,255,255,0.28)', marginTop: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  footerCopy: { flex: 1, gap: 4, minWidth: 130 },
  footerLabel: { fontSize: 10, fontWeight: '800', color: '#A9DFE7', letterSpacing: 0.8 },
  footerValue: { color: '#F3FFFF', fontSize: 18, fontWeight: '800' },
  accountButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13,
    borderRadius: 14, backgroundColor: 'rgba(4,117,158,0.56)' },
  accountButtonText: { fontSize: 12, color: '#F0FFFF', fontWeight: '800' },
  unavailable: { color: '#CBF6F5', fontSize: 11, lineHeight: 16 },
});
