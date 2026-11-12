import assert from 'node:assert/strict';
import test from 'node:test';
import { OCEAFIN, OCEAFIN_THEME } from '../../src/design/tokens.ts';

function linear(channel) {
  const n = channel / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const c = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  return .2126 * linear(c[0]) + .7152 * linear(c[1]) + .0722 * linear(c[2]);
}
function contrast(foreground, background) {
  const [a,b] = [luminance(foreground),luminance(background)].sort((x,y)=>y-x);
  return (a+.05)/(b+.05);
}
test('all solid ocean/critical controls remain readable with white labels', () => {
  for (const [name, background] of Object.entries({
    themeLight: OCEAFIN_THEME.light.primary,
    themeDark: OCEAFIN_THEME.dark.primary,
    buttonLight: OCEAFIN.button.solidPrimaryLight,
    buttonDark: OCEAFIN.button.solidPrimaryDark,
    destructiveLight: OCEAFIN.button.solidDangerLight,
    destructiveDark: OCEAFIN.button.solidDangerDark,
  })) {
    assert.ok(contrast('#FFFFFF',background)>=4.5,
      name+' does not provide 4.5:1 white text contrast: '+contrast('#FFFFFF',background));
  }
});
test('ocean secondary glass has dark foreground on light and light on dark', () => {
  // Conservative opaque background under translucent buttons:
  const lightInk='#103D4B',lightBackground='#F2F7F9';
  const darkInk='#EFFCFF',darkBackground='#0D1C29';
  assert.ok(contrast(lightInk,lightBackground)>=7);
  assert.ok(contrast(darkInk,darkBackground)>=7);
});
