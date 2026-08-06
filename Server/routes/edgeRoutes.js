import express from 'express';
import {
  createEdge,
  getEdges,
  getEdgeById,
  updateEdge,
  deleteEdge,
} from '../control/edgeController.js';

const router = express.Router();

router.route('/')
  .post(createEdge)
  .get(getEdges);

router.route('/:edgeId')
  .get(getEdgeById)
  .put(updateEdge)
  .delete(deleteEdge);

export default router;
