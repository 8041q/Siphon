import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, deferred } from './helpers/loadSource.mjs';
import { hookHarness } from './helpers/hooks.mjs';

async function mountSettings(clear) {
  const hooks = hookHarness(), alerts = [], changes = [];
  const ui = { historyEnabled: true, setHistoryEnabled: value => { changes.push(value); ui.historyEnabled = value; } };
  const deps = {
    react: hooks.react,
    'react-native': { Alert: { alert: (...args) => alerts.push(args) }, I18nManager: {}, Linking: {}, ScrollView: 'Scroll', Switch: 'Switch', Text: 'Text', View: 'View' },
    'expo-router': { useRouter: () => ({ navigate: () => {} }) },
    'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Light: 'light' } },
    'react-native-safe-area-context': { SafeAreaView: 'Safe', useSafeAreaInsets: () => ({ bottom: 0 }) },
    nativewind: { colorScheme: { set: () => {} } },
    '@react-native-async-storage/async-storage': { default: { getItem: async () => null } },
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) },
    '../../src/hooks/useApp': { client: { clearHistoryCache: clear }, useUI: () => ui, useStationDistances: () => ({ clearSavedRoadDistances: async () => 0 }) },
    '../../src/hooks/useSupport': { useSupport: () => ({ watchedCount: 0 }), useAppearanceSupport: () => ({ paletteId: 'default', iconSet: {}, styleSetId: 'default', styleRules: {}, marker: { type: 'svg', value: 'drop' } }) },
    '../../src/hooks/useAppUpdate': { useAppUpdate: () => ({ distribution: 'play' }) },
    '../../src/hooks/useVehicles': { useVehicles: () => ({ vehicles: [] }) },
    '../../src/hooks/useEvConfig': { useEvConfig: () => ({ config: {} }) },
    '../../src/hooks/useAppearanceLayout': { useAppearanceLayout: () => ({ space: { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32 }, numericStyle: {}, modern:false, compact:false }) },
    '../../src/hooks/useThemeTokens': { useThemeTokens: () => ({ colors: {} }) },
    '../../src/hooks/useStyleConfig': { useStyleConfig: () => ({}), applyComponentRules: () => ({}) },
    '../../src/theme/layout': { tabBarClearance: () => 0 },
    '../../src/utils/fuelNames': {}, '../../src/utils/vehicles': {},
    '../../src/config/features': { MONETIZATION_ENABLED: false }, '../../src/config/legal': { SOURCE_REPOSITORY_URL: '' },
  };
  for (const [path, name] of [['ui/GlassBox','GlassBox'], ['ui/button','Button'], ['ui/list-item','ListItem'], ...['Language','Theme','LocationMarker','Vehicle','EvBreakeven','Rewards','Donation'].map(name => [name+'Sheet',name+'Sheet'])]) deps['../../src/components/'+path] = { [name]: name };
  const { default: Settings } = await loadSource('app/(tabs)/settings.tsx', deps);
  const render = () => hooks.render(Settings);
  const toggle = () => hooks.walk(render()).find(node => node.type === 'Switch' && node.props.accessibilityLabel === 'settings.save_history');
  return { alerts, changes, ui, toggle };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('turning history off warns first; cancel and dismissal preserve saved data', async () => {
  let clears = 0;
  const screen = await mountSettings(async () => { clears++; });
  screen.toggle().props.onValueChange(false);
  screen.toggle().props.onValueChange(false);
  assert.equal(screen.alerts.length, 1);
  assert.equal(clears, 0); assert.deepEqual(screen.changes, []);
  screen.alerts[0][2][0].onPress();
  assert.equal(screen.toggle().props.value, true);
  screen.toggle().props.onValueChange(false);
  screen.alerts[1][3].onDismiss();
  screen.toggle().props.onValueChange(true);
  assert.equal(clears, 0); assert.deepEqual(screen.changes, [true]);
});

test('confirmed history removal clears once, disables the switch during deletion, and reports failure', async () => {
  const deletion = deferred(); let clears = 0;
  const screen = await mountSettings(() => { clears++; return deletion.promise; });
  screen.toggle().props.onValueChange(false);
  const confirm = screen.alerts[0][2][1];
  assert.equal(confirm.style, 'destructive');
  confirm.onPress(); confirm.onPress();
  assert.equal(clears, 1); assert.equal(screen.toggle().props.disabled, true);
  deletion.resolve({ deleted: 4 }); await tick();
  assert.deepEqual(screen.changes, [false]); assert.equal(screen.toggle().props.disabled, false);
  const failure = await mountSettings(async () => { throw new Error('storage unavailable'); });
  failure.toggle().props.onValueChange(false); failure.alerts[0][2][1].onPress(); await tick();
  assert.equal(failure.toggle().props.value, true); assert.deepEqual(failure.changes, []);
  assert.equal(failure.alerts[1][1], 'settings.history_delete_failed');
});
