import { FilterQuery } from 'mongoose';
import { SchoolDocument, ISchoolDocument } from '../../models/SchoolDocument';
import { ListDocumentsQuery, PublishDocumentInput } from './documents.validation';

export async function findMany(query: ListDocumentsQuery): Promise<{ items: ISchoolDocument[]; total: number }> {
  const filter: FilterQuery<ISchoolDocument> = {};
  if (!query.includeSuperseded) filter.isCurrent = true;
  if (query.category) filter.category = query.category;
  if (query.code) filter.code = query.code.toUpperCase();

  if (query.q) {
    const term = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['code', 'title', 'description'].map((field) => ({ [field]: { $regex: term, $options: 'i' } }));
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    SchoolDocument.find(filter)
      .sort({ code: 1, version: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('publishedBy', 'name role'),
    SchoolDocument.countDocuments(filter),
  ]);
  return { items, total };
}

export function findCurrentByCode(code: string): Promise<ISchoolDocument | null> {
  return SchoolDocument.findOne({ code: code.toUpperCase(), isCurrent: true });
}

export function supersede(id: string) {
  return SchoolDocument.findByIdAndUpdate(id, { isCurrent: false }, { new: true });
}

export function createVersion(
  input: PublishDocumentInput,
  version: number,
  publishedBy: string,
  file?: { fileId: string; filename: string; contentType: string; size: number },
): Promise<ISchoolDocument> {
  return SchoolDocument.create({
    ...input,
    ...file,
    code: input.code.toUpperCase(),
    version,
    isCurrent: true,
    publishedBy,
  });
}

export function markCurrent(id: string) {
  return SchoolDocument.findByIdAndUpdate(id, { isCurrent: true }, { new: true });
}
