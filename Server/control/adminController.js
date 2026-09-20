import Admin from '../model/admin.js';

// Vibrant color palette for random admin avatars
const AVATAR_COLORS = [
  '#00ff88', '#00d2d3', '#4285F4', '#a855f7',
  '#ff4757', '#ffa502', '#2ed573', '#1e90ff',
  '#ff6b81', '#70a1ff', '#e056fd', '#686de0'
];

const getRandomColor = () => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

// Helper to ensure default super admin exists
const ensureDefaultAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      await Admin.create({
        username: 'admin',
        email: 'admin@hospital.medinav.io',
        password: 'admin123',
        role: 'Super Admin',
        status: 'Active',
        lastLogin: new Date(),
        avatarColor: getRandomColor(),
      });
      console.log('🌱 Auto-seeded default Super Admin (admin / admin123)');
    }
  } catch (err) {
    // Ignore duplicate key or connection errors during race conditions
  }
};

// 1. Create a new Administrator (No 'name', only 'username', 'email', 'password', 'role', 'status')
export const createAdmin = async (req, res) => {
  try {
    const { username, email, password, role, status, avatarColor } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: username, email, password',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username is already taken
    const existingUsername = await Admin.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: `Username '@${cleanUsername}' is already taken`,
      });
    }

    // Check if email is already taken
    const existingEmail = await Admin.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Email '${cleanEmail}' is already registered`,
      });
    }

    const admin = await Admin.create({
      username: cleanUsername,
      email: cleanEmail,
      password: password.trim(),
      role: role || 'Spatial Editor',
      status: status || 'Inactive',
      avatarColor: avatarColor || getRandomColor(),
    });

    const adminSafe = admin.toObject();
    delete adminSafe.password;

    return res.status(201).json({
      success: true,
      message: 'Administrator created successfully',
      data: adminSafe,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating administrator',
      error: error.message,
    });
  }
};

// 2. Get all Administrators (with optional search query matching username/email/role and filters)
export const getAdmins = async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { q, role, status } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { role: searchRegex },
      ];
    }

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const admins = await Admin.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching administrators',
      error: error.message,
    });
  }
};

// 3. Get single Administrator by ID
export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: `Administrator with ID '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching administrator details',
      error: error.message,
    });
  }
};

// 4. Update Administrator by ID
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, status, avatarColor } = req.body;

    const existingAdmin = await Admin.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: `Administrator with ID '${id}' not found`,
      });
    }

    // If changing username, check uniqueness
    if (username && username.trim().toLowerCase() !== existingAdmin.username) {
      const duplicateUser = await Admin.findOne({
        username: username.trim().toLowerCase(),
        _id: { $ne: id },
      });
      if (duplicateUser) {
        return res.status(400).json({
          success: false,
          message: `Username '@${username.trim().toLowerCase()}' is already in use`,
        });
      }
      existingAdmin.username = username.trim().toLowerCase();
    }

    // If changing email, check uniqueness
    if (email && email.trim().toLowerCase() !== existingAdmin.email) {
      const duplicateEmail = await Admin.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: id },
      });
      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: `Email '${email.trim().toLowerCase()}' is already in use`,
        });
      }
      existingAdmin.email = email.trim().toLowerCase();
    }

    if (role) existingAdmin.role = role;
    if (avatarColor) existingAdmin.avatarColor = avatarColor;
    if (password && password.trim()) {
      existingAdmin.password = password.trim();
    }

    const updatedAdmin = await existingAdmin.save();
    const safeData = updatedAdmin.toObject();
    delete safeData.password;

    return res.status(200).json({
      success: true,
      message: 'Administrator updated successfully',
      data: safeData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating administrator',
      error: error.message,
    });
  }
};

// 5. Delete Administrator by ID
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: `Administrator with ID '${id}' not found`,
      });
    }

    // Protect primary root admin
    if (admin.username === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'The primary root administrator cannot be deleted',
      });
    }

    await Admin.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Administrator '@${admin.username}' deleted successfully`,
      data: { id: admin._id, username: admin.username },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting administrator',
      error: error.message,
    });
  }
};

// 6. Admin Login: sets status to 'Active' and updates lastLogin
export const loginAdmin = async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password',
      });
    }

    const cleanInput = username.trim().toLowerCase();

    // Support logging in with username OR email
    const admin = await Admin.findOne({
      $or: [{ username: cleanInput }, { email: cleanInput }],
    });

    if (!admin || admin.password !== password.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // When admin logs in, mark status as Active and record lastLogin timestamp
    admin.status = 'Active';
    admin.lastLogin = new Date();
    await admin.save();

    const safeAdmin = admin.toObject();
    delete safeAdmin.password;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: safeAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
  }
};

// 7. Admin Logout: sets status to 'Inactive'
export const logoutAdmin = async (req, res) => {
  try {
    const { id, username } = req.body;

    let admin = null;
    if (id) {
      admin = await Admin.findById(id);
    } else if (username) {
      admin = await Admin.findOne({ username: username.trim().toLowerCase() });
    }

    if (admin) {
      admin.status = 'Inactive';
      await admin.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully, status updated to Inactive',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message,
    });
  }
};
