import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuthStore, Role } from '../lib/store/authStore';

// Import all React page components
import { AdmissionsPage } from '../features/admissions/AdmissionsPage';
import { AlumniPage } from '../features/alumni/AlumniPage';
import { AnnouncementsPage } from '../features/announcements/AnnouncementsPage';
import { AttendancePage } from '../features/attendance/AttendancePage';
import { AuditLogPage } from '../features/audit/AuditLogPage';
import { BehaviourPage } from '../features/behaviour/BehaviourPage';
import { BiometricPage } from '../features/biometric/BiometricPage';
import { CafeteriaPage } from '../features/cafeteria/CafeteriaPage';
import { CertificatesPage } from '../features/certificates/CertificatesPage';
import { ClassesPage } from '../features/classes/ClassesPage';
import { CrmPage } from '../features/crm/CrmPage';
import { CurriculumPage } from '../features/curriculum/CurriculumPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { EventsPage } from '../features/events/EventsPage';
import { ExamsPage } from '../features/exams/ExamsPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { FacilitiesPage } from '../features/facilities/FacilitiesPage';
import { FeesPage } from '../features/fees/FeesPage';
import { HealthPage } from '../features/health/HealthPage';
import { HelpdeskPage } from '../features/helpdesk/HelpdeskPage';
import { HostelPage } from '../features/hostel/HostelPage';
import { IdCardsPage } from '../features/idcards/IdCardsPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { LeavePage } from '../features/leave/LeavePage';
import { LibraryPage } from '../features/library/LibraryPage';
import { LmsPage } from '../features/lms/LmsPage';
import { MeetingsPage } from '../features/meetings/MeetingsPage';
import { MessagesPage } from '../features/messages/MessagesPage';
import { ParentsPage } from '../features/parents/ParentsPage';
import { PayrollPage } from '../features/payroll/PayrollPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { RolesPage } from '../features/roles/RolesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { StaffPage } from '../features/staff/StaffPage';
import { StudentsPage } from '../features/students/StudentsPage';
import { SurveysPage } from '../features/surveys/SurveysPage';
import { TimetablePage } from '../features/timetable/TimetablePage';
import { TransportPage } from '../features/transport/TransportPage';
import { VisitorsPage } from '../features/visitors/VisitorsPage';

// Map legacy module ID to React Page component
export const REACT_PAGE_MAP: Record<string, () => JSX.Element> = {
  students: StudentsPage,
  staff: StaffPage,
  parents: ParentsPage,
  admissions: AdmissionsPage,
  alumni: AlumniPage,
  crm: CrmPage,
  classes: ClassesPage,
  attendance: AttendancePage,
  exams: ExamsPage,
  timetable: TimetablePage,
  curriculum: CurriculumPage,
  lms: LmsPage,
  behaviour: BehaviourPage,
  fees: FeesPage,
  payroll: PayrollPage,
  expenses: ExpensesPage,
  library: LibraryPage,
  transport: TransportPage,
  hostel: HostelPage,
  inventory: InventoryPage,
  biometric: BiometricPage,
  visitors: VisitorsPage,
  facilities: FacilitiesPage,
  helpdesk: HelpdeskPage,
  comm: AnnouncementsPage,
  calendar: EventsPage,
  surveys: SurveysPage,
  meetings: MeetingsPage,
  messages: MessagesPage,
  settings: SettingsPage,
  audit: AuditLogPage,
  reports: ReportsPage,
  health: HealthPage,
  cafeteria: CafeteriaPage,
  documents: DocumentsPage,
  idcards: IdCardsPage,
  certificates: CertificatesPage,
  leave: LeavePage,
  roles: RolesPage,
};

declare global {
  interface Window {
    __IS_REACT_MODULE?: (id: string) => boolean;
    __NAVIGATE_REACT?: (id: string) => void;
    __SYNC_REACT_SESSION?: (user: { id: string; name: string; email: string; role: Role }, accessToken: string, refreshToken: string) => void;
    __SYNC_REACT_ROLE?: (role: Role) => void;
  }
}

export function ReactBridge(): JSX.Element | null {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [viewEl, setViewEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Register global bridge methods for legacy JS
    window.__IS_REACT_MODULE = (id: string) => Boolean(REACT_PAGE_MAP[id]);
    window.__NAVIGATE_REACT = (id: string) => {
      setActiveModule(REACT_PAGE_MAP[id] ? id : null);
    };
    window.__SYNC_REACT_SESSION = (user, accessToken, refreshToken) => {
      useAuthStore.getState().setSession(user, accessToken, refreshToken);
    };
    window.__SYNC_REACT_ROLE = (role: Role) => {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.setState({ user: { ...current, role } });
      }
    };

    // Find the #view container in the DOM
    const el = document.getElementById('view');
    if (el) setViewEl(el);
  }, []);

  if (!activeModule || !REACT_PAGE_MAP[activeModule] || !viewEl) {
    return null;
  }

  const PageComponent = REACT_PAGE_MAP[activeModule];
  return ReactDOM.createPortal(<PageComponent />, viewEl);
}
