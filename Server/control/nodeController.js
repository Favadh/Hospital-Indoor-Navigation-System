import Node from '../model/node.js';
import Edge from '../model/edge.js';

// Create a new Node (Supports single object or bulk array)
export const createNode = async (req, res) => {
  try {
    const data = req.body;

    if (Array.isArray(data)) {
      const nodes = await Node.insertMany(data);
      return res.status(201).json({
        success: true,
        message: 'Nodes created successfully',
        count: nodes.length,
        data: nodes,
      });
    }

    const { name, type, x, y, floor } = data;

    if (!name || !type || x === undefined || y === undefined || !floor) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, type, x, y, floor',
      });
    }

    const existingNode = await Node.findOne({ name });
    if (existingNode) {
      return res.status(400).json({
        success: false,
        message: `Node with name '${name}' already exists`,
      });
    }

    const node = await Node.create({ name, type, x, y, floor });

    return res.status(201).json({
      success: true,
      message: 'Node created successfully',
      data: node,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating node',
      error: error.message,
    });
  }
};

// Get all Nodes (Optional filter by floor query e.g. GET /api/nodes?floor=ground)
export const getNodes = async (req, res) => {
  try {
    const filter = {};
    if (req.query.floor) {
      filter.floor = req.query.floor;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const nodes = await Node.find(filter);
    return res.status(200).json({
      success: true,
      count: nodes.length,
      data: nodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching nodes',
      error: error.message,
    });
  }
};

// Get single Node by MongoDB _id
export const getNodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const node = await Node.findById(id);

    if (!node) {
      return res.status(404).json({
        success: false,
        message: `Node with id '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: node,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching node',
      error: error.message,
    });
  }
};

// Update Node by MongoDB _id or name
export const updateNode = async (req, res) => {
  try {
    const { id } = req.params;
    let updatedNode = null;

    if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
      updatedNode = await Node.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!updatedNode && id) {
      updatedNode = await Node.findOneAndUpdate({ name: id }, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!updatedNode) {
      return res.status(404).json({
        success: false,
        message: `Node '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Node updated successfully',
      data: updatedNode,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating node',
      error: error.message,
    });
  }
};

// Delete Node by MongoDB _id or name
export const deleteNode = async (req, res) => {
  try {
    const { id } = req.params;
    let deletedNode = null;

    if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
      deletedNode = await Node.findByIdAndDelete(id);
    }

    if (!deletedNode && id) {
      deletedNode = await Node.findOneAndDelete({ name: id });
    }

    if (!deletedNode) {
      return res.status(404).json({
        success: false,
        message: `Node '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Node deleted successfully',
      data: deletedNode,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting node',
      error: error.message,
    });
  }
};

// Synchronize an entire floor blueprint graph (nodes and edges) in one atomic batch
export const syncGraph = async (req, res) => {
  try {
    const { floor, nodes = [], edges = [] } = req.body;

    if (!floor) {
      return res.status(400).json({
        success: false,
        message: 'Floor level is required for graph synchronization',
      });
    }

    const floorStr = String(floor);

    // Normalize floor query to catch both string and numeric aliases
    const floorAliases = [floorStr];
    if (floorStr === '0' || floorStr.toLowerCase() === 'ground') {
      floorAliases.push('0', 'ground', 'Ground Floor');
    }
    if (floorStr === '1' || floorStr.toLowerCase() === 'first') {
      floorAliases.push('1', 'first', 'First Floor');
    }

    // 1. Clean existing nodes and edges on this floor
    await Node.deleteMany({ floor: { $in: floorAliases } });
    await Edge.deleteMany({ floor: { $in: floorAliases } });

    // 2. Prepare validated nodes
    const preparedNodes = nodes.map((n) => ({
      name: String(n.name).trim(),
      type: n.type || 'room',
      x: Math.round(Number(n.x) || 0),
      y: Math.round(Number(n.y) || 0),
      floor: String(n.floor || floorStr),
    }));

    // Deduplicate node names on this floor
    const uniqueNodes = [];
    const seenNodeNames = new Set();
    for (const nodeItem of preparedNodes) {
      if (nodeItem.name && !seenNodeNames.has(nodeItem.name)) {
        seenNodeNames.add(nodeItem.name);
        uniqueNodes.push(nodeItem);
      }
    }

    const insertedNodes = uniqueNodes.length > 0 ? await Node.insertMany(uniqueNodes) : [];

    // Map for fast lookup of node coordinates
    const nodeCoordMap = new Map();
    insertedNodes.forEach((n) => nodeCoordMap.set(n.name, n));

    // 3. Prepare validated edges
    const preparedEdges = [];
    const seenEdges = new Set();

    for (const e of edges) {
      const from = String(e.from).trim();
      const to = String(e.to).trim();
      if (!from || !to || from === to) continue;
      // Skip if either endpoint node does not exist
      if (!seenNodeNames.has(from) || !seenNodeNames.has(to)) continue;

      const edgeKey = from < to ? `${from}_${to}` : `${to}_${from}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      let weight = Number(e.weight || e.distance);
      if (!weight || isNaN(weight) || weight <= 0) {
        const n1 = nodeCoordMap.get(from);
        const n2 = nodeCoordMap.get(to);
        if (n1 && n2) {
          weight = Math.max(1, Math.round(Math.hypot(n2.x - n1.x, n2.y - n1.y)));
        } else {
          weight = 10;
        }
      }

      preparedEdges.push({
        from,
        to,
        weight,
        floor: String(e.floor || floorStr),
      });
    }

    const insertedEdges = preparedEdges.length > 0 ? await Edge.insertMany(preparedEdges) : [];

    return res.status(200).json({
      success: true,
      message: `Blueprint graph saved successfully (${insertedNodes.length} nodes, ${insertedEdges.length} edges)`,
      count: {
        nodes: insertedNodes.length,
        edges: insertedEdges.length,
      },
      data: {
        nodes: insertedNodes,
        edges: insertedEdges,
      },
    });
  } catch (error) {
    console.error('syncGraph error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving blueprint graph',
      error: error.message,
    });
  }
};
