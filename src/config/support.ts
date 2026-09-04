export const SUPPORT = {
  githubRepoUrl: 'https://github.com/8041q/Siphon',
} as const;

export type DonationTierId = 'small' | 'medium' | 'large';

export interface DonationTier {
  id: DonationTierId;
  sku: string;
  titleKey: string;
  captionKey: string;
}

/**
 * One-time consumable donation products sold via Google Play Billing (and
 * App Store on iOS). These SKUs must match the product IDs created in the
 * Google Play Console (Monetize > Products > In-app products) and App Store
 * Connect (In-App Purchases). Consumable so supporters can donate repeatedly.
 */
export const DONATION_TIERS: DonationTier[] = [
  {
    id: 'small',
    sku: 'com.ctr_8041q.siphon.donation.small',
    titleKey: 'settings.donate_small',
    captionKey: 'settings.donate_small_caption',
  },
  {
    id: 'medium',
    sku: 'com.ctr_8041q.siphon.donation.medium',
    titleKey: 'settings.donate_medium',
    captionKey: 'settings.donate_medium_caption',
  },
  {
    id: 'large',
    sku: 'com.ctr_8041q.siphon.donation.large',
    titleKey: 'settings.donate_large',
    captionKey: 'settings.donate_large_caption',
  },
];

export const DONATION_SKUS = DONATION_TIERS.map((tier) => tier.sku);