import { Router } from 'express';
import { getHealthStatus, getEmailHealthStatus } from '../controllers/healthController.js';

const router = Router();

router.get('/health', getHealthStatus);
router.get('/health/email', getEmailHealthStatus);

export default router;
