import { Router } from 'express';
import * as controller from './transport.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createVehicleSchema, createRouteSchema, listRoutesSchema, assignStudentSchema, routeOperationalStatusSchema, vehicleMaintenanceSchema, createIncidentSchema, listIncidentsSchema } from './transport.validation';

const router = Router();

router.use(requireAuth);

router.get('/vehicles', controller.listVehicles);
router.post(
  '/vehicles',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createVehicleSchema),
  controller.addVehicle,
);
router.patch('/vehicles/:id/maintenance', requireRole('Administrator', 'Principal', 'Teacher'), validate(vehicleMaintenanceSchema), controller.scheduleMaintenance);

router.get('/routes', validate(listRoutesSchema), controller.listRoutes);
router.get('/incidents', validate(listIncidentsSchema), controller.listIncidents);
router.post(
  '/routes',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createRouteSchema),
  controller.addRoute,
);
router.patch('/routes/:id/operational-status', requireRole('Administrator', 'Principal', 'Teacher'), validate(routeOperationalStatusSchema), controller.updateOperationalStatus);
router.post('/routes/:id/incidents', requireRole('Administrator', 'Principal', 'Teacher'), validate(createIncidentSchema), controller.createIncident);
router.post(
  '/routes/:id/assign',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(assignStudentSchema),
  controller.assignStudent,
);

export default router;
