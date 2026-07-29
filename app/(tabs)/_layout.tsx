import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/ui/icon';

const TABS = [
  { name: 'index', href: '/', label: 'Map', icon: 'map.fill' },
  { name: 'list', href: '/list', label: 'Stations', icon: 'list.bullet' },
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
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center py-1"
    >
      <Icon
        name={iconName}
        size={24}
        color={isFocused ? 'rgb(12, 133, 153)' : 'rgba(60, 60, 67, 0.3)'}
      />
      <Text
        className={`text-caption-1 mt-0.5 ${isFocused ? 'text-tint' : 'text-tertiary-label'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot />
      <TabList
        className="flex-row bg-surface border-t border-separator"
        style={{ paddingBottom: insets.bottom }}
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
