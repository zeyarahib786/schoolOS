# Inventory

The released staff workspace loads saved stock and purchase orders, with search, low-stock/status filters, pagination, CSV export and responsive details. Administrator, Principal, Teacher and Accountant manage inventory. Parent/Student cannot access procurement APIs or controls.

Items retain SKU, opening quantity, reorder level, unit cost, supplier, storage location and condition. Metadata inspection requires version/reason and preserves previous fields without changing quantity. Explicit stock movements record signed integer quantity, type, actor and reason/destination. A movement is not silently presented as a physical stock count. Negative stock is prevented atomically; the UI supplies the saved version to reject stale adjustments.

Purchase orders record supplier, unique reference, real optional expected delivery day, notes and unique item lines with two-decimal unit costs. Draft can become Sent/Cancelled, Sent can become Received/Cancelled, and terminal states cannot be reopened. Sent means a staff-recorded dispatch confirmation; this module does not email suppliers. UI transitions require saved version and confirmation reason. Legacy endpoints still allow an omitted version/reason but always enforce atomic current-state conditions.

Confirmed physical receipt increments every line and appends movement/order history in one replica-set transaction. Missing referenced items roll back the entire receipt. Competing receipt/cancellation cannot both commit or double stock. Received stock corrections use a separate movement rather than rewinding the order.

The current UI raises one-line orders; the API supports up to 100 unique item lines. Partial delivery, invoice matching, vendor portals, item archiving, barcode assets, full stocktake sessions and accounting integration remain future capabilities. Unit cost is recorded cost, not a live supplier quote or audited valuation.

## Verification

See [browser workflows](../../../tests-e2e/inventory/README.md). Integration coverage includes multi-line atomic receipt, concurrent receipt/cancellation, missing-item rollback, stale inspections and family procurement restrictions. Deployment remains deferred.

Recorded verification: 14 integration tests, eight state-machine unit tests and all 28 six-role browser cases passed. Both builds and targeted lint passed.
