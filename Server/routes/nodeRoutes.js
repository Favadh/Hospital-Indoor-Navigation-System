import express from 'express';
import {
  createNode,
  getNodes,
  getNodeById,
  updateNode,
  deleteNode,
  syncGraph,
} from '../control/nodeController.js';

const router = express.Router();

router.post('/sync-graph', syncGraph);

router.route('/')
  .post(createNode)
  .get(getNodes);

router.route('/:id')
  .get(getNodeById)
  .put(updateNode)
  .delete(deleteNode);

export default router;
