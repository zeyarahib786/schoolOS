import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import * as authApi from '../features/auth/auth.api';

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  color: isActive ? '#0E7C39' : '#475569',
  background: isActive ? '#E7F7EE' : 'transparent',
});

/** Wraps every authenticated page with a consistent top nav - the shared shell every future
 * module's page will render inside, matching the reusable-component approach the rest of this
 * codebase follows (Kpi, Chip, DataTable) rather than each page reinventing navigation. */
export function AppShell(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function handleSignOut(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Logging out client-side regardless of whether the server call succeeded is the right
      // call here - a failed network request should never trap a user in a "can't sign out" state.
    } finally {
      clearSession();
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <nav
        aria-label="Main navigation"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          background: '#fff',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>Solvagence SchoolOS</span>
          <NavLink to="/students" style={navLinkStyle}>
            Students
          </NavLink>
          <NavLink to="/staff" style={navLinkStyle}>
            Staff & HR
          </NavLink>
          <NavLink to="/attendance" style={navLinkStyle}>
            Attendance
          </NavLink>
          <NavLink to="/fees" style={navLinkStyle}>
            Fees
          </NavLink>
          <NavLink to="/exams" style={navLinkStyle}>
            Exams
          </NavLink>
          <NavLink to="/curriculum" style={navLinkStyle}>
            Curriculum
          </NavLink>
          <NavLink to="/library" style={navLinkStyle}>
            Library
          </NavLink>
          <NavLink to="/payroll" style={navLinkStyle}>
            Payroll
          </NavLink>
          <NavLink to="/expenses" style={navLinkStyle}>
            Expenses
          </NavLink>
          <NavLink to="/helpdesk" style={navLinkStyle}>
            Helpdesk
          </NavLink>
          <NavLink to="/certificates" style={navLinkStyle}>
            Certificates
          </NavLink>
          <NavLink to="/facilities" style={navLinkStyle}>
            Facilities
          </NavLink>
          <NavLink to="/events" style={navLinkStyle}>
            Events
          </NavLink>
          <NavLink to="/audit-log" style={navLinkStyle}>
            Audit Log
          </NavLink>
          <NavLink to="/surveys" style={navLinkStyle}>
            Surveys
          </NavLink>
          <NavLink to="/transport" style={navLinkStyle}>
            Transport
          </NavLink>
          <NavLink to="/inventory" style={navLinkStyle}>
            Inventory
          </NavLink>
          <NavLink to="/hostel" style={navLinkStyle}>
            Hostel
          </NavLink>
          <NavLink to="/behaviour" style={navLinkStyle}>
            Behaviour
          </NavLink>
          <NavLink to="/health" style={navLinkStyle}>
            Health
          </NavLink>
          <NavLink to="/cafeteria" style={navLinkStyle}>
            Cafeteria
          </NavLink>
          <NavLink to="/visitors" style={navLinkStyle}>
            Visitors
          </NavLink>
          <NavLink to="/biometric" style={navLinkStyle}>
            Biometric
          </NavLink>
          <NavLink to="/alumni" style={navLinkStyle}>
            Alumni
          </NavLink>
          <NavLink to="/lms" style={navLinkStyle}>
            LMS
          </NavLink>
          <NavLink to="/timetable" style={navLinkStyle}>
            Timetable
          </NavLink>
          <NavLink to="/announcements" style={navLinkStyle}>
            Announcements
          </NavLink>
          <NavLink to="/admissions" style={navLinkStyle}>
            Admissions
          </NavLink>
          <NavLink to="/leave" style={navLinkStyle}>
            Leave
          </NavLink>
          <NavLink to="/meetings" style={navLinkStyle}>
            Meetings
          </NavLink>
          <NavLink to="/documents" style={navLinkStyle}>
            Documents
          </NavLink>
          <NavLink to="/id-cards" style={navLinkStyle}>
            ID Cards
          </NavLink>
          <NavLink to="/reports" style={navLinkStyle}>
            Reports
          </NavLink>
          <NavLink to="/settings" style={navLinkStyle}>
            Settings
          </NavLink>
          <NavLink to="/messages" style={navLinkStyle}>
            Messages
          </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <span style={{ fontSize: 12.5, color: '#64748B' }}>
              {user.name} · {user.role}
            </span>
          )}
          <button
            onClick={handleSignOut}
            style={{
              fontSize: 12.5,
              background: 'none',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
