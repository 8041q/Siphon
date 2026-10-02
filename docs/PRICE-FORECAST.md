# Station price forecast

The dedicated forecast card follows the weekday cycle in Price History. It shows separate 3-day and 7-day estimates, units, indicative ranges, and historical accuracy. Model details are expandable. Dates explicitly refer to the last history observation and each forecast target. Market pressure is context only and does not alter the station estimates.

## Calculation and validation

- Keep the 80-calendar-day eligibility gate. API snapshots are sparse when published prices do not change, so existing daily carry-forward behavior is preserved.
- Require at least 35 training days for each historical prediction. Score the latest 18 completed forecasts per horizon, using only observations available before each target. This works inside the client's 90-day history window; the old 80-day training requirement could not accumulate five 7-day validation targets within that window.
- Compare the trend/weekday model's mean absolute error with a last-price-unchanged baseline. Use the approach with lower recent historical error; ties favor the baseline.
- Detrend weekday averages and project the recent median from its window midpoint, so smoothing does not erase a consistent trend.
- Use the worse of overall validation error and the last five errors for accuracy classification and direction. Relative errors up to 1.2%, 2.5%, and 5% map to high, medium, and low historical accuracy. Above 5%, suppress that horizon. These labels describe recent historical errors, not probabilities of future correctness.
- The indicative half-range is the maximum of the recent 90th-percentile absolute miss, daily volatility scaled by the square root of the horizon, and a €0.005 floor. This is not a calibrated prediction interval. Describe movements within typical error or €0.005 as approximately unchanged.

All calculations are local and bounded. No new API requests or persisted data are introduced. Synthetic regression tests cover eligibility, baseline selection, predictable trends, recent instability, sparse snapshots, target dates, and UI states. They do not establish forecast accuracy on unseen real station data.
