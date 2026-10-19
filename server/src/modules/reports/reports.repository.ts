import { calendarDate } from '../attendance/attendance.dates';
import { Student } from '../../models/Student';
import { Staff } from '../../models/Staff';
import { Invoice } from '../../models/Invoice';
import { Ticket } from '../../models/Ticket';
import { Attendance } from '../../models/Attendance';
import { AdmissionApplication } from '../../models/AdmissionApplication';
import { ExamResult } from '../../models/ExamResult';
import { getSettings } from '../settings/settings.repository';

export interface StatusCount {
  _id: string;
  count: number;
}

export interface StudentSummary {
  byStatus: StatusCount[];
  byGrade: StatusCount[];
  averages: { avgGpa: number; avgAttendancePct: number | null } | null;
}

export interface FeeSummary {
  currency: string;
  byStatus: { _id: string; count: number; totalAmount: number; totalPaid: number }[];
  billed: number;
  collected: number;
  outstanding: number;
  invoiceCount: number;
  paidCount: number;
  dueCount: number;
  overdueCount: number;
}

/**
 * The first true cross-collection read aggregation in this codebase: five independent $group
 * pipelines (Students, Staff, Invoices, Tickets, Attendance) run in parallel and composed into one overview.
 * Surveys' tally was an aggregation WITHIN one collection; this spans four. The Students pipeline
 * additionally uses $avg accumulators - averages computed by the database over the whole
 * collection, not by loading documents into application memory and reducing there.
 */
export async function overview() {
  const settings = await getSettings();
  const generatedAt = new Date();
  const asOfDay = calendarDate(generatedAt, settings.timezone);
  const now = new Date(asOfDay);
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const afterAsOfDay = new Date(now.getTime() + 86400000);
  const [
    studentsByStatus,
    studentsByGrade,
    studentAverages,
    staffByType,
    feesByStatus,
    ticketsByStatus,
    attendanceRows,
    applications,
    examRows,
  ] = await Promise.all([
    Student.aggregate<StatusCount>([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Student.aggregate<StatusCount>([
      { $match: { status: 'Active' } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Student.aggregate<{ _id: null; avgGpa: number; avgAttendancePct: number }>([
      { $match: { status: 'Active' } },
      { $group: { _id: null, avgGpa: { $avg: '$gpa' }, avgAttendancePct: { $avg: '$attendancePct' } } },
    ]),
    Staff.aggregate<StatusCount>([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Invoice.aggregate<{ _id: string; count: number; totalAmount: number; totalPaid: number }>([
      { $match: { currency: settings.currency } },
      {
        $project: {
          amount: 1,
          paidAmount: 1,
          effectiveStatus: {
            $cond: [
              { $gte: ['$paidAmount', '$amount'] },
              'Paid',
              { $cond: [{ $lt: ['$dueDate', now] }, 'Overdue', 'Due'] },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$effectiveStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$paidAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Ticket.aggregate<StatusCount>([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Attendance.aggregate<{ _id: string; attended: number; eligible: number }>([
      { $match: { date: { $gte: firstMonth, $lt: afterAsOfDay } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
          attended: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] } },
          eligible: { $sum: { $cond: [{ $ne: ['$status', 'Excused'] }, 1, 0] } },
        },
      },
    ]),
    AdmissionApplication.countDocuments(),
    ExamResult.aggregate<{ _id: string; count: number }>([
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'examData' } },
      { $unwind: '$examData' },
      {
        $project: {
          percent: {
            $multiply: [
              { $divide: [{ $sum: '$scores.marks' }, { $multiply: [{ $size: '$scores' }, '$examData.maxMarks'] }] },
              100,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ['$percent', 70] }, then: 'A+ / A' },
                { case: { $gte: ['$percent', 60] }, then: 'B' },
                { case: { $gte: ['$percent', 50] }, then: 'C' },
              ],
              default: 'D / below',
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const averagesRow = studentAverages[0];
  const attendanceByMonth = new Map(attendanceRows.map((row) => [row._id, row]));
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    const row = attendanceByMonth.get(key);
    return {
      month: key,
      attended: row?.attended || 0,
      eligible: row?.eligible || 0,
      rate: row?.eligible ? Math.round((row.attended / row.eligible) * 100) : null,
    };
  });
  const billed = Math.round(feesByStatus.reduce((sum, row) => sum + row.totalAmount, 0) * 100) / 100;
  const collected = Math.round(feesByStatus.reduce((sum, row) => sum + row.totalPaid, 0) * 100) / 100;
  const countStatus = (status: string) => feesByStatus.find((row) => row._id === status)?.count || 0;
  const eligible = monthly.reduce((n, r) => n + r.eligible, 0);
  const attended = monthly.reduce((n, r) => n + r.attended, 0);
  return {
    generatedAt: generatedAt.toISOString(),
    asOfDay,
    timezone: settings.timezone,
    basis: {
      fees: 'All saved invoices in school currency; valid-through due day is inclusive',
      attendance: 'Present and Late divided by recorded non-Excused marks; AM/PM are separate marks',
      exams: 'Saved result documents; percentage bands A+/A 70+, B 60+, C 50+, D below 50',
      gpa: 'Legacy Student profile value, not computed from exam results',
    },
    students: {
      byStatus: studentsByStatus,
      byGrade: studentsByGrade,
      averages: averagesRow
        ? {
            avgGpa: averagesRow.avgGpa,
            avgAttendancePct: eligible ? Math.round((attended / eligible) * 1000) / 10 : null,
          }
        : null,
    } satisfies StudentSummary,
    staff: { byType: staffByType, count: staffByType.reduce((sum, row) => sum + row.count, 0) },
    applications: { count: applications },
    exams: { byGrade: examRows, resultCount: examRows.reduce((sum, row) => sum + row.count, 0) },
    fees: {
      currency: settings.currency,
      byStatus: feesByStatus,
      billed,
      collected,
      outstanding: Math.round((billed - collected) * 100) / 100,
      invoiceCount: feesByStatus.reduce((sum, row) => sum + row.count, 0),
      paidCount: countStatus('Paid'),
      dueCount: countStatus('Due'),
      overdueCount: countStatus('Overdue'),
    } satisfies FeeSummary,
    helpdesk: { byStatus: ticketsByStatus },
    attendance: {
      monthly,
      attended,
      eligible,
      rate: eligible ? Math.round((attended / eligible) * 1000) / 10 : null,
      from: firstMonth.toISOString().slice(0, 10),
      through: asOfDay,
    },
  };
}
