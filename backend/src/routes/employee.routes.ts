import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { validate } from '../middlewares/validation.middleware';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeQuerySchema,
  employeeIdParamSchema,
  importEmployeeSchema
} from '../validators/employee.validator';

const router = Router();

router.post('/', validate(createEmployeeSchema), EmployeeController.create);
router.get('/', validate(employeeQuerySchema), EmployeeController.findAll);
router.post('/import', validate(importEmployeeSchema), EmployeeController.importEmployees);
router.get('/export/:format', EmployeeController.exportEmployees);
router.get('/:id', validate(employeeIdParamSchema), EmployeeController.findOne);
router.get('/:id/dependencies', EmployeeController.getDependencies);
router.put('/:id', validate(updateEmployeeSchema), EmployeeController.update);
router.delete('/:id', validate(employeeIdParamSchema), EmployeeController.delete);

router.get('/:id/salary-history', EmployeeController.getSalaryHistory);
router.post('/:id/salary-history', EmployeeController.addSalaryHistory);

export { router as employeeRoutes };
