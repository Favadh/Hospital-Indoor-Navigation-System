import express from 'express';
import {
  createFloor,
  getFloors,
  getFloorById,
  updateFloor,
  deleteFloor,
} from '../control/floorController.js';

const router = express.Router();

router.route('/')
  .post(createFloor)
  .get(getFloors);

router.route('/:floorId')
  .get(getFloorById)
  .put(updateFloor)
  .delete(deleteFloor);

export default router;
