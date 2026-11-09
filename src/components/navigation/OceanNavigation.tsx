import { useEffect, useState } from 'react';
import {
  AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { BrandMark, WorkspaceIcon, type WorkspaceIconName } from '../../design/brand';
import { getOceafinTheme, OCEAFIN } from '../../design/tokens';

export type OceanPage = { id: WorkspaceIconName; titulo: string; detalhe: string };
export type OceanGroup = { titulo: string; ids: readonly string[] };

function useCalmMotion() {
  const { reduceMotion } = useAccessibility();
  const [systemReduced, setSystemReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setSystemReduced(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged', value => setSystemReduced(value)
    );
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduceMotion || systemReduced;
}

function NavigationItem({ page, selected, compact, onNavigate, darkSurface = false }: {
  page: OceanPage; selected: boolean; compact: boolean;
  onNavigate: () => void; darkSurface?: boolean;
}) {
  const { isDark } = useAccessibility();
  const reduced = useCalmMotion();
  const theme = getOceafinTheme(isDark);
  const [highlight] = useState(() => new Animated.Value(selected ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(highlight, {
      toValue: selected ? 1 : 0, duration: reduced ? 0 : OCEAFIN.motion.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [highlight, selected, reduced]);
  const textColor = darkSurface
    ? (selected ? OCEAFIN.colors.deep : theme.navigationText)
    : selected ? theme.text : theme.muted;
  return (
    <Pressable onPress={onNavigate} accessibilityRole="button"
      accessibilityLabel={page.titulo}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.item, compact && styles.itemCompact, pressed && styles.pressed,
      ]}>
      <Animated.View pointerEvents="none" style={[
        StyleSheet.absoluteFillObject, styles.itemHighlight,
        { opacity: highlight, backgroundColor: darkSurface ? theme.accent : theme.selected },
      ]} />
      <WorkspaceIcon name={page.id} size={compact ? 23 : 19} color={textColor} />
      {!compact && <Text style={[styles.itemLabel, { color: textColor }]} numberOfLines={2}>
        {page.titulo}
      </Text>}
    </Pressable>
  );
}

export function OceanSidebar({ pages, groups, active, onNavigate }: {
  pages: readonly OceanPage[]; groups: readonly OceanGroup[];
  active: string; onNavigate: (id: OceanPage['id']) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const reduced = useCalmMotion();
  const [width] = useState(() => new Animated.Value(244));
  useEffect(() => {
    const animation = Animated.timing(width, {
      toValue: collapsed ? 78 : 244,
      duration: reduced ? 0 : OCEAFIN.motion.gentle,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [width, collapsed, reduced]);
  return (
    <Animated.View style={[styles.sidebar, { width }]}>
      <View style={[styles.brandRow, collapsed && styles.brandRowCompact]}>
        <BrandMark size={collapsed ? 38 : 42} />
        {!collapsed && <View style={styles.brandText}>
          <Text style={styles.brandName}>{OCEAFIN.name.toLowerCase()}</Text>
          <Text style={styles.brandTagline}>SEU DINHEIRO EM EQUILÍBRIO</Text>
        </View>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={
        collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
      } accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCollapsed(v => !v)}
        style={[styles.collapseButton, collapsed && styles.collapseButtonCompact]}>
        <Text style={styles.collapseLabel}>{collapsed ? '›' : '‹  Recolher menu'}</Text>
      </Pressable>
      <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sections}
        showsVerticalScrollIndicator={false}>
        {groups.map(group => (
          <View key={group.titulo} style={styles.group}>
            {!collapsed ? <Text style={styles.groupLabel}>{group.titulo}</Text> :
              <View style={styles.groupDivider} />}
            {pages.filter(page => group.ids.includes(page.id)).map(page => (
              <NavigationItem key={page.id} page={page}
                selected={active === page.id} compact={collapsed}
                darkSurface onNavigate={() => onNavigate(page.id)} />
            ))}
          </View>
        ))}
      </ScrollView>
      {!collapsed && <Text style={styles.footer}>Menos complicação. Mais clareza no seu dia.</Text>}
    </Animated.View>
  );
}

export function OceanBottomNavigation({ pages, active, onNavigate }: {
  pages: readonly OceanPage[]; active: string;
  onNavigate: (id: OceanPage['id']) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { isDark } = useAccessibility();
  const theme = getOceafinTheme(isDark);
  const primaryIds = ['painel', 'lancamentos', 'graficos'];
  const primary = pages.filter(p => primaryIds.includes(p.id));
  const others = pages.filter(p => !primaryIds.includes(p.id));
  const moreSelected = moreOpen || others.some(p => p.id === active);
  return (
    <View style={styles.dockHost}>
      {moreOpen && <View style={[styles.popover, {
        backgroundColor: theme.surface, borderColor: theme.border,
      }]}>
        <View style={styles.popoverTop}>
          <Text style={[styles.popoverHeading, { color: theme.text }]}>Outras áreas</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar outras áreas"
            onPress={() => setMoreOpen(false)} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.text }]}>Fechar ×</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.popoverScroll}>
          {others.map(p => (
            <Pressable key={p.id} accessibilityRole="button"
              accessibilityState={{ selected: active === p.id }}
              onPress={() => { setMoreOpen(false); onNavigate(p.id); }}
              style={[styles.moreItem, active === p.id && { backgroundColor: theme.selected }]}>
              <WorkspaceIcon name={p.id} size={20} color={theme.text} />
              <Text style={[styles.moreLabel, { color: theme.text }]}>{p.titulo}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>}
      <View style={[styles.dock, {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        paddingBottom: Math.max(8, insets.bottom),
      }]}>
        {primary.map(p => (
          <View key={p.id} style={styles.dockSlot}>
            <NavigationItem page={p} compact selected={active === p.id}
              onNavigate={() => { setMoreOpen(false); onNavigate(p.id); }} />
            <Text numberOfLines={1} style={[styles.dockLabel, {
              color: active === p.id ? theme.text : theme.muted,
            }]}>{p.titulo}</Text>
          </View>
        ))}
        <Pressable style={[styles.dockSlot, styles.moreAction]}
          accessibilityRole="button" accessibilityLabel={moreOpen ? 'Fechar menu' : 'Abrir outras áreas'}
          accessibilityState={{ expanded: moreOpen, selected: moreSelected }}
          onPress={() => setMoreOpen(v => !v)}>
          <Text style={[styles.dots, { color: moreSelected ? theme.link : theme.muted }]}>•••</Text>
          <Text style={[styles.dockLabel, { color: moreSelected ? theme.text : theme.muted }]}>Mais</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: '#0C293D', paddingHorizontal: 10, paddingTop: 20, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 6, marginBottom: 16 },
  brandRowCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  brandText: { flex: 1, minWidth: 0 },
  brandName: { fontSize: 23, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.7 },
  brandTagline: { color: '#B2CDD8', fontSize: 9, fontWeight: '700', marginTop: 3 },
  collapseButton: { borderWidth: 1, borderColor: '#35566A', borderRadius: 12,
    minHeight: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  collapseButtonCompact: { marginHorizontal: 1 },
  collapseLabel: { fontSize: 12, fontWeight: '700', color: '#D9EDF3' },
  sidebarScroll: { flex: 1 },
  sections: { gap: 15, paddingBottom: 20 },
  group: { gap: 4 },
  groupLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1,
    color: '#B2CDD8', paddingLeft: 12, marginBottom: 5 },
  groupDivider: { height: 1, backgroundColor: '#35566A', marginHorizontal: 12, marginVertical: 7 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14,
    minHeight: 46, borderRadius: 14, overflow: 'hidden' },
  itemCompact: { flexDirection: 'column', justifyContent: 'center', minHeight: 46, paddingHorizontal: 4 },
  itemHighlight: { borderRadius: 14 },
  itemLabel: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  pressed: { opacity: 0.8 },
  footer: { color: '#B2CDD8', fontSize: 11, lineHeight: 16, padding: 12 },
  dockHost: { position: 'relative', zIndex: 10 },
  dock: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 7 },
  dockSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0, gap: 2 },
  dockLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  moreAction: { minHeight: 53 },
  dots: { fontSize: 19, fontWeight: '900' },
  popover: { position: 'absolute', bottom: '100%', left: 10, right: 10,
    borderWidth: 1, borderRadius: 20, padding: 12, maxHeight: 355, zIndex: 30,
    shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  popoverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 7, marginBottom: 8 },
  popoverHeading: { fontSize: 15, fontWeight: '800' },
  closeButton: { padding: 9, minHeight: 40, justifyContent: 'center' },
  closeText: { fontWeight: '700', fontSize: 12 },
  popoverScroll: { maxHeight: 284 },
  moreItem: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 12,
    paddingHorizontal: 12, minHeight: 47 },
  moreLabel: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
});
