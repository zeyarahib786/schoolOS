# Alumni

The released screen reads saved graduation records with full pagination, search, CSV export and responsive record details. Administrator, Principal and Teacher review graduation and profile changes. Parent/Student reads are limited to linked students; internal school notes and review history are withheld. Students can review their own contact profile; Parents are read-only and Accountants have no directory access.

Graduation requires explicit school-approved academic completion and a non-future graduation year. The UI previews active-student eligibility and captures the student version. The transaction serializes on the Student before rechecking unreturned library loans, transport assignments and hostel occupancy. Outstanding links block graduation and roll back all writes. Student status and the unique alumni profile commit together; simultaneous graduation cannot produce duplicate profiles.

Profile changes require a version and reason, preserve previous fields in dated actor history, and support explicit school-contact permission. Graduation year is immutable. Permission records do not send external messages or expose a public alumni directory. Mentorship, newsletters, networking events, financial clearance and automatic academic certification are not implemented by this release.

Verification: 10 integration tests and 19 browser cases across all six roles passed; no browser JavaScript exceptions. Both builds passed. See [browser instructions](../../../tests-e2e/alumni/README.md). Production deployment is deferred.
