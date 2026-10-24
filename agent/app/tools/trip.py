"""Trip tools the LLM can call. Each validates input and writes to Supabase (spec §5.3)."""

# TODO(J, #13): upsert_flight(member, airline, number, date). Look up via app.flights, store.
# TODO(J, #13): upsert_event(title, start, end?, location?, attendees?), update_event(id, fields)
# TODO(J, #13): upsert_reservation(kind, name, address, start, end, confirmation_code?)
# TODO(J, #13): ask_clarification(question). Never guess on ambiguous edits.
# TODO(J, #17): delete_event(id), request_confirmation(payload, prompt), undo (10 min),
#   write event_history on every change.
# TODO(J, #15): set_tracking(member, on|off). "stop tracking me" works immediately.
