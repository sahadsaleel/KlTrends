import { Router } from 'express';
import { protect, requireDepartment } from '../middleware/authMiddleware.js';
import { createMediaActivity, getMediaActivities } from '../controllers/mediaController.js';

const router = Router();
router.use(protect);
router.use(requireDepartment('media'));

router.post('/video-shoots', createMediaActivity('video-shoot'));
router.get('/video-shoots', getMediaActivities('video-shoot'));
router.post('/video-out', createMediaActivity('video-out'));
router.get('/video-out', getMediaActivities('video-out'));

export default router;