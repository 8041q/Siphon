import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';

import { useDonations } from '../hooks/useDonations';
import { SUPPORT, DONATION_TIERS, type DonationTierId } from '../config/support';
import { Icon } from '../theme/Icon';
import { useThemeTokens } from '../hooks/useThemeTokens';
import { SheetBackground } from './ui/SheetBackground';
import { GlassBox } from './ui/GlassBox';

export type DonationSheetHandle = { present: () => void };

export const DonationSheet = forwardRef<DonationSheetHandle, object>(
  function DonationSheet(_props, ref) {
    const { t } = useTranslation();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['52%'], []);

    const { colors } = useThemeTokens();
    const {
      purchasing,
      lastResult,
      lastDonation,
      reset,
      products,
      loaded,
      purchase: purchaseDonation,
    } = useDonations();

    const [showThankYou, setShowThankYou] = useState(false);
    const thankYouTimeoutRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
    }));

    const handleOpen = useCallback((url: string) => {
      bottomSheetRef.current?.dismiss();
      Linking.openURL(url).catch(() => {});
    }, []);

    const handlePurchase = useCallback(
      async (tierId: DonationTierId) => {
        setShowThankYou(false);
        if (thankYouTimeoutRef.current) {
          clearTimeout(thankYouTimeoutRef.current);
          thankYouTimeoutRef.current = null;
        }
        const tier = DONATION_TIERS.find((t) => t.id === tierId);
        if (tier) {
          await purchaseDonation(tier.sku);
        }
      },
      [purchaseDonation, DONATION_TIERS],
    );

    // Auto-dismiss thank you message after 3 seconds
    // Also reset state to allow another purchase
    useEffect(() => {
      if (showThankYou) {
        thankYouTimeoutRef.current = setTimeout(() => {
          setShowThankYou(false);
          reset(); // Reset to idle state after thank you
        }, 3000);
      }
      return () => {
        if (thankYouTimeoutRef.current) {
          clearTimeout(thankYouTimeoutRef.current);
          thankYouTimeoutRef.current = null;
        }
      };
    }, [showThankYou, reset]);

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        handleStyle={{ marginVertical: 4 }}
        handleIndicatorStyle={{
          backgroundColor: colors.handleIndicator,
          width: 40,
          height: 5,
          borderRadius: 3,
          alignSelf: 'center',
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundComponent={SheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ color: colors.label }} className="text-title2 font-semibold mb-sm">
            {t('settings.donate_title')}
          </Text>
          <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-lg">
            {t('settings.donate_caption')}
          </Text>

          {/* Donation tiers section - only show if products are loaded or loading */}
          {loaded || purchasing && (
            <>
              {/* Loading state for donation products */}
              {!loaded && purchasing && (
                <View className="mb-md">
                  <GlassBox component="card" color={colors.fieldBackground} className="rounded-md">
                    <View className="flex-row items-center justify-between py-md px-sm">
                      <View className="flex-1">
                        <Text style={{ color: colors.label }} className="text-body font-semibold">
                          {t('settings.donate_loading')}
                        </Text>
                      </View>
                      <Text style={{ color: colors.tint }} className="text-body ml-sm">
                        ·
                      </Text>
                    </View>
                  </GlassBox>
                </View>
              )}

              {/* Error loading donation products */}
              {!loaded && lastResult === 'error' && (
                <View className="mb-md">
                  <GlassBox component="card" color={colors.fieldBackground} className="rounded-md">
                    <View className="flex-row items-center justify-between py-md px-sm">
                      <View className="flex-1">
                        <Text style={{ color: colors.label }} className="text-body font-semibold">
                          {t('settings.donate_failed_to_load')}
                        </Text>
                      </View>
                      <Text style={{ color: colors.tint }} className="text-body ml-sm">›</Text>
                    </View>
                  </GlassBox>
                </View>
              )}

              {/* Donation tiers (when loaded) */}
              {loaded && (
                <>
                  <Text style={{ color: colors.secondaryLabel }} className="text-footnote mb-sm">
                    {t('settings.donate_via_google_play')}
                  </Text>
                  {DONATION_TIERS.map((tier, idx) => {
                    const isPurchasing =
                      purchasing && lastResult === 'purchasing' && lastDonation?.productId === tier.sku;
                    const isSuccess =
                      lastResult === 'success' && lastDonation?.productId === tier.sku;
                    const isError =
                      lastResult === 'error';

                    return (
                      <View key={tier.id} className="mb-md">
                        <GlassBox component="card" color={colors.fieldBackground} className="rounded-md">
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handlePurchase(tier.id)}
                            disabled={purchasing && lastResult !== 'success'} // Disable if any purchase is in progress
                            className="flex-row items-center justify-between py-md px-sm rounded-md"
                          >
                            <View className="flex-row items-center flex-1">
                              <View className="w-10 h-10 rounded-full items-center justify-center mr-sm"
                                style={{ backgroundColor: colors.groupedBackground }}
                              >
                                <Icon name="gift" size={20} color={colors.tint} />
                              </View>
                              <View className="flex-1">
                                <Text style={{ color: colors.label }} className="text-body font-semibold">
                                  {t(tier.titleKey)}
                                </Text>
                                <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                                  {t(tier.captionKey)}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center">
                              {products[tier.sku] ? (
                                <Text style={{ color: colors.tint }} className="text-body">
                                  {products[tier.sku].displayPrice}
                                </Text>
                              ) : (
                                <Text style={{ color: colors.tint }} className="text-body">
                                  …
                                </Text>
                              )}
                              {(!purchasing || lastResult === 'success' || lastResult === 'error') && (
                                <Text style={{ color: colors.tint }} className="text-body ml-sm">›</Text>
                              )}
                              {purchasing && lastResult !== 'success' && lastResult !== 'error' && (
                                <Text style={{ color: colors.tint }} className="text-body ml-sm">
                                  ·
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                          {/* Status messages inside the GlassBox */}
                          {isPurchasing && (
                            <Text style={{ color: colors.tint }} className="text-caption2 px-sm pt-xs">
                              {t('settings.donate_processing')}
                            </Text>
                          )}
                          {isSuccess && (
                            <Text style={{ color: colors.tint }} className="text-caption2 px-sm pt-xs">
                              {t('settings.donate_thank_you')}
                            </Text>
                          )}
                          {isError && (
                            <Text style={{ color: colors.error }} className="text-caption2 px-sm pt-xs">
                              {t('settings.donate_error')}
                            </Text>
                          )}
                        </GlassBox>
                        {/* Separator between items (except last) */}
                        {idx < DONATION_TIERS.length - 1 && (
                          <View style={{ backgroundColor: colors.separator }} className="h-px my-sm" />
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* GitHub repo section (always show) */}
          <View key="github_repo" className="mb-md">
            <GlassBox component="card" color={colors.fieldBackground} className="rounded-md">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpen(SUPPORT.githubRepoUrl)}
                className="flex-row items-center justify-between py-md px-sm rounded-md"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-sm"
                    style={{ backgroundColor: colors.groupedBackground }}
                  >
                    <Icon name="github" size={20} color={colors.tint} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.label }} className="text-body font-semibold">
                      {t('settings.github_repo')}
                    </Text>
                    <Text style={{ color: colors.secondaryLabel }} className="text-footnote">
                      {t('settings.github_repo_caption')}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.tint }} className="text-body ml-sm">›</Text>
              </TouchableOpacity>
            </GlassBox>
            <Text style={{ color: colors.tertiaryLabel }} className="text-caption2 px-sm pt-xs">
              {t('settings.github_repo_fee')}
            </Text>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);