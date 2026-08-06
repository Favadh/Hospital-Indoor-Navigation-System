import mongoose from 'mongoose';

const edgeSchema = new mongoose.Schema(
  {
    edgeId: {
      type: String,
      required: true,
      trim: true,
    },
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
    bidirectional: {
      type: Boolean,
      default: true,
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
