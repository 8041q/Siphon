# UI review — 2 October 2026

The review covered Search, Favorites, station details, price history, Market,
vehicle editing and the EV comparison. Layouts, icon-only navigation and the
separate Home/Search filter behavior remain the constraints. Browser previews
exercise source components; they do not verify native Android blur or gestures.

## Changes made

- Light price colors are saturated green, orange and red, with at least 4.5:1
  text contrast on every supported palette surface. The earlier 7:1 target made
  the colors too close to black. Unsupported price comparisons use gray in
  light mode. Dark colors and benchmark calculations are unchanged.
- Vehicle and EV input fields now expose their visible labels to screen readers.
  Previously the input accessibility tree exposed values without field names.
- Market chart dates now align across the crude and retail series. Previously,
  441 crude observations from January 2025 and 61 retail observations from
  August 2026 were each stretched across the entire width. The chart now uses
  their shared history window, retains newer observations and spaces points by
  actual date. Prepared series are memoized and use existing cached data.
- The retail chart line and its legend now use dashes, so the two series remain
  distinguishable when a palette gives crude and retail similar hues.

## Recommended next changes

| Priority | Improvement | Evidence and scope | Space / performance |
|---|---|---|---|
| 1 | Explain price colors and distinguish them from recent trends | Station badges and the current-price statistic use the anchored market reference. `PriceIntelligenceCard` and `CheapDayBanner` compare a station with its own recent history. A recent low can still be expensive against the anchored reference. Clarify this in the existing history explainer; label gray as “reference unavailable.” | Reuse the existing explanation area; no new rows on station cards or requests. |
| 2 | Allow a custom maximum price | `FilterSheet` offers only 1.65, 1.87 and 2.00 presets. They become less useful as prices rise. Add an optional numeric maximum inside the existing price section, retaining the presets and separate Home/Search behavior. | One field inside the sheet; filtering stays local and indexed. |
| 3 | Make history empty states actionable | The history page displays text for disabled history, no observations and unknown stations. Storage read failures are also currently displayed as no history. Link disabled history to Settings and distinguish read errors with a local retry action. Explain that re-enabling downloads history on the next launch. | Actions appear only in empty/error states; no additional automatic requests. |
| 4 | Protect saved vehicle deletion | `VehicleSheet.handleRemove` immediately calls `onRemove`. Add a confirmation or Undo so a mistaken tap cannot silently remove the vehicle. | A native confirmation adds no permanent content. |
| 5 | Format Market's update date for the active language | The header currently prints the complete ISO timestamp, including fractional seconds and the offset. Show a readable local date/time instead. | Replace the existing text; no new row or request. |

## Useful new features to consider

- **Export and restore local data:** favorites, vehicles and EV scenarios. Put
  these actions in Settings and run file work only on demand. This would protect
  user-entered data before reinstalling or changing devices, without accounts.
- **Separate feed freshness for Spain:** Spanish station records have no
  individual update time. A clearly labeled feed date could occupy the existing
  timestamp footnote at the bottom of station details, using cached manifest
  metadata. It must not be presented as a station's last price change.

Implement the small clarity and recovery changes before either new feature.
No additional features were added as part of this review.
