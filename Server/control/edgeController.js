import Edge from '../model/edge.js';
import Node from '../model/node.js';

// Helper function to auto-calculate Euclidean distance between two nodes by name
const calculateDistance = async (fromName, toName) => {
  const fromNode = await Node.findOne({ name: fromName });
  const toNode = await Node.findOne({ name: toName });
  if (fromNode && toNode) {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    return Math.round(Math.hypot(dx, dy));
  }
  return 0;
};

// Create a new Edge (Supports single object or bulk array)
export const createEdge = async (req, res) => {
  try {
    const data = req.body;

    if (Array.isArray(data)) {
      // Process bulk edges and auto-calculate weights if missing
      const preparedEdges = await Promise.all(
        data.map(async (edgeItem) => {
          let w = edgeItem.weight;
          if (w === undefined || w === null) {
            w = await calculateDistance(edgeItem.from, edgeItem.to);
          }
          return {
            ...edgeItem,
            weight: w,
          };
        })
      );

      const edges = await Edge.insertMany(preparedEdges);
      return res.status(201).json({
        success: true,
        message: 'Edges created successfully',
        count: edges.length,
        data: edges,
      });
    }

    const { from, to, weight, bidirectional, floor } = data;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: from, to',
      });
    }

    let calculatedWeight = weight;
    if (calculatedWeight === undefined || calculatedWeight === null) {
      calculatedWeight = await calculateDistance(from, to);
    }

    const edge = await Edge.create({
      from,
      to,
      weight: calculatedWeight,
      bidirectional: bidirectional !== undefined ? bidirectional : true,
      floor,
    });

    return res.status(201).json({
      success: true,
      message: 'Edge created successfully',
      data: edge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating edge',
      error: error.message,
    });
  }
};

// Get all Edges (Optional filter by floor query e.g. GET /api/edges?floor=ground)
export const getEdges = async (req, res) => {
  try {
    const filter = {};
    if (req.query.floor) {
      filter.floor = req.query.floor;
    }

    const edges = await Edge.find(filter);
    return res.status(200).json({
      success: true,
      count: edges.length,
      data: edges,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching edges',
      error: error.message,
    });
  }
};

// Get single Edge by MongoDB _id
export const getEdgeById = async (req, res) => {
  try {
    const { id } = req.params;
    const edge = await Edge.findById(id);

    if (!edge) {
      return res.status(404).json({
        success: false,
        message: `Edge with id '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: edge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching edge',
      error: error.message,
    });
  }
};

// Update Edge by MongoDB _id
export const updateEdge = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEdge = await Edge.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedEdge) {
      return res.status(404).json({
        success: false,
        message: `Edge with id '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Edge updated successfully',
      data: updatedEdge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating edge',
      error: error.message,
    });
  }
};

// Delete Edge by MongoDB _id
export const deleteEdge = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEdge = await Edge.findByIdAndDelete(id);

    if (!deletedEdge) {
      return res.status(404).json({
        success: false,
        message: `Edge with id '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Edge deleted successfully',
      data: deletedEdge,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting edge',
      error: error.message,
    });
  }
};
