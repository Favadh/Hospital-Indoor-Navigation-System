import Node from '../model/node.js';
import Edge from '../model/edge.js';
import { findShortestPath } from '../utils/dijkstra.js';

// GET or POST /api/navigation/shortest-path
export const getShortestPath = async (req, res) => {
  try {
    const start = req.query?.start || req.body?.start;
    const destination = req.query?.destination || req.body?.destination;
    const floor = req.query?.floor || req.body?.floor || 'ground';

    if (!start || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both start and destination parameters',
      });
    }

    // Fetch nodes and edges from MongoDB
    let nodes = await Node.find({ floor }).lean();
    if (!nodes.length) {
      nodes = await Node.find({}).lean();
    }

    let edges = await Edge.find({ floor }).lean();
    if (!edges.length) {
      edges = await Edge.find({}).lean();
    }

    if (!nodes.length || !edges.length) {
      return res.status(404).json({
        success: false,
        message: `No nodes or edges found in database`,
      });
    }

    // Run Dijkstra pathfinder
    const result = findShortestPath(start, destination, nodes, edges);

    if (!result.path || !result.path.length) {
      return res.status(404).json({
        success: false,
        message: `No walkable path found from '${start}' to '${destination}'`,
      });
    }

    return res.status(200).json({
      success: true,
      floor,
      start,
      destination,
      totalDistance: result.totalDistance,
      waypointCount: result.path.length,
      path: result.path,
    });
  } catch (error) {
    console.error('Dijkstra navigation error:', error.stack || error);
    return res.status(500).json({
      success: false,
      message: 'Error computing shortest path',
      error: error.message,
    });
  }
};
