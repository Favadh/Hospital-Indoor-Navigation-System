import Node from '../model/node.js';

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

// Update Node by MongoDB _id
export const updateNode = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedNode = await Node.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedNode) {
      return res.status(404).json({
        success: false,
        message: `Node with id '${id}' not found`,
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

// Delete Node by MongoDB _id
export const deleteNode = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNode = await Node.findByIdAndDelete(id);

    if (!deletedNode) {
      return res.status(404).json({
        success: false,
        message: `Node with id '${id}' not found`,
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
