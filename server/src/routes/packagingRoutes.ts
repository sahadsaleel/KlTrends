import { Router } from 'express';
import { protect, requireDepartment } from '../middleware/authMiddleware.js';
import { createPackingRecord, getPackingRecords } from '../controllers/packagingController.js';

const router = Router();
router.use(protect);
router.use(requireDepartment('packaging'));
router.post('/packing-records', createPackingRecord);
router.get('/packing-records', getPackingRecords);

export default router;