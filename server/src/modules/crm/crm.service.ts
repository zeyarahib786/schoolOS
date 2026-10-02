import { AdmissionApplication } from '../../models/AdmissionApplication';
import { CRM_STAGES, ICrmLead } from '../../models/CrmLead';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import * as repo from './crm.repository';
import { ArchiveCrmLeadInput, CreateCrmLeadInput, ListCrmLeadsQuery, LogCrmActivityInput, ScheduleFollowUpInput } from './crm.validation';

async function required(id: string): Promise<ICrmLead> {
  const lead = await repo.findById(id);
  if (!lead) throw ApiError.notFound('CRM lead not found');
  return lead;
}
function activity(lead: ICrmLead, action: string) {
  const now = new Date();
  lead.activityLog.unshift({ action, occurredAt: now });
  lead.lastActivityAt = now;
}
export async function listLeads(query: ListCrmLeadsQuery) {
  const { items, total } = await repo.findMany(query);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
export async function createLead(input: CreateCrmLeadInput, user: AuthenticatedUser) {
  if (await repo.findDuplicate(input.name, input.phone)) throw ApiError.conflict('This lead already exists');
  try {
    const lead = await repo.create(input);
    await logAudit(`Created CRM lead ${lead.name}`, 'CRM', user.id);
    return lead;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw ApiError.conflict('This lead already exists');
    throw error;
  }
}
export async function advanceLead(id: string, user: AuthenticatedUser) {
  const lead = await required(id);
  if (lead.archived) throw ApiError.conflict('Restore the lead before advancing it');
  const index = CRM_STAGES.indexOf(lead.stage);
  if (index >= CRM_STAGES.length - 1) throw ApiError.conflict('Lead is already at the final stage');
  lead.stage = CRM_STAGES[index + 1];
  activity(lead, `Advanced to ${lead.stage}`);
  await lead.save();
  await logAudit(`Advanced CRM lead ${lead.name} to ${lead.stage}`, 'CRM', user.id);
  return lead;
}
export async function scheduleFollowUp(id: string, input: ScheduleFollowUpInput, user: AuthenticatedUser) {
  const lead = await required(id);
  if (lead.archived) throw ApiError.conflict('Restore the lead before scheduling a follow-up');
  lead.followUpDate = input.date;
  lead.followUpType = input.type;
  activity(lead, `${input.type} scheduled${input.note ? ` — ${input.note}` : ''}`);
  await lead.save();
  await logAudit(`Scheduled CRM follow-up for ${lead.name}`, 'CRM', user.id);
  return lead;
}
export async function logActivity(id: string, input: LogCrmActivityInput, user: AuthenticatedUser) {
  const lead = await required(id);
  if (lead.archived) throw ApiError.conflict('Restore the lead before logging activity');
  const initiated = ['Called', 'WhatsApp', 'Email'].includes(input.type) && !input.outcome && !input.notes ? ' initiated' : '';
  activity(lead, `${input.type}${input.outcome ? ` · ${input.outcome}` : ''}${input.notes ? ` — ${input.notes}` : ''}${initiated}`);
  if (input.temperature) lead.temperature = input.temperature;
  await lead.save();
  await logAudit(`Logged CRM activity for ${lead.name}`, 'CRM', user.id);
  return lead;
}
export async function archiveLead(id: string, input: ArchiveCrmLeadInput, user: AuthenticatedUser) {
  const lead = await required(id);
  if (lead.archived) throw ApiError.conflict('Lead is already archived');
  lead.archived = true;
  lead.archiveReason = input.reason;
  lead.followUpDate = undefined;
  lead.followUpType = undefined;
  activity(lead, input.note ? `Marked lost — ${input.reason} · ${input.note}` : `Archived — ${input.reason}`);
  await lead.save();
  await logAudit(`Archived CRM lead ${lead.name}: ${input.reason}`, 'CRM', user.id, 'Warning');
  return lead;
}
export async function restoreLead(id: string, user: AuthenticatedUser) {
  const lead = await required(id);
  if (!lead.archived) throw ApiError.conflict('Lead is not archived');
  lead.archived = false;
  lead.archiveReason = undefined;
  lead.followUpDate = undefined;
  lead.followUpType = undefined;
  activity(lead, 'Restored to funnel');
  await lead.save();
  await logAudit(`Restored CRM lead ${lead.name}`, 'CRM', user.id);
  return lead;
}
export async function convertLead(id: string, user: AuthenticatedUser) {
  const lead = await required(id);
  if (lead.archived) throw ApiError.conflict('Restore the lead before conversion');
  if (lead.stage !== 'Application') throw ApiError.conflict('Only an Application-stage lead can be converted');
  const phone = lead.phone || 'Not provided';
  if (await AdmissionApplication.findOne({ applicantName: lead.name, phone }))
    throw ApiError.conflict('An admission application already exists for this lead');
  const application = await AdmissionApplication.create({
    applicantName: lead.name, gradeAppliedFor: lead.grade, guardianName: lead.guardian || 'Not provided',
    phone, guardianEmail: lead.guardianEmail,
    source: ['Website', 'Walk-in', 'Referral', 'Agent', 'Event'].includes(lead.source) ? lead.source : undefined,
    status: 'Applied', notes: `Converted from CRM (${lead.source})`, documents: [], history: [],
  });
  try {
    lead.stage = 'Won';
    activity(lead, 'Converted to application');
    await lead.save();
  } catch (error) {
    await AdmissionApplication.deleteOne({ _id: application._id });
    throw error;
  }
  await logAudit(`Converted CRM lead ${lead.name} to Admissions`, 'CRM', user.id);
  return { lead, applicationId: application._id };
}
export async function deleteLead(id: string, user: AuthenticatedUser) {
  const lead = await required(id);
  if (!lead.archived) throw ApiError.conflict('Archive the lead before permanent deletion');
  await lead.deleteOne();
  await logAudit(`Permanently deleted CRM lead ${lead.name}`, 'CRM', user.id, 'Critical');
  return { deleted: true };
}
