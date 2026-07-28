export const color = {
  light: {
    background: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    surface: '#FFFFFF',
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.6)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
    separator: 'rgba(60, 60, 67, 0.21)',
    tint: '#0C8599',
    priceLow: '#22A559',
    priceMid: '#F2A93B',
    priceHigh: '#E5484D',
    destructive: '#FF3B30',
    error: '#FF3B30',
    fieldBackground: '#FFFFFF',
    fieldBorder: 'rgba(60, 60, 67, 0.21)',
  },
  dark: {
    background: '#000000',
    groupedBackground: '#000000',
    surface: '#1C1C1E',
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.6)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
    separator: 'rgba(84, 84, 88, 0.6)',
    tint: '#22B8CD',
    priceLow: '#30D158',
    priceMid: '#FFD60A',
    priceHigh: '#FF453A',
    destructive: '#FF453A',
    error: '#FF453A',
    fieldBackground: '#1C1C1E',
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