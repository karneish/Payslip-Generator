import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { validate } from '../middlewares/validation.middleware';
import {
  createAttendanceSchema,
  updateAttendanceSchema,
  attendanceQuerySchema,
  attendanceIdParamSchema
} from '../validators/attendance.validator';

const router = Router();

router.post('/', validate(createAttendanceSchema), AttendanceController.create);
router.get('/dashboard', AttendanceController.getDashboardAttendance);
router.get('/monthly-summary', AttendanceController.getMonthlySummary);
router.post('/sync', AttendanceController.syncFromJibble);
router.get('/', validate(attendanceQuerySchema), AttendanceController.findAll);
router.get('/:id', validate(attendanceIdParamSchema), AttendanceController.findOne);
router.put('/:id', validate(updateAttendanceSchema), AttendanceController.update);
router.delete('/:id', validate(attendanceIdParamSchema), AttendanceController.delete);

export { router as attendanceRoutes };
