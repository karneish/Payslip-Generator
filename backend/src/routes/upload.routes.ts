import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', upload.single('file'), UploadController.uploadFile);
router.get('/', UploadController.getUploads);
router.get('/:id', UploadController.getUploadById);
router.post('/:id/save', UploadController.saveParsedData);
router.delete('/:id', UploadController.deleteUpload);

export { router as uploadRoutes };
