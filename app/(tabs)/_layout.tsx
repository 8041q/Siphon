import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Platform, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon } from '../../src/components/ui/icon';
import { tokens } from '../../src/theme/tokens';

const TABS = [
  { name: 'index', href: '/', labelKey: 'tabs.map', icon: 'map.fill' },
  { name: 'search', href: '/search', labelKey: 'tabs.search', icon: 'magnifyingglass' },
  { name: 'favorites', href: '/favorites', labelKey: 'tabs.favorites', icon: 'star.fill' },
  { name: 'settings', href: '/settings', labelKey: 'tabs.settings', icon: 'gearshape.fill' },
];

type TabItemProps = {
  icon: string;
  label: string;
  isFocused?: boolean;
  onPress?: () => void;
  colorScheme: 'light' | 'dark';
  bottomInset: number;
};

function TabItem({ icon: iconName, label, isFocused, onPress, colorScheme, bottomInset }: TabItemProps) {
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  
  return (
    <Pressable onPress={onPress} className="flex-1">
      <View
        className="flex-1 items-center justify-center"
        style={{ paddingTop: 4, paddingBottom: Math.max(bottomInset, 4) }}
      >
        <Icon
          name={iconName}
          size={24}
          color={isFocused ? colors.tint : colors.tertiaryLabel}
        />
        <Text
          style={{
            color: isFocused 
              ? colors.tint 
              : colors.tertiaryLabel
          }}
          className="text-caption-1 mt-0.5"
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const TAB_BAR_CONTENT_HEIGHT = Platform.OS === 'ios' ? 52 : 70;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const currentTheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = tokens.color[currentTheme];

  return (
    <Tabs key={colorScheme}>
      <TabSlot />
      <TabList
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.separator,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
        }}
      >
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
            <TabItem icon={tab.icon} label={t(tab.labelKey)} colorScheme={currentTheme} bottomInset={insets.bottom} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}