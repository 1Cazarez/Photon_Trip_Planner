"""Per-member current zone and recipient-zone formatting (spec §7)."""

from zoneinfo import ZoneInfo

UTC = ZoneInfo("UTC")

# TODO(J, #16): current_zone(member, now). Home zone until the outbound flight lands,
#   destination zone during the trip, home zone again after the return flight lands.
# TODO(J, #16): format_time(utc_dt, recipient). Every outbound DM uses the recipient's zone.
#   Unit-test DST transitions and date-line crossings.
