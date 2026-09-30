export function monetizationEnabledFrom(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * Monetization is intentionally opt-in. Release profiles set this to false
 * until Siphon has written permission for commercial use of DGEG data.
 */
export const MONETIZATION_ENABLED = monetizationEnabledFrom(
  process.env.EXPO_PUBLIC_MONETIZATION_ENABLED,
);

export function appearanceUnlocked(
  monetizationEnabled: boolean,
  earnedUnlock: boolean,
): boolean {
  return !monetizationEnabled || earnedUnlock;
}
