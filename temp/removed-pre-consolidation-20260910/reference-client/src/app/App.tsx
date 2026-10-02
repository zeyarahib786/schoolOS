import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from './AppShell';

// Route-level code splitting - each feature page ships as its own chunk, only downloaded when
// the user actually navigates there, instead of one large bundle loaded up front on login.
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const StudentsPage = lazy(() => import('../features/students/StudentsPage').then((m) => ({ default: m.StudentsPage })));
const StaffPage = lazy(() => import('../features/staff/StaffPage').then((m) => ({ default: m.StaffPage })));
const AttendancePage = lazy(() =>
  import('../features/attendance/AttendancePage').then((m) => ({ default: m.AttendancePage })),
);
const FeesPage = lazy(() => import('../features/fees/FeesPage').then((m) => ({ default: m.FeesPage })));
const ExamsPage = lazy(() => import('../features/exams/ExamsPage').then((m) => ({ default: m.ExamsPage })));
const CurriculumPage = lazy(() =>
  import('../features/curriculum/CurriculumPage').then((m) => ({ default: m.CurriculumPage })),
);
const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const PayrollPage = lazy(() => import('../features/payroll/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const ExpensesPage = lazy(() => import('../features/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const HelpdeskPage = lazy(() => import('../features/helpdesk/HelpdeskPage').then((m) => ({ default: m.HelpdeskPage })));
const CertificatesPage = lazy(() =>
  import('../features/certificates/CertificatesPage').then((m) => ({ default: m.CertificatesPage })),
);
const FacilitiesPage = lazy(() =>
  import('../features/facilities/FacilitiesPage').then((m) => ({ default: m.FacilitiesPage })),
);
const EventsPage = lazy(() => import('../features/events/EventsPage').then((m) => ({ default: m.EventsPage })));
const AuditLogPage = lazy(() => import('../features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const SurveysPage = lazy(() => import('../features/surveys/SurveysPage').then((m) => ({ default: m.SurveysPage })));
const TransportPage = lazy(() =>
  import('../features/transport/TransportPage').then((m) => ({ default: m.TransportPage })),
);
const InventoryPage = lazy(() =>
  import('../features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const HostelPage = lazy(() => import('../features/hostel/HostelPage').then((m) => ({ default: m.HostelPage })));
const BehaviourPage = lazy(() =>
  import('../features/behaviour/BehaviourPage').then((m) => ({ default: m.BehaviourPage })),
);
const HealthPage = lazy(() => import('../features/health/HealthPage').then((m) => ({ default: m.HealthPage })));
const CafeteriaPage = lazy(() =>
  import('../features/cafeteria/CafeteriaPage').then((m) => ({ default: m.CafeteriaPage })),
);
const VisitorsPage = lazy(() => import('../features/visitors/VisitorsPage').then((m) => ({ default: m.VisitorsPage })));
const BiometricPage = lazy(() =>
  import('../features/biometric/BiometricPage').then((m) => ({ default: m.BiometricPage })),
);
const AlumniPage = lazy(() => import('../features/alumni/AlumniPage').then((m) => ({ default: m.AlumniPage })));
const LmsPage = lazy(() => import('../features/lms/LmsPage').then((m) => ({ default: m.LmsPage })));
const TimetablePage = lazy(() =>
  import('../features/timetable/TimetablePage').then((m) => ({ default: m.TimetablePage })),
);
const AnnouncementsPage = lazy(() =>
  import('../features/announcements/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })),
);
const AdmissionsPage = lazy(() =>
  import('../features/admissions/AdmissionsPage').then((m) => ({ default: m.AdmissionsPage })),
);
const LeavePage = lazy(() => import('../features/leave/LeavePage').then((m) => ({ default: m.LeavePage })));
const MeetingsPage = lazy(() => import('../features/meetings/MeetingsPage').then((m) => ({ default: m.MeetingsPage })));
const DocumentsPage = lazy(() =>
  import('../features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const IdCardsPage = lazy(() => import('../features/idcards/IdCardsPage').then((m) => ({ default: m.IdCardsPage })));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const MessagesPage = lazy(() => import('../features/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })));

function RouteFallback(): JSX.Element {
  return (
    <div role="status" aria-live="polite" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
      Loading…
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/fees" element={<FeesPage />} />
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/curriculum" element={<CurriculumPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/helpdesk" element={<HelpdeskPage />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/facilities" element={<FacilitiesPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/surveys" element={<SurveysPage />} />
              <Route path="/transport" element={<TransportPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/hostel" element={<HostelPage />} />
              <Route path="/behaviour" element={<BehaviourPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/cafeteria" element={<CafeteriaPage />} />
              <Route path="/visitors" element={<VisitorsPage />} />
              <Route path="/biometric" element={<BiometricPage />} />
              <Route path="/alumni" element={<AlumniPage />} />
              <Route path="/lms" element={<LmsPage />} />
              <Route path="/timetable" element={<TimetablePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/admissions" element={<AdmissionsPage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/meetings" element={<MeetingsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/id-cards" element={<IdCardsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/students" replace />} />
          <Route path="*" element={<Navigate to="/students" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
