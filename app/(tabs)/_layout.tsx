import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../src/components/ui/icon';
import { GlassBackdrop } from '../../src/components/ui/glass';
import { useThemeTokens } from '../../src/hooks/useThemeTokens';
import { useSupport } from '../../src/hooks/useSupport';
import { useStyleConfig, applyComponentRules, isGlass } from '../../src/hooks/useStyleConfig';
import { TAB_BAR_HEIGHT, TAB_BAR_H_MARGIN, TAB_BAR_FLOAT_GAP } from '../../src/theme/layout';

const TABS = [
  { name: 'index', href: '/', labelKey: 'tabs.map', icon: 'map.fill' },
  { name: 'search', href: '/search', labelKey: 'tabs.search', icon: 'magnifyingglass' },
  { name: 'market', href: '/market', labelKey: 'tabs.market', icon: 'oilcan.fill' },
  { name: 'favorites', href: '/favorites', labelKey: 'tabs.favorites', icon: 'star.fill' },
  { name: 'settings', href: '/settings', labelKey: 'tabs.settings', icon: 'gearshape.fill' },
];

type TabItemProps = {
  icon: string;
  label: string;
  isFocused?: boolean;
  onPress?: () => void;
  colors: Record<string, string>;
};

function TabItem({ icon: iconName, label, isFocused, onPress, colors }: TabItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      hitSlop={4}
    >
      <View className="flex-1 items-center justify-center">
        <Icon
          name={iconName}
          size={24}
          color={isFocused ? colors.tint : colors.tertiaryLabel}
        />
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { styleRules } = useSupport();
  const rules = useStyleConfig(styleRules, 'tabBar');
  const glass = isGlass(rules);
  const pillRadius = rules.borderRadius ?? TAB_BAR_HEIGHT / 2;

  // Shape/border overrides from the active style set. `applyComponentRules`
  // forces `overflow: 'hidden'` for glass — that would clip the drop shadow,
  // so only the inner backdrop clips the blur instead.
  const shapeStyle = applyComponentRules(rules, colors.label);
  if (glass) delete shapeStyle.overflow;

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={[
          {
            position: 'absolute',
            left: TAB_BAR_H_MARGIN,
            right: TAB_BAR_H_MARGIN,
            bottom: Math.max(insets.bottom, 8) + TAB_BAR_FLOAT_GAP,
            height: TAB_BAR_HEIGHT,
            borderRadius: pillRadius,
            backgroundColor: glass ? 'transparent' : colors.surface,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 8,
          },
          shapeStyle,
        ]}
      >
        {glass && (
          <View
            style={[StyleSheet.absoluteFill, { borderRadius: pillRadius, overflow: 'hidden' }]}
            pointerEvents="none"
          >
            <GlassBackdrop />
          </View>
        )}
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
            <TabItem icon={tab.icon} label={t(tab.labelKey)} colors={colors} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}
