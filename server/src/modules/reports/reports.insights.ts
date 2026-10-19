import { Student } from '../../models/Student';
import { Attendance } from '../../models/Attendance';
import { ExamResult } from '../../models/ExamResult';
import { Invoice } from '../../models/Invoice';
import { InventoryItem } from '../../models/InventoryItem';
import { getSettings } from '../settings/settings.repository';
import { calendarDate } from '../attendance/attendance.dates';
export async function recordedInsights() {
  const settings = await getSettings(),
    generatedAt = new Date(),
    asOfDay = calendarDate(generatedAt, settings.timezone),
    day = new Date(asOfDay);
  const from = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 5, 1)),
    through = new Date(day.getTime() + 86400000);
  const [students, attendance, assessments, invoices, lowStock] = await Promise.all([
    Student.find({ status: 'Active' }).select('name refId grade').lean(),
    Attendance.aggregate<{ _id: unknown; attended: number; eligible: number }>([
      { $match: { date: { $gte: from, $lt: through } } },
      {
        $group: {
          _id: '$student',
          attended: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] } },
          eligible: { $sum: { $cond: [{ $ne: ['$status', 'Excused'] }, 1, 0] } },
        },
      },
    ]),
    ExamResult.aggregate<{ _id: unknown; averagePercent: number; count: number }>([
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'examData' } },
      { $unwind: '$examData' },
      { $match: { 'examData.maxMarks': { $gt: 0 }, 'scores.0': { $exists: true } } },
      {
        $project: {
          student: 1,
          percent: {
            $multiply: [
              { $divide: [{ $sum: '$scores.marks' }, { $multiply: [{ $size: '$scores' }, '$examData.maxMarks'] }] },
              100,
            ],
          },
        },
      },
      { $group: { _id: '$student', averagePercent: { $avg: '$percent' }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate<{ _id: unknown; outstanding: number; overdue: number; count: number }>([
      { $match: { currency: settings.currency } },
      { $project: { student: 1, dueDate: 1, balance: { $max: [0, { $subtract: ['$amount', '$paidAmount'] }] } } },
      {
        $group: {
          _id: '$student',
          outstanding: { $sum: '$balance' },
          overdue: { $sum: { $cond: [{ $lt: ['$dueDate', day] }, '$balance', 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
    InventoryItem.find({ $expr: { $lt: ['$quantityOnHand', '$reorderLevel'] } })
      .select('name sku quantityOnHand reorderLevel')
      .lean(),
  ]);
  const att = new Map(attendance.map((r) => [String(r._id), r])),
    exam = new Map(assessments.map((r) => [String(r._id), r])),
    fee = new Map(invoices.map((r) => [String(r._id), r]));
  const rows = students
    .map((student) => {
      const id = String(student._id),
        a = att.get(id),
        x = exam.get(id),
        f = fee.get(id),
        rate = a?.eligible ? Math.round((a.attended / a.eligible) * 1000) / 10 : null,
        average = x ? Math.round(x.averagePercent * 10) / 10 : null;
      let priority = 0;
      const signals: string[] = [];
      if (rate !== null && rate < 85) {
        priority += 40;
        signals.push('Recorded attendance below 85%');
      } else if (rate !== null && rate < 92) {
        priority += 18;
        signals.push('Recorded attendance below 92%');
      }
      if (average !== null && average < 75) {
        priority += 35;
        signals.push('Assessment percentage below 75%');
      } else if (average !== null && average < 85) {
        priority += 15;
        signals.push('Assessment percentage below 85%');
      }
      if (f && f.overdue > 0) {
        priority += 25;
        signals.push('Overdue invoice balance');
      } else if (f && f.outstanding > 0) {
        priority += 8;
        signals.push('Outstanding invoice balance');
      }
      return {
        student,
        priority: Math.min(priority, 99),
        signals,
        attendance: { rate, attended: a?.attended || 0, eligible: a?.eligible || 0 },
        assessment: { averagePercent: average, resultCount: x?.count || 0 },
        fees: {
          outstanding: Math.round((f?.outstanding || 0) * 100) / 100,
          overdue: Math.round((f?.overdue || 0) * 100) / 100,
          invoiceCount: f?.count || 0,
        },
      };
    })
    .filter((r) => r.priority >= 30)
    .sort((a, b) => b.priority - a.priority || a.student.refId.localeCompare(b.student.refId));
  return {
    generatedAt: generatedAt.toISOString(),
    asOfDay,
    timezone: settings.timezone,
    currency: settings.currency,
    attendanceFrom: from.toISOString().slice(0, 10),
    engine: 'Recorded rules',
    rows,
    lowStock,
    overdueBalance: Math.round(invoices.reduce((n, r) => n + r.overdue, 0) * 100) / 100,
    activeStudentCount: students.length,
  };
}
