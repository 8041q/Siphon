// ─── UI Tokens ─────────────────────────────────────────────────────────────────
// App chrome: backgrounds, text, buttons, inputs, sheets, separators, tabs.
// Independent from station/pricing — changing these never affects station visuals.

export const ui = {
  light: {
    // ── Backgrounds ────────────────────────────────────────────────
    /** App root background */
    background: '#FFFFFF',
    /** Grouped list / card container background */
    groupedBackground: '#EDF4F5',
    /** Elevated surface (cards, sheet bodies, modal backgrounds) */
    surface: '#F6FAFB',
    /** Bottom sheet background (distinct from surface when needed) */
    sheet: '#FFFFFF',

    // ── Text ──────────────────────────────────────────────────────
    /** Primary text */
    label: '#0B1F22',
    /** Secondary text */
    secondaryLabel: 'rgba(11, 31, 34, 0.68)',
    /** Tertiary / caption text */
    tertiaryLabel: 'rgba(11, 31, 34, 0.48)',
    /** Text on primary tint background (buttons, chips) */
    labelOnTint: '#FFFFFF',

    // ── Decorative ────────────────────────────────────────────────
    /** Separator lines, borders */
    separator: 'rgba(11, 31, 34, 0.14)',
    /** Primary action accent (buttons, active tabs, selected state) */
    tint: '#0C8599',
    /** Destructive action (delete, remove) */
    destructive: '#E24C4C',

    // ── Inputs ────────────────────────────────────────────────────
    /** Input field background */
    fieldBackground: '#FFFFFF',
    /** Input field border */
    fieldBorder: 'rgba(11, 31, 34, 0.16)',
    /** Input / field placeholder text color */
    placeholder: 'rgba(11, 31, 34, 0.35)',

    // ── Bottom sheet drag handle ─────────────────────────────────
    /** Bottom sheet drag handle indicator */
    handleIndicator: 'rgba(11, 31, 34, 0.28)',

    // ── Other ─────────────────────────────────────────────────────
    /** Error state */
    error: '#E24C4C',
  },

  dark: {
    // ── Backgrounds ────────────────────────────────────────────────
    /** App root background */
    background: '#0D1717',
    /** Grouped list / card container background */
    groupedBackground: '#142222',
    /** Elevated surface */
    surface: '#1B2C2C',
    /** Bottom sheet background */
    sheet: '#0D1717',

    // ── Text ──────────────────────────────────────────────────────
    /** Primary text */
    label: '#F1FAFA',
    /** Secondary text */
    secondaryLabel: 'rgba(241, 250, 250, 0.72)',
    /** Tertiary / caption text */
    tertiaryLabel: 'rgba(241, 250, 250, 0.5)',
    /** Text on primary tint background */
    labelOnTint: '#FFFFFF',

    // ── Decorative ────────────────────────────────────────────────
    /** Separator lines / borders */
    separator: 'rgba(148, 196, 196, 0.28)',
    /** Primary action accent */
    tint: '#22B8CD',
    /** Destructive action */
    destructive: '#FF6259',

    // ── Inputs ────────────────────────────────────────────────────
    /** Input field background */
    fieldBackground: '#1B2C2C',
    /** Input field border */
    fieldBorder: 'rgba(148, 196, 196, 0.28)',
    /** Input / placeholder text */
    placeholder: 'rgba(241, 250, 250, 0.46)',

    // ── Bottom sheet drag handle ─────────────────────────────────
    /** Bottom sheet drag handle indicator */
    handleIndicator: 'rgba(241, 250, 250, 0.42)',

    // ── Other ─────────────────────────────────────────────────────
    /** Error state */
    error: '#FF6259',
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
    /** Station open marker halo/dot */
    markerOpen: '#1E9E67',
    /** Station closed marker halo/dot */
    markerClosed: '#E24C4C',
    /** Station status unknown marker halo/dot */
    markerUnknown: 'rgba(120, 130, 135, 0.9)',
    /** Marker price label text */
    markerPriceText: '#0B1F22',
    /** Marker price label halo */
    markerPriceHalo: '#FFFFFF',
    /** Station marker pin body fill */
    markerBody: '#FFFFFF',

    // ── Price badges ─────────────────────────────────────────────
    /** Low price indicator */
    priceLow: '#1E9E67',
    /** Low price tint background (badges, stats) */
    priceLowTint: 'rgba(30, 158, 103, 0.1)',
    /** Mid range price indicator */
    priceMid: '#DB9A2B',
    /** High price indicator */
    priceHigh: '#E24C4C',
    /** High price tint background */
    priceHighTint: 'rgba(226, 76, 76, 0.1)',

    // ── Worth-the-drive banner ───────────────────────────────────
    /** Savings label green */
    worthItText: '#1E9E67',
    /** Savings background */
    worthItBg: 'rgba(30, 158, 103, 0.1)',
    /** Not worth label red */
    notWorthText: '#E24C4C',
    /** Not worth background */
    notWorthBg: 'rgba(226, 76, 76, 0.1)',

    // ── Favorite star ────────────────────────────────────────────
    /** Favorited station star fill */
    favorite: '#FFD60A',

    // ── Price Chart ──────────────────────────────────────────────
    /** Chart data line */
    chartLine: '#0C8599',
    /** Chart grid line / axis */
    chartGrid: 'rgba(11, 31, 34, 0.14)',
    /** Chart axis label text */
    chartLabel: 'rgba(11, 31, 34, 0.68)',
    /** Chart data point dot */
    chartDot: '#0C8599',

    // ── Weekday Radar ────────────────────────────────────────────
    /** Radar polygon fill+stroke */
    radarLine: '#0C8599',
    /** Radar non-best day dot */
    radarDot: 'rgba(11, 31, 34, 0.68)',
    /** Radar best day dot+label */
    radarBest: '#0C8599',
    /** Radar ring / axis */
    radarGrid: 'rgba(11, 31, 34, 0.14)',
    /** Radar day label */
    radarLabel: 'rgba(11, 31, 34, 0.68)',

    // ── Cheap Day Banner ─────────────────────────────────────────
    /** Day banner background */
    dayBannerBg: '#1E9E67',
    /** Day banner text */
    dayBannerText: '#FFFFFF',
  },

  dark: {
    // ── Map ───────────────────────────────────────────────────────
    /** Station pin color on map */
    pin: '#22B8CD',
    /** Map pin stroke */
    pinStroke: 'rgba(255, 255, 255, 0.5)',
    /** Station open marker halo/dot */
    markerOpen: '#3BCB8E',
    /** Station closed marker halo/dot */
    markerClosed: '#FF6259',
    /** Station status unknown marker halo/dot */
    markerUnknown: 'rgba(170, 180, 185, 0.9)',
    /** Marker price label text */
    markerPriceText: '#F1FAFA',
    /** Marker price label halo */
    markerPriceHalo: '#0D1717',
    /** Station marker pin body fill */
    markerBody: '#FFFFFF',

    // ── Price badges ─────────────────────────────────────────────
    /** Low price indicator */
    priceLow: '#3BCB8E',
    /** Low price action background */
    priceLowTint: 'rgba(59, 203, 142, 0.12)',
    /** Mid range price indicator */
    priceMid: '#F2C34D',
    /** High price indicator */
    priceHigh: '#FF6259',
    /** High price action background */
    priceHighTint: 'rgba(255, 98, 89, 0.12)',

    // ── Worth-the-drive discount badge ───────────────────────────
    /** "Worth it" text */
    worthItText: '#3BCB8E',
    /** "Worth it" background */
    worthItBg: 'rgba(59, 203, 142, 0.12)',
    /** "Not worth" text */
    notWorthText: '#FF6259',
    /** "Not worth" background */
    notWorthBg: 'rgba(255, 98, 89, 0.12)',

    // ── Favorite star ──────────────────────────────────────────
    /** Favorited station star */
    favorite: '#FFD60A',

    // ── Price Chart ──────────────────────────────────────────────
    /** Chart data line */
    chartLine: '#22B8CD',
    /** Chart grid line / axis */
    chartGrid: 'rgba(148, 196, 196, 0.28)',
    /** Chart axis label text */
    chartLabel: 'rgba(241, 250, 250, 0.72)',
    /** Chart data point dot */
    chartDot: '#22B8CD',

    // ── Weekday Radar ────────────────────────────────────────────
    /** Radar polygon fill+stroke */
    radarLine: '#22B8CD',
    /** Radar non-best day dot */
    radarDot: 'rgba(241, 250, 250, 0.72)',
    /** Radar best day dot+label */
    radarBest: '#22B8CD',
    /** Radar ring / axis */
    radarGrid: 'rgba(148, 196, 196, 0.28)',
    /** Radar day label */
    radarLabel: 'rgba(241, 250, 250, 0.72)',

    // ── Cheap Day Banner ─────────────────────────────────────────
    /** Day banner background */
    dayBannerBg: '#3BCB8E',
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