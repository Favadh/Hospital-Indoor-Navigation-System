import express from 'express';
import {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
} from '../control/adminController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Public Authentication Routes
router.post('/login', loginAdmin);

// Protected Authentication / Profile Routes
router.get('/profile', auth, getAdminProfile);
router.post('/logout', auth, logoutAdmin);

// Protected Admin CRUD Routes
router.route('/')
  .get(auth, getAdmins)
  .post(auth, createAdmin);

router.route('/:id')
  .get(auth, getAdminById)
  .put(auth, updateAdmin)
  .delete(auth, deleteAdmin);

export default router;
