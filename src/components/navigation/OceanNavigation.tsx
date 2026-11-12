import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View, type LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { BrandMark, WorkspaceIcon, type WorkspaceIconName } from '../../design/brand';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { OceanGlass } from '../../design/OceanGlass';
import { getOceafinTheme, OCEAFIN } from '../../design/tokens';

export type OceanPage = { id: WorkspaceIconName; titulo: string; detalhe: string };
export type OceanGroup = { titulo: string; ids: readonly string[] };
export type QuickAction = 'receita' | 'despesa' | 'transferencia' | 'cartao';

const NAV_STORAGE = '@oceafin:navigation:collapsed:v2';
const EXPOSED_MOBILE: readonly string[] = ['painel', 'graficos', 'metas'];

/** Motion always follows the *current* animated values, including rapid taps. */
function useLiquidMotion(initial = 0) {
  const { reduceMotion } = useAccessibility();
  const [systemReduced, setSystemReduced] = useState(false);
  const [front] = useState(() => new Animated.Value(initial));
  const [rear] = useState(() => new Animated.Value(initial));
  const [elastic] = useState(() => new Animated.Value(1));
  const activated = useRef(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (live) setSystemReduced(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged',
      value => setSystemReduced(value));
    return () => { live = false; subscription.remove(); };
  }, []);
  const calm = reduceMotion || systemReduced;
  const move = (point: number) => {
    if (!activated.current || calm) {
      front.setValue(point); rear.setValue(point); elastic.setValue(1);
      activated.current = true;
      return;
    }
    front.stopAnimation();
    rear.stopAnimation();
    elastic.stopAnimation();
    Animated.parallel([
      Animated.timing(front, { toValue: point, duration: 510,
        easing: Easing.bezier(0.21, 0.88, 0.24, 1), useNativeDriver: true }),
      Animated.timing(rear, { toValue: point, duration: OCEAFIN.motion.liquid,
        easing: Easing.bezier(0.28, 0.72, 0.24, 1), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(elastic, { toValue: 1.06, duration: 175,
          easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(elastic, { toValue: 1, stiffness: 180, damping: 20,
          mass: 0.9, useNativeDriver: true }),
      ]),
    ]).start();
  };
  return { front, rear, elastic, move, calm };
}

/**
 * One continuous lens instead of two disconnected pills.
 * Its centre follows the average of the front and trailing edges; their
 * separation temporarily stretches only the lens, never icons or labels.
 * React Native Animated tracks current values when rapidly retargeting.
 */
function LiquidCapsule({ front, rear, elastic, axis, itemSize, tint, inset = 3 }: {
  front: Animated.Value; rear: Animated.Value; elastic: Animated.Value;
  axis: 'horizontal' | 'vertical'; itemSize: number; tint: string; inset?: number;
}) {
  const vertical = axis === 'vertical';
  const midpoint = Animated.multiply(Animated.add(front, rear), 0.5);
  const stretch = Animated.subtract(front, rear).interpolate({
    inputRange: [-250, -55, 0, 55, 250],
    outputRange: [1.18, 1.13, 1, 1.13, 1.18],
    extrapolate: 'clamp',
  });
  const elasticStretch = Animated.multiply(stretch, elastic);
  return (
    <Animated.View pointerEvents="none" testID="oceafin-liquid-lens" style={[
      styles.liquidLens,
      { backgroundColor: tint },
      vertical ?
        { top: 0, left: inset, right: inset, height: itemSize - 3,
          transform: [{ translateY: midpoint }, { scaleY: elasticStretch }] } :
        { left: 0, top: inset, bottom: inset, width: itemSize - 6,
          transform: [{ translateX: midpoint }, { scaleX: elasticStretch }] },
    ]}>
      <View pointerEvents="none" style={styles.liquidReflection} />
      <View pointerEvents="none" style={styles.liquidEdge} />
    </Animated.View>
  );
}

function SidebarLink({ page, active, collapsed, onPress, onLayout }: {
  page: OceanPage; active: boolean; collapsed: boolean;
  onPress: () => void; onLayout: (event: LayoutChangeEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={page.titulo}
    accessibilityHint={collapsed ? page.detalhe : undefined}
    accessibilityState={{ selected: active }} onPress={onPress} onLayout={onLayout}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.sidebarLink, collapsed && styles.sidebarLinkCompact,
      (hovered || focused) && styles.sidebarLinkHover,
      focused && styles.sidebarLinkFocus, pressed && styles.pressState]}>
    <WorkspaceIcon name={page.id} size={collapsed ? 23 : 20}
      color={active ? '#EFFFFF' : '#D5EAF1'} />
    {!collapsed && <Text numberOfLines={1} style={[styles.sidebarText,
      active && styles.sidebarTextActive]}>{page.titulo}</Text>}
  </Pressable>;
}

export function OceanSidebar({ pages, groups, active, onNavigate, profileName }: {
  pages: readonly OceanPage[]; groups: readonly OceanGroup[];
  active: string; onNavigate: (id: OceanPage['id']) => void;
  profileName?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const sectionTop = useRef<Record<string, number>>({});
  const relativeTop = useRef<Record<string, number>>({});
  const { front, rear, elastic, move, calm } = useLiquidMotion();
  const [width] = useState(() => new Animated.Value(248));
  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(NAV_STORAGE).then(value => {
      if (mounted && value != null) setCollapsed(value === 'true');
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(width, { toValue: collapsed ? 72 : 248,
      duration: calm ? 0 : 280, easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [width, collapsed, calm]);
  useEffect(() => {
    if (Number.isFinite(positions[active])) move(positions[active]);
  }, [active, positions, calm]);
  const updateSection = (group: string, top: number) => {
    sectionTop.current[group] = top;
    setPositions(previous => {
      const next = { ...previous };
      let changed = false;
      for (const [id, value] of Object.entries(relativeTop.current)) {
        if (!id.startsWith(group + ':')) continue;
        const pageId = id.slice(group.length + 1);
        if (previous[pageId] !== top + value) changed = true;
        next[pageId] = top + value;
      }
      return changed ? next : previous;
    });
  };
  const updateLink = (group: string, id: string, top: number) => {
    relativeTop.current[group + ':' + id] = top;
    const absolute = (sectionTop.current[group] ?? 0) + top;
    setPositions(previous => previous[id] === absolute ? previous :
      { ...previous, [id]: absolute });
  };
  const collapse = () => {
    const next = !collapsed;
    setCollapsed(next); void AsyncStorage.setItem(NAV_STORAGE, String(next)).catch(() => {});
  };
  return <Animated.View style={[styles.sidebarHost, { width }]}>
    <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 248 900"
      preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="sidebar-ambient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#081F34"/>
          <Stop offset="0.6" stopColor="#0A3C60"/>
          <Stop offset="1" stopColor="#17465A"/>
        </LinearGradient>
      </Defs>
      <Rect width="248" height="900" fill="url(#sidebar-ambient)" />
      <Path d="M-30 670C84 540 146 740 279 570V920H-30Z"
        fill="#33A8AF" opacity={0.08}/>
      <Path d="M-40 755C90 620 158 824 278 680"
        fill="none" stroke="#B3FFFA" strokeWidth="2" opacity={0.11}/>
    </Svg>
    <OceanGlass material="navigation" dark radius={0} style={styles.sidebarGlass}>
      <View style={[styles.brandRow, collapsed && styles.brandRowCompact]}>
        <BrandMark size={collapsed ? 40 : 46} />
        {!collapsed && <View style={styles.brandCopy}>
          <Text style={styles.brandName}>Oceafin</Text>
          <Text style={styles.brandTagline}>OCEAN GLASS</Text>
        </View>}
      </View>
      <Pressable onPress={collapse} accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        accessibilityState={{ expanded: !collapsed }}
        style={[styles.collapseButton, collapsed && styles.collapseCompact]}>
        <Text style={styles.collapseLabel}>{collapsed ? '›' : '‹   Recolher'}</Text>
      </Pressable>
      <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.sidebarSections}>
          {Number.isFinite(positions[active]) && <LiquidCapsule
            front={front} rear={rear} elastic={elastic} axis="vertical"
            itemSize={46} tint="rgba(98,216,216,0.34)" inset={2} />}
          {groups.map(group => <View key={group.titulo}
            onLayout={event => updateSection(group.titulo, event.nativeEvent.layout.y)}
            style={styles.sidebarGroup}>
            {!collapsed ? <Text style={styles.groupLabel}>{group.titulo}</Text> :
              <View style={styles.groupLine}/>}
            {pages.filter(p => group.ids.includes(p.id)).map(page =>
              <SidebarLink key={page.id} page={page} active={page.id === active}
                collapsed={collapsed}
                onPress={() => onNavigate(page.id)}
                onLayout={event => updateLink(group.titulo, page.id, event.nativeEvent.layout.y)} />)}
          </View>)}
        </View>
      </ScrollView>
      {!collapsed && <View style={styles.sidebarProfile}>
        <View style={styles.sidebarAvatar}><Text style={styles.sidebarAvatarText}>
          {profileName?.slice(0,1).toUpperCase() || 'O'}</Text></View>
        <View style={styles.sidebarProfileCopy}>
          <Text style={styles.sidebarProfileName} numberOfLines={1}>
            {profileName || 'Oceafin'}</Text>
          <Text style={styles.sidebarProfileCaption}>Minha conta</Text>
        </View>
      </View>}
    </OceanGlass>
  </Animated.View>;
}

function SheetAction({ title, description, icon, onPress, dark }: {
  title: string; description: string; icon: WorkspaceIconName;
  onPress: () => void; dark: boolean;
}) {
  const t = getOceafinTheme(dark);
  return <Pressable accessibilityRole="button" accessibilityLabel={title}
    onPress={onPress} style={({ pressed }) => [styles.sheetAction,
      { backgroundColor: t.surfaceSubtle }, pressed && styles.pressState]}>
    <View style={[styles.sheetIcon, { backgroundColor: t.selected }]}>
      <WorkspaceIcon name={icon} size={22} color={t.link}/>
    </View>
    <View style={styles.sheetActionBody}>
      <Text style={[styles.sheetActionTitle, { color: t.text }]}>{title}</Text>
      <Text style={[styles.sheetActionHint, { color: t.muted }]}>{description}</Text>
    </View>
    <Text style={[styles.sheetArrow, { color: t.muted }]}>›</Text>
  </Pressable>;
}

export function OceanBottomNavigation({ pages, active, onNavigate, onQuickAction }: {
  pages: readonly OceanPage[]; active: string;
  onNavigate: (id: OceanPage['id']) => void;
  onQuickAction?: (action: QuickAction) => void;
}) {
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<'more' | 'add' | null>(null);
  const [dockWidth, setDockWidth] = useState(340);
  const { front, rear, elastic, move, calm } = useLiquidMotion();
  const tabWidth = dockWidth / 5;
  const mobileIndex = active === 'painel' ? 0 : active === 'graficos' ? 1 :
    active === 'metas' || active === 'planos' ? 3 : 4;
  useEffect(() => { move(mobileIndex * tabWidth + 3); }, [mobileIndex, tabWidth, calm]);
  const pick = (id: WorkspaceIconName) => { setSheet(null); onNavigate(id); };
  const quick = (action: QuickAction) => {
    setSheet(null);
    if (onQuickAction) onQuickAction(action);
    else onNavigate(action === 'receita' || action === 'despesa' ? 'lancamentos' : 'contas');
  };
  const tabs: { title: string; icon: WorkspaceIconName; at: number; id?: WorkspaceIconName }[] = [
    { title: 'Início', icon: 'painel', id: 'painel', at: 0 },
    { title: 'Análises', icon: 'graficos', id: 'graficos', at: 1 },
    { title: '+', icon: 'lancamentos', at: 2 },
    { title: 'Planejar', icon: 'metas', id: 'metas', at: 3 },
    { title: 'Perfil', icon: 'configuracoes', at: 4 },
  ];
  return <>
    <View pointerEvents="box-none" style={[styles.dockHost, { bottom: Math.max(8, insets.bottom) }]}>
      <OceanGlass material="navigation" radius={28} dark={isDark} style={styles.dockGlass}>
        <View onLayout={e => setDockWidth(e.nativeEvent.layout.width)}
          style={styles.dockInner}>
          <LiquidCapsule front={front} rear={rear} elastic={elastic}
            axis="horizontal" itemSize={tabWidth} tint={isDark ? 'rgba(105,208,208,.32)' : 'rgba(90,192,201,.30)'} />
          {tabs.map(tab => {
            const selected = tab.at === mobileIndex;
            const isPlus = tab.at === 2;
            return <Pressable key={tab.at}
              accessibilityRole="button"
              accessibilityLabel={isPlus ? 'Adicionar movimentação' : tab.title}
              accessibilityState={{ selected: !isPlus && selected,
                expanded: isPlus ? sheet === 'add' : tab.at === 4 ? sheet === 'more' : undefined }}
              onPress={() => isPlus ? setSheet('add') :
                tab.at === 4 ? setSheet('more') : tab.id && pick(tab.id)}
              style={({ pressed }) => [styles.dockTab, pressed && styles.pressState]}>
              {isPlus ? <View style={styles.plusCircle}>
                <Text style={styles.plusText}>+</Text>
              </View> : <WorkspaceIcon name={tab.icon} size={22}
                color={selected ? (isDark ? '#FFFFFF' : '#0B1F4B') : t.muted} />}
              {!isPlus && <Text numberOfLines={1}
                style={[styles.dockText, { color: selected ? t.text : t.muted }]}>
                {tab.title}</Text>}
            </Pressable>;
          })}
        </View>
      </OceanGlass>
    </View>
    <Modal visible={sheet !== null} transparent animationType="fade"
      onRequestClose={() => setSheet(null)}>
      <View style={styles.sheetOverlay}>
        <Pressable onPress={() => setSheet(null)} accessibilityRole="button"
          accessibilityLabel="Fechar menu" style={styles.sheetScrim} />
        <OceanGlass material="floating" radius={26}
          style={[styles.sheetPanel, { marginBottom: Math.max(14, insets.bottom + 4) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderText}>
              <Text accessibilityRole="header" style={[styles.sheetTitle, { color: t.text }]}>
                {sheet === 'add' ? 'Adicionar movimentação' : 'Explorar Oceafin'}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: t.muted }]}>
                {sheet === 'add' ? 'O que você deseja registrar?' : 'Outras áreas das suas finanças'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu"
              onPress={() => setSheet(null)} style={styles.sheetClose}>
              <Text style={[styles.sheetCloseText, { color: t.text }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetItems}>
            {sheet === 'add' ? <>
              <SheetAction title="Receita" description="Dinheiro que entrou" icon="lancamentos"
                onPress={() => quick('receita')} dark={isDark} />
              <SheetAction title="Despesa" description="Pagamento ou compra à vista" icon="lancamentos"
                onPress={() => quick('despesa')} dark={isDark} />
              <SheetAction title="Transferência" description="Entre suas próprias contas" icon="contas"
                onPress={() => quick('transferencia')} dark={isDark} />
              <SheetAction title="Compra no cartão" description="Registre no cartão sem debitar a conta" icon="contas"
                onPress={() => quick('cartao')} dark={isDark} />
            </> : pages.filter(page => !EXPOSED_MOBILE.includes(page.id)).map(page =>
              <SheetAction key={page.id} title={page.titulo} description={page.detalhe}
                icon={page.id} dark={isDark} onPress={() => pick(page.id)} />)}
          </ScrollView>
        </OceanGlass>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  sidebarHost: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' },
  sidebarGlass: { flex: 1, paddingTop: 18, paddingHorizontal: 8,
    borderRightWidth: 1, borderRightColor: 'rgba(145,229,247,.28)',
    shadowColor: '#081F34', shadowOpacity: 0.13, shadowRadius: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 8, marginBottom: 19 },
  brandRowCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  brandCopy: { minWidth: 0, flex: 1, gap: 2 },
  brandName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.7,
    fontFamily: Platform.OS === 'web' ? 'Montserrat' : undefined },
  brandTagline: { fontSize: 8.5, letterSpacing: 1, color: '#BFE8F0', fontWeight: '700' },
  collapseButton: { height: 44, borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(198,246,255,0.22)', justifyContent: 'center',
    alignItems: 'center', marginBottom: 10 },
  collapseCompact: { paddingHorizontal: 0 },
  collapseLabel: { fontSize: 13, color: '#E1F9FD', fontWeight: '700' },
  sidebarScroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  sidebarSections: { position: 'relative', gap: 12 },
  sidebarGroup: { gap: 4 },
  groupLabel: { fontSize: 10, fontWeight: '800', color: '#ADD8E4',
    letterSpacing: 1.25, marginBottom: 7, paddingHorizontal: 12, marginTop: 6 },
  groupLine: { height: 1, marginHorizontal: 14, marginVertical: 8,
    backgroundColor: 'rgba(210,255,255,0.25)' },
  sidebarLink: { minHeight: 46, borderRadius: 17, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14, gap: 12, zIndex: 1 },
  sidebarLinkCompact: { justifyContent: 'center', paddingHorizontal: 1 },
  sidebarLinkHover: { backgroundColor: 'rgba(205,255,255,0.10)' },
  sidebarLinkFocus: { borderWidth: 2, borderColor: '#B1FFF7' },
  sidebarText: { fontSize: 13, color: '#E4F7FC', flexShrink: 1, fontWeight: '600' },
  sidebarTextActive: { color: '#F2FFFF', fontWeight: '800' },
  sidebarFoot: { fontSize: 10.5, color: '#BFE8F0', lineHeight: 16,
    paddingHorizontal: 9, paddingBottom: 20 },
  sidebarProfile: { marginHorizontal: 5, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 56, padding: 10, borderRadius: 15,
    backgroundColor: 'rgba(0,107,141,.20)' },
  sidebarAvatar: { width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#07BACA', alignItems: 'center', justifyContent: 'center' },
  sidebarAvatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  sidebarProfileCopy: { flex: 1, minWidth: 0, gap: 3 },
  sidebarProfileName: { color: '#ECFFFF', fontSize: 11, fontWeight: '800' },
  sidebarProfileCaption: { color: '#A9D7E2', fontSize: 10 },
  liquidLens: { position: 'absolute', borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(205,255,255,0.66)',
    shadowColor: '#34B7BE', shadowOpacity: 0.10, shadowRadius: 10,
    elevation: 1, overflow: 'hidden' },
  liquidReflection: { position: 'absolute', left: 11, top: 2, right: 11, height: 2,
    backgroundColor: 'rgba(255,255,255,0.37)', borderRadius: 10 },
  liquidEdge: { position: 'absolute', top: 6, right: 2, bottom: 6, width: 2,
    backgroundColor: 'rgba(0,119,200,0.20)', borderRadius: 3 },
  pressState: { opacity: 0.79, transform: [{ scale: 0.98 }] },
  dockHost: { position: 'absolute', left: 12, right: 12, zIndex: 30, elevation: 12 },
  dockGlass: { shadowColor: '#003C68', shadowOpacity: 0.22, shadowRadius: 24,
    elevation: 12, borderColor: 'rgba(255,255,255,0.62)' },
  dockInner: { flexDirection: 'row', alignItems: 'center', minHeight: 68,
    position: 'relative', paddingHorizontal: 0 },
  dockTab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center',
    minHeight: 64, gap: 3, zIndex: 1 },
  dockText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  plusCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(57,173,183,.50)',
    borderWidth: 1, borderColor: 'rgba(192,246,249,.65)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2CB4BF', shadowOpacity: 0.12, shadowRadius: 9 },
  plusText: { fontSize: 30, lineHeight: 34, color: '#FFFFFF', fontWeight: '600' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,13,26,0.55)' },
  sheetPanel: { padding: 18, maxHeight: '79%' },
  sheetHandle: { height: 4, width: 44, borderRadius: 999,
    backgroundColor: '#9DCBD6', alignSelf: 'center', marginBottom: 13 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  sheetHeaderText: { flex: 1, gap: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  sheetSubtitle: { fontSize: 13 },
  sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 30 },
  sheetScroll: { flexGrow: 0 },
  sheetItems: { gap: 8, paddingBottom: 6 },
  sheetAction: { flexDirection: 'row', gap: 12, borderRadius: 16,
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, minHeight: 68 },
  sheetIcon: { width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center' },
  sheetActionBody: { flex: 1, gap: 4 },
  sheetActionTitle: { fontSize: 14, fontWeight: '800' },
  sheetActionHint: { fontSize: 12, lineHeight: 18 },
  sheetArrow: { fontSize: 24, paddingHorizontal: 4 },
});
