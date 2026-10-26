import { databaseReady } from './utils/readiness';
import { measureRequests } from './middleware/operationalMetrics';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import pinoHttp from 'pino-http';
import { env, corsAllowedOrigins } from './config/env';
import { logger } from './utils/logger';
import { requestContext } from './middleware/requestContext';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import notificationsRoutes from './modules/notifications/notifications.routes';
import inboxRoutes from './modules/notifications/notifications.inbox.routes';
import { receiveWebhook } from './modules/notifications/notifications.service';
import { asyncHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import studentRoutes from './modules/students/student.routes';
import staffRoutes from './modules/staff/staff.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import feesRoutes from './modules/fees/fees.routes';
import examsRoutes from './modules/exams/exams.routes';
import curriculumRoutes from './modules/curriculum/curriculum.routes';
import libraryRoutes from './modules/library/library.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import helpdeskRoutes from './modules/helpdesk/helpdesk.routes';
import certificatesRoutes from './modules/certificates/certificates.routes';
import facilitiesRoutes from './modules/facilities/facilities.routes';
import eventsRoutes from './modules/events/events.routes';
import auditRoutes from './modules/audit/audit.routes';
import surveysRoutes from './modules/surveys/surveys.routes';
import transportRoutes from './modules/transport/transport.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import hostelRoutes from './modules/hostel/hostel.routes';
import behaviourRoutes from './modules/behaviour/behaviour.routes';
import healthRoutes from './modules/health/health.routes';
import cafeteriaRoutes from './modules/cafeteria/cafeteria.routes';
import visitorsRoutes from './modules/visitors/visitors.routes';
import biometricRoutes from './modules/biometric/biometric.routes';
import alumniRoutes from './modules/alumni/alumni.routes';
import lmsRoutes from './modules/lms/lms.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import announcementsRoutes from './modules/announcements/announcements.routes';
import admissionsRoutes from './modules/admissions/admissions.routes';
import leaveRoutes from './modules/leave/leave.routes';
import meetingsRoutes from './modules/meetings/meetings.routes';
import documentsRoutes from './modules/documents/documents.routes';
import idcardsRoutes from './modules/idcards/idcards.routes';
import reportsRoutes from './modules/reports/reports.routes';
import settingsRoutes from './modules/settings/settings.routes';
import messagesRoutes from './modules/messages/messages.routes';
import classesRoutes from './modules/classes/classes.routes';
import crmRoutes from './modules/crm/crm.routes';
import guardianRoutes from './modules/guardians/guardians.routes';
import rolesRoutes from './modules/roles/roles.routes';

export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (ALB/CloudFront in AWS) so req.ip / rate-limiting see the real client IP.
  app.set('trust proxy', 1);

  app.use(requestContext);
  app.use(measureRequests);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as Request).requestId,
      // Redact anything that could contain a credential or token from access logs.
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.refreshToken',
      ],
      customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsAllowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(env.API_PREFIX, (_req: Request, res: Response, next) => {
    // School records and authenticated responses must never enter a shared/browser cache.
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  app.post(
    `${env.API_PREFIX}/notifications/resend-webhook`,
    express.raw({ type: 'application/json', limit: '100kb' }),
    asyncHandler(async (req, res) => {
      await receiveWebhook(req.body as Buffer, {
        'svix-id': String(req.headers['svix-id'] || ''),
        'svix-timestamp': String(req.headers['svix-timestamp'] || ''),
        'svix-signature': String(req.headers['svix-signature'] || ''),
      });
      res.status(200).json({ success: true });
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(mongoSanitize()); // strips $/dot operators from req.body/query/params - blocks NoSQL injection

  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    // Integration tests exercise hundreds of requests from one loopback IP. Rate limiting is
    // covered separately and must not make unrelated suites order-dependent.
    skip: () => env.NODE_ENV === 'test',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(env.API_PREFIX, globalLimiter);

  // ---- Health & readiness (for AWS ALB / ECS health checks) ----
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });
  app.get('/ready', async (_req: Request, res: Response) => {
    const dbReady = await databaseReady();
    res.status(dbReady ? 200 : 503).json({ status: dbReady ? 'ready' : 'not-ready', db: dbReady });
  });

  // ---- API routes (versioned) ----
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/students`, studentRoutes);
  app.use(`${env.API_PREFIX}/staff`, staffRoutes);
  app.use(`${env.API_PREFIX}/attendance`, attendanceRoutes);
  app.use(`${env.API_PREFIX}/fees`, feesRoutes);
  app.use(`${env.API_PREFIX}/exams`, examsRoutes);
  app.use(`${env.API_PREFIX}/curriculum`, curriculumRoutes);
  app.use(`${env.API_PREFIX}/library`, libraryRoutes);
  app.use(`${env.API_PREFIX}/payroll`, payrollRoutes);
  app.use(`${env.API_PREFIX}/expenses`, expensesRoutes);
  app.use(`${env.API_PREFIX}/helpdesk`, helpdeskRoutes);
  app.use(`${env.API_PREFIX}/certificates`, certificatesRoutes);
  app.use(`${env.API_PREFIX}/facilities`, facilitiesRoutes);
  app.use(`${env.API_PREFIX}/events`, eventsRoutes);
  app.use(`${env.API_PREFIX}/audit-log`, auditRoutes);
  app.use(`${env.API_PREFIX}/surveys`, surveysRoutes);
  app.use(`${env.API_PREFIX}/transport`, transportRoutes);
  app.use(`${env.API_PREFIX}/inventory`, inventoryRoutes);
  app.use(`${env.API_PREFIX}/hostel`, hostelRoutes);
  app.use(`${env.API_PREFIX}/behaviour`, behaviourRoutes);
  app.use(`${env.API_PREFIX}/health-records`, healthRoutes);
  app.use(`${env.API_PREFIX}/cafeteria`, cafeteriaRoutes);
  app.use(`${env.API_PREFIX}/visitors`, visitorsRoutes);
  app.use(`${env.API_PREFIX}/biometric`, biometricRoutes);
  app.use(`${env.API_PREFIX}/alumni`, alumniRoutes);
  app.use(`${env.API_PREFIX}/lms`, lmsRoutes);
  app.use(`${env.API_PREFIX}/timetable`, timetableRoutes);
  app.use(`${env.API_PREFIX}/announcements`, announcementsRoutes);
  app.use(`${env.API_PREFIX}/admissions`, admissionsRoutes);
  app.use(`${env.API_PREFIX}/leave`, leaveRoutes);
  app.use(`${env.API_PREFIX}/meetings`, meetingsRoutes);
  app.use(`${env.API_PREFIX}/documents`, documentsRoutes);
  app.use(`${env.API_PREFIX}/id-cards`, idcardsRoutes);
  app.use(`${env.API_PREFIX}/reports`, reportsRoutes);
  app.use(`${env.API_PREFIX}/settings`, settingsRoutes);
  app.use(`${env.API_PREFIX}/inbox`, inboxRoutes);
  app.use(`${env.API_PREFIX}/notifications`, notificationsRoutes);
  app.use(`${env.API_PREFIX}/messages`, messagesRoutes);
  app.use(`${env.API_PREFIX}/classes`, classesRoutes);
  app.use(`${env.API_PREFIX}/crm`, crmRoutes);
  app.use(`${env.API_PREFIX}/guardians`, guardianRoutes);
  app.use(`${env.API_PREFIX}/roles`, rolesRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
