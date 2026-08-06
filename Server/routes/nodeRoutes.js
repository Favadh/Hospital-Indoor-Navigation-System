import express from 'express';
import {
  createNode,
  getNodes,
  getNodeById,
  updateNode,
  deleteNode,
} from '../control/nodeController.js';

const router = express.Router();

router.route('/')
  .post(createNode)
  .get(getNodes);

router.route('/:nodeId')
  .get(getNodeById)
  .put(updateNode)
  .delete(deleteNode);

export default router;
