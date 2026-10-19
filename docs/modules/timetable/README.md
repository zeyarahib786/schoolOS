# Timetable

Saved class sections and saved periods drive the class list. Subject and teacher fields accept the actual assignment; substitute assignment asks for the covering teacher instead of selecting a prototype name. Server checks guard conflicting teacher/room periods and publication. Highlights follow the configured school timezone, including weekends without a false weekday highlight. Publication saves the schedule; it does not claim notification delivery.

Administrator, Principal and Teacher can maintain periods and publish. Other authenticated roles can consult schedules; publication controls are hidden. The existing read API includes draft periods, so publication is a workflow state rather than a family-access boundary. Scheduling days and period numbers retain the existing Monday–Friday/eight-period model; fully configurable bell schedules require separate work.

Local verification: 18 six-role browser cases cover real sections, saved assignments, explicitly chosen substitutes, publication and Arabic preservation. Existing backend integrations cover create/update/remove, conflicts and publication. See [testing](../../../tests-e2e/timetable/README.md).
