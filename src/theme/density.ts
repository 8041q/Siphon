export type DensityId = 'comfortable' | 'compact';

export const DEFAULT_DENSITY: DensityId = 'compact';

// Body text stays unchanged; controls apply density-specific sizing separately.
export const DENSITIES = {
  comfortable: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  compact: { xs: 3, sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, xxxl: 24 },
} as const;

export function normalizeDensity(value: string | null): DensityId {
  return value === 'comfortable' ? 'comfortable' : DEFAULT_DENSITY;
}

export function densityVariables(id: DensityId): Record<string, string> {
  return Object.fromEntries(Object.entries(DENSITIES[id]).map(([key, value]) => [`--space-${key}`, `${value}px`]));
}
