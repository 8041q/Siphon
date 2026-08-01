# Price Trends Page Upgrade — Roadmap

Goal: make `app/price-trends/[id].tsx` a proper analytics page instead of a bare line chart, and lay the groundwork for smarter fuel-pricing features.

## Phase 1 — client-only, on the price-trends screen (implemented)

Pure on-device analysis of the cached 90-day history. No backend changes.

- **Header fix** — replace the address line under the station name with the station's **city + distance from the user** (both already computed: `getLocationParts()` + `stationDistances`). Address is redundant here because the user came from the station detail sheet.
- **Stats row** — Current, 7d change, 30d change, Min, Max, Avg. Computed from the `PriceHistoryPoint[]` array.
- **Cheap-day banner** — "Fill up today!" when the current price is a 30-day low or dropped ≥3% in the last 7 days. In-app only (no push — that needs the backend, see Phase 3).
- **Weekday cycle radar** — radial chart of average price per weekday (Mon–Sun) with a "best day to fill up" callout. Gated on **≥14 points** (own threshold, unrelated to the forecast gate).
- **Price forecast (3 & 7 days)** — custom lightweight model, gated on **≥80 days of history**:
  - "Days of history" = calendar span between first and last data point, inclusive (`(last − first) in days + 1`).
  - Below 80 days the card renders a **locked state** with a countdown: "Price forecasts unlock after 80 days of history for this station — X days to go." No model runs, no degraded forecast.
  - At ≥80 days: linear regression on the last 30 points (trend) + per-weekday seasonality + momentum, clamped to stay within historical min/max ±20%. Confidence (high/medium/low) derived from regression residuals — only meaningful now that the gate guarantees a full window. Renders with a disclaimer.

### Files

- `src/utils/priceAnalysis.ts` — pure helpers: `historyCoverageDays`, `statsFor`, `weekdayCycle`, `forecast`, `isCheapDay`
- `src/components/PriceStats.tsx`
- `src/components/WeekdayRadar.tsx`
- `src/components/PriceForecast.tsx`
- `src/components/CheapDayBanner.tsx`
- `src/components/PriceChart.tsx` — optional dashed forecast overlay
- `app/price-trends/[id].tsx` — header + composition
- i18n keys in all 5 locales

## Phase 2 — settings + smart features (implemented)

- **My Vehicles** in Settings: per car — name, fuel type, consumption (L/100km), tank size. Multiple cars supported; persisted in AsyncStorage (`siphon:vehicles`) and sanitized on load (bad entries are dropped). Add / edit / delete via a bottom-sheet form with live validation (name required + max 30 chars, consumption 0.1–60, tank 1–300; save disabled until valid).
- **Worth-the-drive card** (`WorthTheDrive.tsx`) on the station detail sheet and the price-trends screen (filtered to the selected fuel): round-trip driving cost given distance + consumption, CO₂ per full tank, and a comparison against the cheapest nearby same-fuel station ("worth it / not worth it").
- **CO₂ per tank** — kg CO₂ per tank using well-to-wheel factors per fuel (≈2.39 gasoline, ≈2.68 diesel, etc.).
- **EV vs Gas breakeven** — settings calculator (electricity €/kWh, EV kWh/100km, gas L/100km, gas €/L, EV price premium, annual km) computing annual gas vs EV cost and break-even years. Persisted as `siphon:evConfig`, validated like the vehicle form.
- **Validation** — numeric fields accept dot decimals only (`.`, no comma). A non-empty malformed value shows an "invalid number" error distinct from "required".
- **Persistence across cache clears** — vehicles (`siphon:vehicles`) and EV config (`siphon:evConfig`) are stored via AsyncStorage directly, in a namespace untouched by `clearHistoryCache()` (Settings "Save price history" off), which only deletes `siphon:history:*` files + the history index ETag. Vehicle/EV data survives cache clears.
- **Deletion** — vehicles are removed only from the edit sheet's "Remove vehicle" button (`onRemove` → `removeVehicle`); the settings list has no other delete affordance.

### Phase 2 files

- `src/utils/vehicles.ts` — `Vehicle`, `EvConfig`, CO₂ factors, parsing/validation, cost & breakeven math
- `src/hooks/useVehicles.ts`, `src/hooks/useEvConfig.ts` — persistence + sanitization
- `src/components/ui/field.tsx` — labeled input with inline error
- `src/components/VehicleSheet.tsx`, `src/components/EvBreakevenSheet.tsx` — validated forms
- `src/components/WorthTheDrive.tsx` — drive cost / CO₂ / worth-the-drive
- `app/(tabs)/settings.tsx` — vehicles + EV sections
- `src/components/StationDetailSheet.tsx`, `app/price-trends/[id].tsx` — card wiring

## Phase 3 — requires the companion SiphonAPI repo (not yet built)

- **Commodity dashboard** — publish daily crude spot prices (Brent/WTI) as static files; overlay retail pump prices and compute the "rocket and feather" lag in Python.
- **Real push notifications** for price dips (server-side daily monitor + expo-notifications).

### What needs to be prepared (SiphonAPI side)

1. **Crude price source (free)** — FRED API key (`DCOILBRENTEU` = Brent, `DCOILWTICO` = WTI, daily USD/barrel) or the EIA Open Data API. No subscription needed.
2. **Daily fetch job** — a GitHub Actions cron in SiphonAPI that appends each day's Brent/WTI close to `data/commodities/crude.json` (`[{date, brent, wti}]`).
3. **Daily analysis** — a Python step computing, over a rolling window: lag/correlation between crude and national-average retail pump prices, plus "rocket & feather" coefficients (piecewise up-vs-down response). Output `data/commodities/analysis.json`.
4. **Manifest wiring** — add both files to the root manifest like `history` so the app's existing ETag/hash sync fetches them with zero requests when unchanged.
5. **Client (Phase 3 app work)** — a screen/card rendering a normalized dual-series chart (crude vs retail) + a lag/asymmetry metric card, reusing `PriceChart` patterns.
6. **Push notifications (separate decision)** — easiest: Telegram bot / Pushover / n8n workflow reading the daily files. Full in-app push needs Expo Push Notifications + a device-token registration endpoint (real backend, not static files).
