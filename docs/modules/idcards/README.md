# ID Cards

The released registry provides full saved-card reads, search/state filters, pagination, CSV export, responsive details and authenticated record PDFs. Administrator, Principal and Teacher manage issuance/revocation. Parent/Student reads only cards for linked students; Accountant reads only their linked Staff cards. Owned holders can report a current card lost, but cannot issue or revoke another holder's card.

Issuance rechecks Active holder status inside a replica-set transaction, allocates the serial and inserts the card together. The partial unique Active-holder index prevents duplicate active cards. Replacing a Lost/Revoked card links the most recent inactive issuance. Existing expired Active cards require explicit lost/revoke review before replacement; expiry never silently deletes a card.

Valid-through dates are real calendar days, inclusive of the configured school day. Expired is derived from an Active card's expiry date; status filtering excludes expired cards from valid Active results. Lost/revoke actions optionally check expectedUpdatedAt and append dated actor/action/reason history. The UI always records version/reason. Legacy API callers retain atomic Active-state protection.

PDFs are branded authenticated registry copies with holder reference, serial, dates and current validity/state. They are unsigned and do not encode RFID/gate access. Lost/Revoked/Expired records remain clearly labelled. Physical card-size layouts, authorized photo snapshots, digital signing, secure public QR verification and access-controller integrations remain future capabilities. No badge printer or device encoding is claimed.

See [historical verification](testing.md) and [current browser workflows](../../../tests-e2e/idcards/README.md). Production deployment remains deferred.

Recorded verification: all 15 integration tests and 21 six-role browser cases passed, with zero JavaScript exceptions. Both builds and targeted lint passed.
