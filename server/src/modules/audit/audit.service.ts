import { FilterQuery } from 'mongoose';
import { AuditLog, IAuditLog } from '../../models/AuditLog';
import { ListAuditLogQuery } from './audit.validation';

/**
 * The ONLY way an audit log entry is ever created in this codebase - a plain internal function
 * call from server-owned code. The fixed export acknowledgement also calls this function,
 * but no endpoint accepts client-supplied action text or actor identity. The server chooses
 * both values for every event.
 */
export async function logAudit(
  action: string,
  moduleName: string,
  performedBy: string,
  severity: 'Info' | 'Warning' | 'Critical' = 'Info',
): Promise<void> {
  await AuditLog.create({ action, module: moduleName, performedBy, severity });
}

export async function listAuditLog(query: ListAuditLogQuery): Promise<{ items: IAuditLog[]; total: number }> {
  const filter: FilterQuery<IAuditLog> = {};
  if (query.module) filter.module = query.module;
  if (query.severity) filter.severity = query.severity;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('performedBy', 'name email role'),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total };
}
