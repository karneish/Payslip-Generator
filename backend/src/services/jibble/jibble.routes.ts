import { Router } from 'express';
import { JibbleController } from './jibble.controller';

const router = Router();

router.post('/sync', JibbleController.syncAttendance);
router.get('/live', JibbleController.getLiveAttendance);
router.get('/test-connection', JibbleController.testConnection);
router.get('/history', JibbleController.getSyncHistory);
router.post('/map-employee', JibbleController.mapEmployee);
router.get('/employees', JibbleController.fetchEmployees);
router.post('/provision-employees', JibbleController.provisionEmployees);

export { router as jibbleRoutes };
