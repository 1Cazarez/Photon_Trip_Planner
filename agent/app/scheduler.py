"""In-process scheduler. All due work is derived from DB state, so restarts lose nothing.

Render must run exactly one instance, or every job runs twice.
"""

# TODO(J, #20): APScheduler jobs driven by notifications.send_at and flights.next_poll_at.
# TODO(J, #20): quiet hours 10pm-7am destination time (cancellations/diversions exempt).
# TODO(J, #20): 8am morning summary per member (today's plan, arrivals, weather, balances).
# TODO(J, #21): event reminders 1h before located events, with travel time.
# TODO(J, #22): pickup suggestions once per arrival cluster (same airport, within 45 min).
