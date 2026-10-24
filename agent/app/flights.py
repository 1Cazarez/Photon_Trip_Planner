"""Flight status polling and change detection (spec §9)."""

# TODO(J, #15): choose provider (AeroDataBox / AviationStack / FlightAware) after checking
#   free-tier limits.
# TODO(J, #15): poll opted-in members only, cadence via flights.next_poll_at:
#   >24h out every 6h; 24h-3h every 30m; 3h-landing every 5m; stop after landing.
# TODO(J, #15): compare against flights.last_announced (not the last poll). Alert on a change
#   of 15 min or more, a gate change within 3h, cancellation, or diversion; coalesce to one
#   post per flight per 20 min.
