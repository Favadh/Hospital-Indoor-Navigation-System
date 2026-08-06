import Edge from '../model/edge.js';
import Node from '../model/node.js';

// Helper function to auto-calculate Euclidean distance between two nodes if weight is missing
const calculateDistance = async (fromNodeId, toNodeId) => {
  const fromNode = await Node.findOne({ nodeId: fromNodeId });
  const toNode = await Node.findOne({ nodeId: toNodeId });
  if (fromNode && toNode) {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    return Math.hypot(dx, dy);
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

    const { edgeId, from, to, weight, bidirectional, floor } = data;

    if (!edgeId || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: edgeId, from, to',
      });
    }

    const existingEdge = await Edge.findOne({ edgeId });
    if (existingEdge) {
      return res.status(400).json({
        success: false,
        message: `Edge with edgeId '${edgeId}' already exists`,
      });
    }

    let calculatedWeight = weight;
    if (calculatedWeight === undefined || calculatedWeight === null) {
      calculatedWeight = await calculateDistance(from, to);
    }

    const edge = await Edge.create({
      edgeId,
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

// Get single Edge by edgeId
export const getEdgeById = async (req, res) => {
  try {
    const { edgeId } = req.params;
    const edge = await Edge.findOne({ edgeId });

    if (!edge) {
      return res.status(404).json({
        success: false,
        message: `Edge with edgeId '${edgeId}' not found`,
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

// Update Edge by edgeId
export const updateEdge = async (req, res) => {
  try {
    const { edgeId } = req.params;
    const updatedEdge = await Edge.findOneAndUpdate({ edgeId }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedEdge) {
      return res.status(404).json({
        success: false,
        message: `Edge with edgeId '${edgeId}' not found`,
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

// Delete Edge by edgeId
export const deleteEdge = async (req, res) => {
  try {
    const { edgeId } = req.params;
    const deletedEdge = await Edge.findOneAndDelete({ edgeId });

    if (!deletedEdge) {
      return res.status(404).json({
        success: false,
        message: `Edge with edgeId '${edgeId}' not found`,
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
