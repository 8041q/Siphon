import { Linking, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeTokens } from '../src/hooks/useThemeTokens';
import { useAppearanceSupport } from '../src/hooks/useSupport';
import { useStyleConfig, applyComponentRules } from '../src/hooks/useStyleConfig';
import { ListItem } from '../src/components/ui/list-item';
import {
  DGEG_URL,
  ISSUES_URL,
  OPENFREEMAP_URL,
  OPENSTREETMAP_COPYRIGHT_URL,
  OSRM_URL,
  PRIVACY_POLICY_URL,
  SIPHON_API_URL,
  SOURCE_REPOSITORY_URL,
  SUPPORT_EMAIL,
} from '../src/config/legal';

export default function LegalScreen() {
  const { t } = useTranslation();
  const { colors } = useThemeTokens();
  const { styleRules } = useAppearanceSupport();
  const cardRules = useStyleConfig(styleRules, 'card');
  const cardStyle = applyComponentRules(cardRules, colors.label);
  const insets = useSafeAreaInsets();

  const open = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <SafeAreaView className="flex-1" edges={['bottom']} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: t('legal.title') }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg p-lg"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="rounded-md overflow-hidden">
          <Text style={{ color: colors.label }} className="text-title-3 font-semibold px-lg pt-lg">
            {t('legal.privacy_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-body px-lg py-md">
            {t('legal.privacy_body')}
          </Text>
          <ListItem onPress={() => open(PRIVACY_POLICY_URL)}>{t('legal.privacy_policy')}</ListItem>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="rounded-md overflow-hidden">
          <Text style={{ color: colors.label }} className="text-title-3 font-semibold px-lg pt-lg">
            {t('legal.location_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-body px-lg py-md">
            {t('legal.location_body')}
          </Text>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="rounded-md overflow-hidden">
          <Text style={{ color: colors.label }} className="text-title-3 font-semibold px-lg pt-lg">
            {t('legal.sources_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-body px-lg pt-md">
            {t('legal.dgeg_body')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-body px-lg pt-md">
            {t('legal.maps_body')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-body px-lg py-md">
            {t('legal.routing_body')}
          </Text>
          <ListItem onPress={() => open(DGEG_URL)}>DGEG</ListItem>
          <ListItem onPress={() => open(SIPHON_API_URL)}>SiphonAPI</ListItem>
          <ListItem onPress={() => open(OPENSTREETMAP_COPYRIGHT_URL)}>OpenStreetMap</ListItem>
          <ListItem onPress={() => open(OPENFREEMAP_URL)}>OpenFreeMap</ListItem>
          <ListItem onPress={() => open(OSRM_URL)}>OSRM</ListItem>
        </View>

        <View style={[{ backgroundColor: colors.surface }, cardStyle]} className="rounded-md overflow-hidden">
          <Text style={{ color: colors.label }} className="text-title-3 font-semibold px-lg pt-lg">
            {t('legal.contact_title')}
          </Text>
          <ListItem onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} trailing={SUPPORT_EMAIL}>
            {t('legal.email_support')}
          </ListItem>
          <ListItem onPress={() => open(ISSUES_URL)}>{t('legal.report_issue')}</ListItem>
          <ListItem onPress={() => open(SOURCE_REPOSITORY_URL)}>{t('legal.source_code')}</ListItem>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
