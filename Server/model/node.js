import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    floor: {
      type: String,
      ref: 'Floor',
      required: true,
    },
  },
  { timestamps: true }
);

const Node = mongoose.model('Node', nodeSchema);

export default Node;
