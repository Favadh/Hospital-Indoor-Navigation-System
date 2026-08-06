import mongoose from 'mongoose';

const floorSchema = new mongoose.Schema(
  {
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
);

const Floor = mongoose.model('Floor', floorSchema);

export default Floor;
