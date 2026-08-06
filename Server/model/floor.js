import mongoose from 'mongoose';

const floorSchema = new mongoose.Schema(
  {
    floorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
    },
    svgFile: {
      type: String,
      required: true,
      trim: true,
    },
    svgWidth: {
      type: Number,
      required: true,
    },
    svgHeight: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const Floor = mongoose.model('Floor', floorSchema);

export default Floor;
