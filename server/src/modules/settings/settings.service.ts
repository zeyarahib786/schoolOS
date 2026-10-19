import { ApiError } from '../../utils/ApiError';
import * as repo from './settings.repository';
import { UpdateSettingsInput } from './settings.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';
import { Invoice } from '../../models/Invoice';
import { InvoicePayment } from '../../models/InvoicePayment';
import { Payslip } from '../../models/Payslip';
import { ExpenseClaim } from '../../models/ExpenseClaim';
import { PurchaseOrder } from '../../models/PurchaseOrder';
import { InventoryItem } from '../../models/InventoryItem';
import { CafeteriaWallet } from '../../models/CafeteriaWallet';
import { CafeteriaTransaction } from '../../models/CafeteriaTransaction';

export function getSettings() {
  return repo.getSettings();
}

/** The first ADMINISTRATOR-ONLY gate in this codebase - even Principal is excluded. School-wide
 * configuration (academic year, currency, leave defaults) has system-wide blast radius, so it
 * belongs to exactly one role, and every change is written to the audit log as a Warning (the
 * same severity tiering the Audit module established), naming the actor server-side. */
export async function updateSettings(input: UpdateSettingsInput, requester: AuthenticatedUser) {
  if (requester.role !== 'Administrator') {
    throw ApiError.forbidden('Only an Administrator may change school settings');
  }
  const current = await repo.getSettings();
  if (current.currency !== input.currency) {
    const [invoiceCurrencies, financialCounts] = await Promise.all([
      Invoice.distinct('currency'),
      Promise.all([
        InvoicePayment.countDocuments(),
        Payslip.countDocuments(),
        ExpenseClaim.countDocuments(),
        PurchaseOrder.countDocuments(),
        InventoryItem.countDocuments({ unitCost: { $gt: 0 } }),
        CafeteriaWallet.countDocuments({ balance: { $gt: 0 } }),
        CafeteriaTransaction.countDocuments(),
      ]),
    ]);
    if (invoiceCurrencies.length || financialCounts.some((count) => count > 0)) {
      throw ApiError.conflict('School currency cannot change after financial records exist');
    }
  }
  const previous = current as unknown as Record<string, unknown>;
  const changedFields = Object.entries(input)
    .filter(([field, value]) => JSON.stringify(previous[field]) !== JSON.stringify(value))
    .map(([field]) => field);
  const saved = await repo.saveSettings(input);
  await logAudit(
    `School settings updated (academic year ${input.academicYear}; changed: ${changedFields.join(', ') || 'none'})`,
    'Settings',
    requester.id,
    'Warning',
  );
  return saved;
}
