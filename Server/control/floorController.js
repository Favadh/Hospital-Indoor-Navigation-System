import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Floor from '../model/floor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Safely delete all variations of a physical SVG file from Client/public and Client/dist
const deletePhysicalSvgFiles = (svgFilePath) => {
  if (!svgFilePath) return;
  try {
    const rawBase = path.basename(svgFilePath);
    const decodedBase = decodeURIComponent(rawBase);

    const nameVariations = new Set([
      rawBase,
      decodedBase,
      decodedBase.replace(/\s+/g, '_'),
      decodedBase.replace(/_/g, ' '),
      rawBase.replace(/\s+/g, '_'),
      rawBase.replace(/_/g, ' '),
    ]);

    const clientPublicDir = path.resolve(__dirname, '../../Client/public');
    const clientDistDir = path.resolve(__dirname, '../../Client/dist');

    nameVariations.forEach((fileName) => {
      // Delete from public
      const pubPath = path.join(clientPublicDir, fileName);
      if (fs.existsSync(pubPath)) {
        try {
          fs.unlinkSync(pubPath);
          console.log(`🗑️ Successfully deleted previous SVG from public: ${pubPath}`);
        } catch (e) {
          console.warn(`Could not unlink ${pubPath}:`, e.message);
        }
      }

      // Delete from dist if present
      const distPath = path.join(clientDistDir, fileName);
      if (fs.existsSync(distPath)) {
        try {
          fs.unlinkSync(distPath);
          console.log(`🗑️ Successfully deleted previous SVG from dist: ${distPath}`);
        } catch (e) {
          console.warn(`Could not unlink ${distPath}:`, e.message);
        }
      }
    });
  } catch (err) {
    console.warn('Error during deletePhysicalSvgFiles:', err.message);
  }
};

// Helper: Save SVG content to disk in Client/public and Client/dist
const savePhysicalSvgFile = (cleanFileName, svgContent) => {
  const clientPublicDir = path.resolve(__dirname, '../../Client/public');
  if (!fs.existsSync(clientPublicDir)) {
    fs.mkdirSync(clientPublicDir, { recursive: true });
  }

  const targetFile = path.join(clientPublicDir, cleanFileName);
  fs.writeFileSync(targetFile, svgContent, 'utf-8');
  console.log(`💾 Successfully saved physical SVG blueprint file to: ${targetFile}`);

  const clientDistDir = path.resolve(__dirname, '../../Client/dist');
  if (fs.existsSync(clientDistDir)) {
    const targetDist = path.join(clientDistDir, cleanFileName);
    fs.writeFileSync(targetDist, svgContent, 'utf-8');
  }
};

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

    const { name, level, svgFile, svgWidth, svgHeight, svgData } = data;

    if (!name || level === undefined || level === null || level === '' || !svgFile || !svgWidth || !svgHeight) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, level, svgFile, svgWidth, svgHeight',
      });
    }

    const cleanName = name.trim();
    const cleanLevel = Number(level);
    const cleanWidth = Number(svgWidth);
    const cleanHeight = Number(svgHeight);

    if (isNaN(cleanLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Level must be a valid number',
      });
    }

    if (isNaN(cleanWidth) || cleanWidth <= 0 || isNaN(cleanHeight) || cleanHeight <= 0) {
      return res.status(400).json({
        success: false,
        message: 'SVG dimensions must be positive numbers',
      });
    }

    const existingName = await Floor.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: `Floor with name '${cleanName}' already exists`,
      });
    }

    const existingLevel = await Floor.findOne({ level: cleanLevel });
    if (existingLevel) {
      return res.status(400).json({
        success: false,
        message: `Floor level ${cleanLevel} is already registered (${existingLevel.name})`,
      });
    }

    // Save actual physical SVG file to Client/public/ if svgData content was sent
    let finalSvgPath = svgFile.trim();
    if (svgData && typeof svgData === 'string' && svgData.trim()) {
      try {
        const rawFileName = path.basename(finalSvgPath) || `floor_${cleanLevel}.svg`;
        const cleanFileName = decodeURIComponent(rawFileName).replace(/\s+/g, '_');
        savePhysicalSvgFile(cleanFileName, svgData);
        finalSvgPath = `/${cleanFileName}`;
      } catch (fsErr) {
        console.warn('Could not write physical SVG file to disk:', fsErr.message);
      }
    }

    const floor = await Floor.create({
      name: cleanName,
      level: cleanLevel,
      svgFile: finalSvgPath,
      svgWidth: cleanWidth,
      svgHeight: cleanHeight,
    });

    return res.status(201).json({
      success: true,
      message: 'Floor map registered and physical SVG file saved successfully',
      data: floor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating floor map',
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
    const existingFloor = await Floor.findById(id);

    if (!existingFloor) {
      return res.status(404).json({
        success: false,
        message: `Floor with id '${id}' not found`,
      });
    }

    const { name, level, svgFile, svgWidth, svgHeight, svgData } = req.body;
    const updateData = {};

    if (name !== undefined) {
      const cleanName = name.trim();
      if (cleanName.toLowerCase() !== existingFloor.name.toLowerCase()) {
        const duplicateName = await Floor.findOne({ _id: { $ne: id }, name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
        if (duplicateName) {
          return res.status(400).json({
            success: false,
            message: `Floor with name '${cleanName}' already exists`,
          });
        }
      }
      updateData.name = cleanName;
    }

    if (level !== undefined && level !== null && level !== '') {
      const cleanLevel = Number(level);
      if (isNaN(cleanLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Level must be a valid number',
        });
      }
      if (cleanLevel !== existingFloor.level) {
        const duplicateLevel = await Floor.findOne({ _id: { $ne: id }, level: cleanLevel });
        if (duplicateLevel) {
          return res.status(400).json({
            success: false,
            message: `Floor level ${cleanLevel} is already registered (${duplicateLevel.name})`,
          });
        }
      }
      updateData.level = cleanLevel;
    }

    if (svgWidth !== undefined) {
      const cleanWidth = Number(svgWidth);
      if (isNaN(cleanWidth) || cleanWidth <= 0) {
        return res.status(400).json({
          success: false,
          message: 'SVG width must be a positive number',
        });
      }
      updateData.svgWidth = cleanWidth;
    }

    if (svgHeight !== undefined) {
      const cleanHeight = Number(svgHeight);
      if (isNaN(cleanHeight) || cleanHeight <= 0) {
        return res.status(400).json({
          success: false,
          message: 'SVG height must be a positive number',
        });
      }
      updateData.svgHeight = cleanHeight;
    }

    // Handle physical file replacement if new SVG data content is provided
    if (svgData && typeof svgData === 'string' && svgData.trim()) {
      try {
        // 1. Delete previous physical SVG file(s)
        if (existingFloor.svgFile) {
          deletePhysicalSvgFiles(existingFloor.svgFile);
        }

        // 2. Write new physical SVG file to Client/public and Client/dist
        const rawFileName = svgFile ? path.basename(svgFile) : `floor_${updateData.level ?? existingFloor.level}.svg`;
        const cleanFileName = decodeURIComponent(rawFileName).replace(/\s+/g, '_');

        savePhysicalSvgFile(cleanFileName, svgData);
        updateData.svgFile = `/${cleanFileName}`;
      } catch (fsErr) {
        console.warn('Could not replace physical SVG file on disk:', fsErr.message);
      }
    } else if (svgFile !== undefined && svgFile.trim()) {
      updateData.svgFile = svgFile.trim();
    }

    const updatedFloor = await Floor.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Floor updated and physical SVG blueprint replaced successfully',
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

// Delete Floor by MongoDB _id (also deletes physical SVG file from disk)
export const deleteFloor = async (req, res) => {
  try {
    const { id } = req.params;
    const floor = await Floor.findById(id);

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: `Floor with id '${id}' not found`,
      });
    }

    // Delete physical SVG file from Client/public and Client/dist
    if (floor.svgFile) {
      deletePhysicalSvgFiles(floor.svgFile);
    }

    await Floor.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Floor and physical SVG blueprint file deleted successfully',
      data: floor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting floor',
      error: error.message,
    });
  }
};
