"""DM hub mode: simulate the group by sending shared updates to every joined member."""

# TODO(J, #14): broadcast(trip_id, text, exclude_member_id=None, attribution=None)
#   - write one outbound/notifications row per recipient (dedupe_key) before sending
#   - attribute changes: "Jo moved dinner to 8:00"
#   - format times per recipient via app.timezones (#16)
