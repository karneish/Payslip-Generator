import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { validate } from '../middlewares/validation.middleware';
import {
  companyProfileSchema,
  smtpConfigSchema,
  updateAppSettingSchema,
  settingKeyParamSchema,
  createDepartmentSchema,
  createDesignationSchema,
  idParamSchema
} from '../validators/settings.validator';

const router = Router();

router.get('/company', SettingsController.getCompanyProfile);
router.put('/company', validate(companyProfileSchema), SettingsController.updateCompanyProfile);
router.get('/smtp', SettingsController.getSMTPConfig);
router.put('/smtp', validate(smtpConfigSchema), SettingsController.updateSMTPConfig);
router.post('/smtp/test', SettingsController.testSMTPConnection);
router.get('/departments', SettingsController.getDepartments);
router.post('/departments', validate(createDepartmentSchema), SettingsController.createDepartment);
router.put('/departments/:id', SettingsController.updateDepartment);
router.delete('/departments/:id', SettingsController.deleteDepartment);

router.get('/designations', SettingsController.getDesignations);
router.post('/designations', validate(createDesignationSchema), SettingsController.createDesignation);
router.put('/designations/:id', SettingsController.updateDesignation);
router.delete('/designations/:id', SettingsController.deleteDesignation);

router.get('/', SettingsController.getAppSettings);
router.put('/:key', validate(settingKeyParamSchema), SettingsController.updateAppSetting);

export { router as settingsRoutes };
