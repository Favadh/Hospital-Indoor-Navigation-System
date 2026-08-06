import express from 'express';
import { getShortestPath } from '../control/navigationController.js';

const router = express.Router();

// GET & POST /api/navigation/shortest-path
router.route('/shortest-path')
  .get(getShortestPath)
  .post(getShortestPath);

export default router;
