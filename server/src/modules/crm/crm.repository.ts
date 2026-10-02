import { FilterQuery } from 'mongoose';
import { CrmLead, ICrmLead } from '../../models/CrmLead';
import { CreateCrmLeadInput, ListCrmLeadsQuery } from './crm.validation';

function escapeRegex(value: string): string {
  const specialCharacters = '.*+?^' + '$' + '{}()|[]' + String.fromCharCode(92);
  return Array.from(value)
    .map((character) => (specialCharacters.includes(character) ? String.fromCharCode(92) + character : character))
    .join('');
}

export async function findMany(query: ListCrmLeadsQuery): Promise<{ items: ICrmLead[]; total: number }> {
  const filter: FilterQuery<ICrmLead> = {};
  if (query.stage) filter.stage = query.stage;
  if (query.archived) filter.archived = query.archived === 'true';
  if (query.search) {
    const escaped = escapeRegex(query.search);
    filter.$or = [
      { name: new RegExp(escaped, 'i') },
      { guardian: new RegExp(escaped, 'i') },
      { phone: new RegExp(escaped, 'i') },
    ];
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    CrmLead.find(filter).sort({ archived: 1, updatedAt: -1 }).skip(skip).limit(query.limit),
    CrmLead.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<ICrmLead | null> {
  return CrmLead.findById(id);
}

export function findDuplicate(name: string, phone?: string): Promise<ICrmLead | null> {
  return CrmLead.findOne({ name, phone: phone || '' }).collation({ locale: 'en', strength: 2 });
}

export function create(input: CreateCrmLeadInput): Promise<ICrmLead> {
  const now = new Date();
  return CrmLead.create({
    ...input,
    activityLog: [{ action: input.notes ? `Note: ${input.notes}` : 'Lead captured', occurredAt: now }],
    lastActivityAt: now,
    followUpType: input.followUpDate ? 'Scheduled' : undefined,
  });
}
