// ─── UI Tokens ─────────────────────────────────────────────────────────────────
// App chrome: backgrounds, text, buttons, inputs, sheets, separators, tabs.
// Independent from station/pricing — changing these never affects station visuals.

export const ui = {
  light: {
    // ── Backgrounds ────────────────────────────────────────────────
    /** App root background */
    background: '#FFFFFF',
    /** Grouped list / card container background */
    groupedBackground: '#F2F2F7',
    /** Elevated surface (cards, sheet bodies, modal backgrounds) */
    surface: '#F8F4F4',
    /** Bottom sheet background (distinct from surface when needed) */
    sheet: '#FFFFFF',

    // ── Text ──────────────────────────────────────────────────────
    /** Primary text */
    label: '#000000',
    /** Secondary text */
    secondaryLabel: 'rgba(60, 60, 67, 0.8)',
    /** Tertiary / caption text */
    tertiaryLabel: 'rgba(93, 93, 109, 0.8)',
    /** Text on primary tint background (buttons, chips) */
    labelOnTint: '#FFFFFF',

    // ── Decorative ────────────────────────────────────────────────
    /** Separator lines, borders */
    separator: 'rgba(60, 60, 67, 0.21)',
    /** Primary action accent (buttons, active tabs, selected state) */
    tint: '#0C8599',
    /** Destructive action (delete, remove) */
    destructive: '#FF3B30',

    // ── Inputs ────────────────────────────────────────────────────
    /** Input field background */
    fieldBackground: '#FFFFFF',
    /** Input field border */
    fieldBorder: 'rgba(60, 60, 67, 0.21)',
    /** Input / field placeholder text color */
    placeholder: 'rgba(60, 60, 67, 0.3)',

    // ── Bottom sheet drag handle ─────────────────────────────────
    /** Bottom sheet drag handle indicator */
    handleIndicator: 'rgba(60, 60, 67, 0.3)',

    // ── Other ─────────────────────────────────────────────────────
    /** Error state */
    error: '#FF3B30',
  },

  dark: {
    // ── Backgrounds ────────────────────────────────────────────────
    /** App root background */
    background: '#1C1C1E',
    /** Grouped list / card container background */
    groupedBackground: '#2C2C2E',
    /** Elevated surface */
    surface: '#3A3A3C',
    /** Bottom sheet background */
    sheet: '#1C1C1E',

    // ── Text ──────────────────────────────────────────────────────
    /** Primary text */
    label: '#FFFFFF',
    /** Secondary text */
    secondaryLabel: 'rgba(235, 235, 245, 0.75)',
    /** Tertiary / caption text */
    tertiaryLabel: 'rgba(235, 235, 245, 0.5)',
    /** Text on primary tint background */
    labelOnTint: '#FFFFFF',

    // ── Decorative ────────────────────────────────────────────────
    /** Separator lines / borders */
    separator: 'rgba(84, 84, 88, 0.6)',
    /** Primary action accent */
    tint: '#22B8CD',
    /** Destructive action */
    destructive: '#FF453A',

    // ── Inputs ────────────────────────────────────────────────────
    /** Input field background */
    fieldBackground: '#3A3A3C',
    /** Input field border */
    fieldBorder: 'rgba(84, 84, 88, 0.6)',
    /** Input / placeholder text */
    placeholder: 'rgba(235, 235, 245, 0.5)',

    // ── Bottom sheet drag handle ─────────────────────────────────
    /** Bottom sheet drag handle indicator */
    handleIndicator: 'rgba(235, 235, 245, 0.5)',

    // ── Other ─────────────────────────────────────────────────────
    /** Error state */
    error: '#FF453A',
  },
} as const;

// ============================================================================
// Station / Price Tokens
// ============================================================================
// Independent from UI tokens — changing these never affects app chrome.

export const station = {
  light: {
    // ── Map ───────────────────────────────────────────────────────
    /** Station pin color on map */
    pin: '#0C8599',
    /** Map pin stroke */
    pinStroke: 'rgba(255, 255, 255, 0.5)',

    // ── Price badges ─────────────────────────────────────────────
    /** Low price indicator */
    priceLow: '#22A559',
    /** Low price tint background (badges, stats) */
    priceLowTint: 'rgba(34, 165, 89, 0.1)',
    /** Mid range price indicator */
    priceMid: '#F2A93B',
    /** High price indicator */
    priceHigh: '#E5484D',
    /** High price tint background */
    priceHighTint: 'rgba(229, 72, 77, 0.1)',

    // ── Worth-the-drive banner ───────────────────────────────────
    /** Savings label green */
    worthItText: '#22A559',
    /** Savings background */
    worthItBg: 'rgba(34, 165, 89, 0.1)',
    /** Not worth label red */
    notWorthText: '#E5484D',
    /** Not worth background */
    notWorthBg: 'rgba(229, 72, 77, 0.1)',

    // ── Favorite star ────────────────────────────────────────────
    /** Favorited station star fill */
    favorite: '#FFD60A',

    // ── Price Chart ──────────────────────────────────────────────
    /** Chart data line */
    chartLine: '#0C8599',
    /** Chart grid line / axis */
    chartGrid: 'rgba(60, 60, 67, 0.21)',
    /** Chart axis label text */
    chartLabel: 'rgba(60, 60, 67, 0.8)',
    /** Chart data point dot */
    chartDot: '#0C8599',

    // ── Weekday Radar ────────────────────────────────────────────
    /** Radar polygon fill+stroke */
    radarLine: '#0C8599',
    /** Radar non-best day dot */
    radarDot: 'rgba(60, 60, 67, 0.8)',
    /** Radar best day dot+label */
    radarBest: '#0C8599',
    /** Radar ring / axis */
    radarGrid: 'rgba(60, 60, 67, 0.21)',
    /** Radar day label */
    radarLabel: 'rgba(60, 60, 67, 0.8)',

    // ── Cheap Day Banner ─────────────────────────────────────────
    /** Day banner background */
    dayBannerBg: '#34C759',
    /** Day banner text */
    dayBannerText: '#FFFFFF',
  },

  dark: {
    // ── Map ───────────────────────────────────────────────────────
    /** Station pin color on map */
    pin: '#22B8CD',
    /** Map pin stroke */
    pinStroke: 'rgba(255, 255, 255, 0.5)',

    // ── Price badges ─────────────────────────────────────────────
    /** Low price indicator */
    priceLow: '#30D158',
    /** Low price action background */
    priceLowTint: 'rgba(48, 209, 88, 0.1)',
    /** Mid range price indicator */
    priceMid: '#FFD60A',
    /** High price indicator */
    priceHigh: '#FF453A',
    /** High price action background */
    priceHighTint: 'rgba(255, 69, 58, 0.1)',

    // ── Worth-the-drive discount badge ───────────────────────────
    /** "Worth it" text */
    worthItText: '#30D158',
    /** "Worth it" background */
    worthItBg: 'rgba(48, 209, 88, 0.1)',
    /** "Not worth" text */
    notWorthText: '#FF453A',
    /** "Not worth" background */
    notWorthBg: 'rgba(255, 69, 58, 0.1)',

    // ── Favorite star ──────────────────────────────────────────
    /** Favorited station star */
    favorite: '#FFD60A',

    // ── Price Chart ──────────────────────────────────────────────
    /** Chart data line */
    chartLine: '#22B8CD',
    /** Chart grid line / axis */
    chartGrid: 'rgba(84, 84, 88, 0.6)',
    /** Chart axis label text */
    chartLabel: 'rgba(235, 235, 245, 0.75)',
    /** Chart data point dot */
    chartDot: '#22B8CD',

    // ── Weekday Radar ────────────────────────────────────────────
    /** Radar polygon fill+stroke */
    radarLine: '#22B8CD',
    /** Radar non-best day dot */
    radarDot: 'rgba(235, 235, 245, 0.75)',
    /** Radar best day dot+label */
    radarBest: '#22B8CD',
    /** Radar ring / axis */
    radarGrid: 'rgba(84, 84, 88, 0.6)',
    /** Radar day label */
    radarLabel: 'rgba(235, 235, 245, 0.75)',

    // ── Cheap Day Banner ─────────────────────────────────────────
    /** Day banner background */
    dayBannerBg: '#30D158',
    /** Day banner text */
    dayBannerText: '#FFFFFF',
  },
} as const;

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

/** @deprecated Use `ui` and `station` directly. */
export const color = {
  light: {
    ...ui.light,
    ...station.light,
  },
  dark: {
    ...ui.dark,
    ...station.dark,
  },
} as const;

/** @deprecated Legacy bundle. Use `ui` and `station` directly. */
export const tokens = {
  ui,
  station,
  color,
  spacing,
  typography,
  radius,
};