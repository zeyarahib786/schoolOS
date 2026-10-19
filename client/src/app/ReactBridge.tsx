import { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAuthStore, Role } from "../lib/store/authStore";

// Load a React page only after it is explicitly released and opened.
const AdmissionsPage=lazy(()=>import("../features/admissions/AdmissionsPage").then(module=>({default:module.AdmissionsPage})));
const AlumniPage=lazy(()=>import("../features/alumni/AlumniPage").then(module=>({default:module.AlumniPage})));
const AnnouncementsPage=lazy(()=>import("../features/announcements/AnnouncementsPage").then(module=>({default:module.AnnouncementsPage})));
const AttendancePage=lazy(()=>import("../features/attendance/AttendancePage").then(module=>({default:module.AttendancePage})));
const AuditLogPage=lazy(()=>import("../features/audit/AuditLogPage").then(module=>({default:module.AuditLogPage})));
const BehaviourPage=lazy(()=>import("../features/behaviour/BehaviourPage").then(module=>({default:module.BehaviourPage})));
const BiometricPage=lazy(()=>import("../features/biometric/BiometricPage").then(module=>({default:module.BiometricPage})));
const CafeteriaPage=lazy(()=>import("../features/cafeteria/CafeteriaPage").then(module=>({default:module.CafeteriaPage})));
const CertificatesPage=lazy(()=>import("../features/certificates/CertificatesPage").then(module=>({default:module.CertificatesPage})));
const ClassesPage=lazy(()=>import("../features/classes/ClassesPage").then(module=>({default:module.ClassesPage})));
const CrmPage=lazy(()=>import("../features/crm/CrmPage").then(module=>({default:module.CrmPage})));
const CurriculumPage=lazy(()=>import("../features/curriculum/CurriculumPage").then(module=>({default:module.CurriculumPage})));
const DocumentsPage=lazy(()=>import("../features/documents/DocumentsPage").then(module=>({default:module.DocumentsPage})));
const EventsPage=lazy(()=>import("../features/events/EventsPage").then(module=>({default:module.EventsPage})));
const ExamsPage=lazy(()=>import("../features/exams/ExamsPage").then(module=>({default:module.ExamsPage})));
const ExpensesPage=lazy(()=>import("../features/expenses/ExpensesPage").then(module=>({default:module.ExpensesPage})));
const FacilitiesPage=lazy(()=>import("../features/facilities/FacilitiesPage").then(module=>({default:module.FacilitiesPage})));
const FeesPage=lazy(()=>import("../features/fees/FeesPage").then(module=>({default:module.FeesPage})));
const HealthPage=lazy(()=>import("../features/health/HealthPage").then(module=>({default:module.HealthPage})));
const HelpdeskPage=lazy(()=>import("../features/helpdesk/HelpdeskPage").then(module=>({default:module.HelpdeskPage})));
const HostelPage=lazy(()=>import("../features/hostel/HostelPage").then(module=>({default:module.HostelPage})));
const IdCardsPage=lazy(()=>import("../features/idcards/IdCardsPage").then(module=>({default:module.IdCardsPage})));
const InventoryPage=lazy(()=>import("../features/inventory/InventoryPage").then(module=>({default:module.InventoryPage})));
const LeavePage=lazy(()=>import("../features/leave/LeavePage").then(module=>({default:module.LeavePage})));
const LibraryPage=lazy(()=>import("../features/library/LibraryPage").then(module=>({default:module.LibraryPage})));
const LmsPage=lazy(()=>import("../features/lms/LmsPage").then(module=>({default:module.LmsPage})));
const MeetingsPage=lazy(()=>import("../features/meetings/MeetingsPage").then(module=>({default:module.MeetingsPage})));
const MessagesPage=lazy(()=>import("../features/messages/MessagesPage").then(module=>({default:module.MessagesPage})));
const ParentsPage=lazy(()=>import("../features/parents/ParentsPage").then(module=>({default:module.ParentsPage})));
const PayrollPage=lazy(()=>import("../features/payroll/PayrollPage").then(module=>({default:module.PayrollPage})));
const ReportsPage=lazy(()=>import("../features/reports/ReportsPage").then(module=>({default:module.ReportsPage})));
const RolesPage=lazy(()=>import("../features/roles/RolesPage").then(module=>({default:module.RolesPage})));
const SettingsPage=lazy(()=>import("../features/settings/SettingsPage").then(module=>({default:module.SettingsPage})));
const StaffPage=lazy(()=>import("../features/staff/StaffPage").then(module=>({default:module.StaffPage})));
const StudentsPage=lazy(()=>import("../features/students/StudentsPage").then(module=>({default:module.StudentsPage})));
const SurveysPage=lazy(()=>import("../features/surveys/SurveysPage").then(module=>({default:module.SurveysPage})));
const TimetablePage=lazy(()=>import("../features/timetable/TimetablePage").then(module=>({default:module.TimetablePage})));
const TransportPage=lazy(()=>import("../features/transport/TransportPage").then(module=>({default:module.TransportPage})));
const VisitorsPage=lazy(()=>import("../features/visitors/VisitorsPage").then(module=>({default:module.VisitorsPage})));

// Map legacy module ID to React Page component
export const REACT_PAGE_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
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

/**
 * React-native screens remain in the repository while they are brought to full
 * parity with the established application shell.  The shell is the production
 * source of truth: enabling a screen here is an explicit, module-by-module
 * release decision, rather than silently replacing an existing workflow.
 */
const RELEASED_REACT_MODULES = new Set<string>();

declare global {
  interface Window {
    __IS_REACT_MODULE?: (id: string) => boolean;
    __NAVIGATE_REACT?: (id: string) => void;
    __SYNC_REACT_SESSION?: (
      user: { id: string; name: string; email: string; role: Role },
      accessToken: string,
      refreshToken: string,
    ) => void;
    __CLEAR_REACT_SESSION?: () => void;
    __SYNC_REACT_ROLE?: (role: Role) => void;
  }
}

export function ReactBridge(): JSX.Element | null {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [viewEl, setViewEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Register global bridge methods for legacy JS
    window.__IS_REACT_MODULE = (id: string) => RELEASED_REACT_MODULES.has(id) && Boolean(REACT_PAGE_MAP[id]);
    window.__NAVIGATE_REACT = (id: string) => {
      setActiveModule(RELEASED_REACT_MODULES.has(id) && REACT_PAGE_MAP[id] ? id : null);
    };
    window.__SYNC_REACT_SESSION = (user, accessToken, refreshToken) => {
      useAuthStore.getState().setSession(user, accessToken, refreshToken);
    };
    window.__CLEAR_REACT_SESSION = () => {
      useAuthStore.getState().clearSession();
    };
    window.__SYNC_REACT_ROLE = (role: Role) => {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.setState({ user: { ...current, role } });
      }
    };

    // Find the #view container in the DOM
    const el = document.getElementById("view");
    if (el) setViewEl(el);
  }, []);

  if (!activeModule || !REACT_PAGE_MAP[activeModule] || !viewEl) {
    return null;
  }

  const PageComponent = REACT_PAGE_MAP[activeModule];
  return ReactDOM.createPortal(<Suspense fallback={<div role="status">Loading…</div>}><PageComponent /></Suspense>, viewEl);
}
