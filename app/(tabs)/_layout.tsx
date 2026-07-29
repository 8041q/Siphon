import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/ui/icon';
import { tokens } from '../../src/theme/tokens';

const TABS = [
  { name: 'index', href: '/', label: 'Map', icon: 'map.fill' },
  { name: 'search', href: '/search', label: 'Search', icon: 'magnifyingglass' },
  { name: 'favorites', href: '/favorites', label: 'Favorites', icon: 'star.fill' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'gearshape.fill' },
];

type TabItemProps = {
  icon: string;
  label: string;
  isFocused?: boolean;
  onPress?: () => void;
};

function TabItem({ icon: iconName, label, isFocused, onPress }: TabItemProps) {
  const { colorScheme } = useColorScheme();
  const colors = tokens.color[colorScheme === 'dark' ? 'dark' : 'light'];
  
  return (
    <Pressable onPress={onPress} className="flex-1">
      <View className="flex-1 items-center justify-center py-1">
        <Icon
          name={iconName}
          size={24}
          color={isFocused ? colors.tint : colors.tertiaryLabel}
        />
        <Text
          className={`text-caption-1 mt-0.5 ${isFocused ? 'text-tint dark:text-tint-dark' : 'text-tertiary-label dark:text-tertiary-label-dark'}`}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const TAB_BAR_CONTENT_HEIGHT = 70;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  return (
    <Tabs key={colorScheme}>
      <TabSlot />
      <TabList
        className="flex-row bg-surface dark:bg-surface-dark border-t border-separator dark:border-separator-dark"
        style={{
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        }}
      >
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
            <TabItem icon={tab.icon} label={tab.label} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}