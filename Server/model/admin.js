import mongoose from 'mongoose';

// Vibrant color palette for random admin avatars
const AVATAR_COLORS = [
  '#00ff88', '#00d2d3', '#4285F4', '#a855f7',
  '#ff4757', '#ffa502', '#2ed573', '#1e90ff',
  '#ff6b81', '#70a1ff', '#e056fd', '#686de0'
];

const getRandomAvatarColor = () => {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a unique username'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
    },
    role: {
      type: String,
      enum: ['Super Admin', 'Spatial Editor', 'Hospital Staff'],
      default: 'Spatial Editor',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Inactive',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    avatarColor: {
      type: String,
      default: getRandomAvatarColor,
    },
  },
  { timestamps: true }
);

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
