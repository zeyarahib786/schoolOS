export interface RuntimeModule {
  id: string;
  kind: 'core' | 'feature';
  script: string;
}

/**
 * Active production module registry. Its order intentionally matches the established UI runtime:
 * several shared handlers must be available before the feature modules that call them.
 *
 * As individual screens become React-native, their registry entry can be replaced without
 * changing the shell or the remaining screens.
 */
export const RUNTIME_MODULES: readonly RuntimeModule[] = [
  { id: 'navigation', kind: 'core', script: 'assets/js/core/00-icons-nav-state.js' },
  { id: 'localization', kind: 'core', script: 'assets/js/i18n/10-localization.js' },
  { id: 'theme-documents', kind: 'core', script: 'assets/js/core/20-theme-documents.js' },
  { id: 'academic-data', kind: 'core', script: 'assets/js/data/30-academic-history.js' },
  { id: 'operations-data', kind: 'core', script: 'assets/js/data/31-operations-data.js' },
  { id: 'infrastructure', kind: 'core', script: 'assets/js/core/40-helpers-infra.js' },
  { id: 'shell', kind: 'core', script: 'assets/js/core/41-shell-drawer-roles.js' },
  { id: 'dashboard', kind: 'feature', script: 'assets/js/modules/50-dashboard.js' },
  { id: 'students', kind: 'feature', script: 'assets/js/modules/51-students.js' },
  { id: 'details', kind: 'core', script: 'assets/js/core/42-detail-drawer.js' },
  { id: 'create-actions', kind: 'core', script: 'assets/js/core/43-create-handlers.js' },
  { id: 'document-capture', kind: 'core', script: 'assets/js/core/44-document-capture.js' },
  { id: 'crm', kind: 'feature', script: 'assets/js/modules/52-crm.js' },
  { id: 'admissions', kind: 'feature', script: 'assets/js/modules/53-admissions.js' },
  { id: 'staff', kind: 'feature', script: 'assets/js/modules/54-staff.js' },
  { id: 'parents', kind: 'feature', script: 'assets/js/modules/55-parents.js' },
  { id: 'classes', kind: 'feature', script: 'assets/js/modules/56-classes.js' },
  { id: 'timetable', kind: 'feature', script: 'assets/js/modules/57-timetable.js' },
  { id: 'attendance', kind: 'feature', script: 'assets/js/modules/58-attendance.js' },
  { id: 'exams', kind: 'feature', script: 'assets/js/modules/59-exams.js' },
  { id: 'fees', kind: 'feature', script: 'assets/js/modules/60-fees.js' },
  { id: 'communication', kind: 'feature', script: 'assets/js/modules/61-communication.js' },
  { id: 'reports', kind: 'feature', script: 'assets/js/modules/62-reports.js' },
  { id: 'settings', kind: 'feature', script: 'assets/js/modules/63-settings.js' },
  { id: 'roles', kind: 'feature', script: 'assets/js/modules/64-roles.js' },
  { id: 'curriculum', kind: 'feature', script: 'assets/js/modules/65-curriculum.js' },
  { id: 'lms', kind: 'feature', script: 'assets/js/modules/66-lms.js' },
  { id: 'payroll', kind: 'feature', script: 'assets/js/modules/67-payroll.js' },
  { id: 'expenses', kind: 'feature', script: 'assets/js/modules/68-expenses.js' },
  { id: 'library', kind: 'feature', script: 'assets/js/modules/69-library.js' },
  { id: 'transport', kind: 'feature', script: 'assets/js/modules/70-transport.js' },
  { id: 'hostel', kind: 'feature', script: 'assets/js/modules/71-hostel.js' },
  { id: 'inventory', kind: 'feature', script: 'assets/js/modules/72-inventory.js' },
  { id: 'calendar', kind: 'feature', script: 'assets/js/modules/73-calendar.js' },
  { id: 'biometric', kind: 'feature', script: 'assets/js/modules/74-biometric.js' },
  { id: 'visitors', kind: 'feature', script: 'assets/js/modules/75-visitors.js' },
  { id: 'behaviour', kind: 'feature', script: 'assets/js/modules/76-behaviour.js' },
  { id: 'health', kind: 'feature', script: 'assets/js/modules/77-health.js' },
  { id: 'cafeteria', kind: 'feature', script: 'assets/js/modules/78-cafeteria.js' },
  { id: 'certificates', kind: 'feature', script: 'assets/js/modules/79-certificates.js' },
  { id: 'ai-insights', kind: 'feature', script: 'assets/js/modules/80-aiinsights.js' },
  { id: 'alumni', kind: 'feature', script: 'assets/js/modules/81-alumni.js' },
  { id: 'facilities', kind: 'feature', script: 'assets/js/modules/82-facilities.js' },
  { id: 'helpdesk', kind: 'feature', script: 'assets/js/modules/83-helpdesk.js' },
  { id: 'surveys', kind: 'feature', script: 'assets/js/modules/84-surveys.js' },
  { id: 'audit', kind: 'feature', script: 'assets/js/modules/85-audit.js' },
  { id: 'documents', kind: 'feature', script: 'assets/js/modules/86-documents.js' },
  { id: 'idcards', kind: 'feature', script: 'assets/js/modules/87-idcards.js' },
  { id: 'render', kind: 'core', script: 'assets/js/core/90-render-boot.js' },
  { id: 'api', kind: 'core', script: 'assets/js/core/95-api-adapter.js' },
  { id: 'crm-api', kind: 'core', script: 'assets/js/core/96-crm-api-adapter.js' },
  { id: 'parents-api', kind: 'core', script: 'assets/js/core/97-parents-api-adapter.js' },
  { id: 'roles-api', kind: 'core', script: 'assets/js/core/98-roles-api-adapter.js' },
] as const;

export const APP_SCRIPTS: readonly string[] = RUNTIME_MODULES.map(({ script }) => script);
