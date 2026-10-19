import mongoose, { FilterQuery } from 'mongoose';
import { AdmissionApplication, IAdmissionApplication } from '../../models/AdmissionApplication';
import { Student } from '../../models/Student';
import { ListApplicationsQuery, CreateApplicationInput, EnrollInput } from './admissions.validation';

export async function findMany(
  query: ListApplicationsQuery,
): Promise<{ items: IAdmissionApplication[]; total: number }> {
  const filter: FilterQuery<IAdmissionApplication> = {};
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    AdmissionApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    AdmissionApplication.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<IAdmissionApplication | null> {
  return AdmissionApplication.findById(id);
}

export function create(input: CreateApplicationInput): Promise<IAdmissionApplication> {
  return AdmissionApplication.create(input);
}

/**
 * The symmetric MIRROR of Alumni's graduation transaction: graduation flips an existing Student
 * OUT of active enrollment and creates an AlumniProfile; enrollment here CREATES a brand-new
 * Student from an Accepted application and flips the application to Enrolled - same
 * cross-collection all-or-nothing shape, opposite end of the student lifecycle. Without the
 * transaction, a crash between the two writes could create a Student with the application still
 * showing Accepted (inviting a duplicate enrollment of the same child), or mark the application
 * Enrolled with no Student ever created (a child admitted on paper who doesn't exist in the
 * system).
 */
export async function enrollApplication(
  applicationId: string,
  input: EnrollInput,
  performedBy: string,
): Promise<IAdmissionApplication> {
  const session = await mongoose.startSession();
  try {
    let updated: IAdmissionApplication | null = null;
    await session.withTransaction(async () => {
      const application = await AdmissionApplication.findById(applicationId).session(session);
      if (!application) throw Object.assign(new Error('APPLICATION_NOT_FOUND'), { code: 'APPLICATION_NOT_FOUND' });
      if (application.status !== 'Accepted') throw Object.assign(new Error('NOT_ACCEPTED'), { code: 'NOT_ACCEPTED' });

      const [student] = await Student.create(
        [
          {
            refId: input.refId,
            name: application.applicantName,
            grade: application.gradeAppliedFor,
            gender: application.gender,
            roll: input.roll,
            guardianName: application.guardianName,
            phone: application.phone,
            dateOfBirth: application.dateOfBirth,
            nationality: application.nationality,
            guardianRelationship: application.guardianRelationship,
            guardianEmail: application.guardianEmail,
            previousSchool: application.previousSchool,
          },
        ],
        { session },
      );

      const result = await AdmissionApplication.findByIdAndUpdate(
        applicationId,
        {
          status: 'Enrolled',
          enrolledStudent: student._id,
          history: [{ from: 'Accepted', to: 'Enrolled', performedBy, at: new Date() }],
        },
        { new: true, session },
      );
      updated = result;
    });
    if (!updated) throw new Error('Enrollment transaction completed without producing a document');
    return updated;
  } finally {
    await session.endSession();
  }
}
