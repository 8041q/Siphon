export const color = {
  light: {
    background: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    surface: '#FFFFFF',
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.8)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.8)',
    separator: 'rgba(60, 60, 67, 0.21)',
    tint: '#0C8599',
    priceLow: '#22A559',
    priceLowTint: 'rgba(34, 165, 89, 0.1)',
    priceMid: '#F2A93B',
    priceHigh: '#E5484D',
    priceHighTint: 'rgba(229, 72, 77, 0.1)',
    destructive: '#FF3B30',
    error: '#FF3B30',
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(60, 60, 67, 0.21)',
  },
  dark: {
    background: '#1C1C1E',
    groupedBackground: '#2C2C2E',
    surface: '#3A3A3C',
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.75)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.5)',
    separator: 'rgba(84, 84, 88, 0.6)',
    tint: '#22B8CD',
    priceLow: '#30D158',
    priceLowTint: 'rgba(48, 209, 88, 0.1)',
    priceMid: '#FFD60A',
    priceHigh: '#FF453A',
    priceHighTint: 'rgba(255, 69, 58, 0.1)',
    destructive: '#FF453A',
    error: '#FF453A',
    fieldBackground: '#3A3A3C',
    fieldBorder: 'rgba(84, 84, 88, 0.6)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  largeTitle: { size: 34, weight: 'bold' } as const,
  title1: { size: 28, weight: 'bold' } as const,
  title2: { size: 22, weight: 'bold' } as const,
  title3: { size: 20, weight: '600' } as const,
  headline: { size: 17, weight: '600' } as const,
  body: { size: 17, weight: '400' } as const,
  callout: { size: 16, weight: '400' } as const,
  subheadline: { size: 15, weight: '400' } as const,
  footnote: { size: 13, weight: '400' } as const,
  caption1: { size: 12, weight: '400' } as const,
  caption2: { size: 11, weight: '400' } as const,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const tokens = {
  color,
  spacing,
  typography,
  radius,
};