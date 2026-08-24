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

    const { name, level, svgFile, svgWidth, svgHeight } = data;

    if (!name || level === undefined || !svgFile || !svgWidth || !svgHeight) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, level, svgFile, svgWidth, svgHeight',
      });
    }

    const existingFloor = await Floor.findOne({ name });
    if (existingFloor) {
      return res.status(400).json({
        success: false,
        message: `Floor with name '${name}' already exists`,
      });
    }

    const floor = await Floor.create({ name, level, svgFile, svgWidth, svgHeight });

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

// Get single Floor by MongoDB _id
export const getFloorById = async (req, res) => {
  try {
    const { id } = req.params;
    const floor = await Floor.findById(id);

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: `Floor with id '${id}' not found`,
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

// Update Floor by MongoDB _id
export const updateFloor = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFloor = await Floor.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedFloor) {
      return res.status(404).json({
        success: false,
        message: `Floor with id '${id}' not found`,
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

// Delete Floor by MongoDB _id
export const deleteFloor = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFloor = await Floor.findByIdAndDelete(id);

    if (!deletedFloor) {
      return res.status(404).json({
        success: false,
        message: `Floor with id '${id}' not found`,
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
