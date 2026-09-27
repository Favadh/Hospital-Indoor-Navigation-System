import mongoose from 'mongoose';

const edgeSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      ref: 'Node',
      required: true,
    },
    to: {
      type: String,
      ref: 'Node',
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    floor: {
      type: String,
      ref: 'Floor',
      default: 'ground',
    },
  },
  { timestamps: true }
);

const Edge = mongoose.model('Edge', edgeSchema);

export default Edge;
