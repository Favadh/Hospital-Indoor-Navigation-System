import express from 'express';
import {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  logoutAdmin,
} from '../control/adminController.js';

const router = express.Router();

// Authentication Routes
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

// Admin CRUD Routes
router.route('/')
  .get(getAdmins)
  .post(createAdmin);

router.route('/:id')
  .get(getAdminById)
  .put(updateAdmin)
  .delete(deleteAdmin);

export default router;
