import Floor from '../model/floor.js';

// Create a new Floor (Supports single object or bulk array)
export const createFloor = async (req, res) => {
  try {
    const data = req.body;

    if (Array.isArray(data)) {
      const floors = await Floor.insertMany(data);
      return res.status(201).json({
        success: true,
        message: 'Floors created successfully',
        count: floors.length,
        data: floors,
      });
    }

    const { floorId, name, level, svgFile, svgWidth, svgHeight } = data;

    if (!floorId || !name || level === undefined || !svgFile || !svgWidth || !svgHeight) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: floorId, name, level, svgFile, svgWidth, svgHeight',
      });
    }

    const existingFloor = await Floor.findOne({ floorId });
    if (existingFloor) {
      return res.status(400).json({
        success: false,
        message: `Floor with floorId '${floorId}' already exists`,
      });
    }

    const floor = await Floor.create({
      floorId,
      name,
      level,
      svgFile,
      svgWidth,
      svgHeight,
    });

    return res.status(201).json({
      success: true,
      message: 'Floor created successfully',
      data: floor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating floor',
      error: error.message,
    });
  }
};

// Get all Floors
export const getFloors = async (req, res) => {
  try {
    const floors = await Floor.find().sort({ level: 1 });
    return res.status(200).json({
      success: true,
      count: floors.length,
      data: floors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching floors',
      error: error.message,
    });
  }
};

// Get single Floor by floorId
export const getFloorById = async (req, res) => {
  try {
    const { floorId } = req.params;
    const floor = await Floor.findOne({ floorId });

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: `Floor with floorId '${floorId}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: floor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching floor',
      error: error.message,
    });
  }
};

// Update Floor by floorId
export const updateFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const updatedFloor = await Floor.findOneAndUpdate({ floorId }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedFloor) {
      return res.status(404).json({
        success: false,
        message: `Floor with floorId '${floorId}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Floor updated successfully',
      data: updatedFloor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating floor',
      error: error.message,
    });
  }
};

// Delete Floor by floorId
export const deleteFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const deletedFloor = await Floor.findOneAndDelete({ floorId });

    if (!deletedFloor) {
      return res.status(404).json({
        success: false,
        message: `Floor with floorId '${floorId}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Floor deleted successfully',
      data: deletedFloor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting floor',
      error: error.message,
    });
  }
};
