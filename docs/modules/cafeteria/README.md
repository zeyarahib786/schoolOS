# Cafeteria

The released workspace shows saved recurring weekly dishes, scoped student wallets, immutable transaction entries and reviewed dietary care plans. Search, pagination, CSV export and responsive details use API records. Prototype sales counts, subscriptions, kitchen stock and certification claims are no longer presented as operating data.

Administrator, Principal and Accountant record actual top-ups and purchases. Parent and Student read only wallets/transactions belonging to linked students. Teacher sees the shared menu without financial or care-plan records. Care-plan management is Administrator/Principal only; families read current instructions without internal review history.

Wallet balance and ledger entry commit together in a MongoDB replica-set transaction. Student serialization protects first-use creation and concurrent spending. Amounts have at most two decimal places and a supported maximum; arithmetic uses integer cents before saving. A wallet-scoped optional request ID makes identical retries idempotent; changed details return 409. The UI supplies a request ID plus an actual recorded method/reference. These records do not initiate card payments or bank transfers. Legacy non-cent balances require reviewed reconciliation.

Existing care plans and dish corrections require the saved `expectedUpdatedAt` and reason. Previous care instructions/dishes remain in history. Menus are recurring Sunday–Thursday slots, not dated catering orders. Allergen labels and care instructions are school-entered records; the system does not claim automated allergy compatibility, halal certification, EpiPen availability or kitchen segregation.

Refunds/reversals, meal subscriptions, priced SKU checkout, stock purchasing, multiple currencies per wallet and nutrition-provider verification remain future capabilities. Do not delete ledger records to reconcile a discrepancy.

## Verification

See [browser workflows](../../../tests-e2e/cafeteria/README.md). Isolated fictional tests cover concurrent spending, duplicate receipts, exact decimal amounts, stale care-plan corrections and linked Student/Parent privacy. Deployment and external provider activation remain deferred.

Recorded verification: 15 integration tests, five unit tests and all 29 six-role browser cases passed. Both builds and targeted backend lint passed.
