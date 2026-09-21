import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map as MapIcon,
  Plus,
  RefreshCw,
  Layers,
  Maximize2,
  Sparkles,
  Loader2,
  X,
  Layers3,
  UploadCloud,
  CheckCircle2,
  FileCode,
  Trash2,
  Edit3,
  Compass,
  ExternalLink,
  Network,
  AlertTriangle,
} from 'lucide-react';
import api from '../../utils/axios';
import PointPickerInspector from '../PointPickerInspector';

export default function MapsTab({ onMapsCountChange, showToast, nodes = [] }) {
  const [maps, setMaps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Expanded Map Modal State (Hover / Click transformation)
  const [expandedMap, setExpandedMap] = useState(null);

  // Inspector State
  const [inspectorMap, setInspectorMap] = useState(null);

  // Delete Confirmation State
  const [mapToDelete, setMapToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Map Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Add Map Form Fields
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [svgFile, setSvgFile] = useState('');
  const [svgWidth, setSvgWidth] = useState('1920');
  const [svgHeight, setSvgHeight] = useState('1080');
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [svgData, setSvgData] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Update Map Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [mapToUpdate, setMapToUpdate] = useState(null);
  const [updateName, setUpdateName] = useState('');
  const [updateLevel, setUpdateLevel] = useState('');
  const [updateSvgFile, setUpdateSvgFile] = useState('');
  const [updateSvgWidth, setUpdateSvgWidth] = useState('1920');
  const [updateSvgHeight, setUpdateSvgHeight] = useState('1080');
  const [updateSelectedFileObj, setUpdateSelectedFileObj] = useState(null);
  const [updateSelectedFileName, setUpdateSelectedFileName] = useState('');
  const [updateSelectedFileSize, setUpdateSelectedFileSize] = useState('');
  const [updateSvgData, setUpdateSvgData] = useState('');
  const [updatePreviewUrl, setUpdatePreviewUrl] = useState('');
  const [updateIsDragging, setUpdateIsDragging] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFormError, setUpdateFormError] = useState('');
  const updateFileInputRef = useRef(null);

  // Fetch registered floor maps directly from database
  const fetchMaps = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/api/floors');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setMaps(res.data.data);
        if (onMapsCountChange) {
          onMapsCountChange(res.data.data.length);
        }
      } else {
        setMaps([]);
        if (onMapsCountChange) {
          onMapsCountChange(0);
        }
      }
    } catch (err) {
      console.error('Error fetching floors from database:', err);
      setError('Unable to load maps from database. Please check your connection.');
      setMaps([]);
      if (onMapsCountChange) {
        onMapsCountChange(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onMapsCountChange]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      if (updatePreviewUrl && updatePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(updatePreviewUrl);
      }
    };
  }, [previewUrl, updatePreviewUrl]);

  // ============================================================================
  // ADD MAP HANDLERS
  // ============================================================================
  const handleOpenAddModal = () => {
    setFormError('');
    setName(`Floor ${maps.length}`);
    setLevel(String(maps.length));
    setSvgFile('');
    setSelectedFileObj(null);
    setSelectedFileName('');
    setSelectedFileSize('');
    setSvgData('');
    setPreviewUrl('');
    setSvgWidth('1920');
    setSvgHeight('1080');
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    if (!isSubmitting) {
      setShowAddModal(false);
      setFormError('');
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  };

  const processSvgFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      setFormError('Please select a valid .svg vector blueprint file.');
      return;
    }

    setFormError('');
    setSelectedFileObj(file);
    setSelectedFileName(file.name);
    setSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');

    const cleanFileName = file.name.replace(/\s+/g, '_');
    const autoPath = `/${cleanFileName}`;
    setSvgFile(autoPath);

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);

    try {
      const textContent = await file.text();
      setSvgData(textContent);

      const parser = new DOMParser();
      const doc = parser.parseFromString(textContent, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');

      if (svgEl) {
        const viewBox = svgEl.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.trim().split(/[\s,]+/);
          if (parts.length === 4) {
            const w = Math.round(parseFloat(parts[2]));
            const h = Math.round(parseFloat(parts[3]));
            if (w > 0 && h > 0) {
              setSvgWidth(String(w));
              setSvgHeight(String(h));
              return;
            }
          }
        }

        const attrW = parseFloat(svgEl.getAttribute('width'));
        const attrH = parseFloat(svgEl.getAttribute('height'));
        if (!isNaN(attrW) && attrW > 0 && !isNaN(attrH) && attrH > 0) {
          setSvgWidth(String(Math.round(attrW)));
          setSvgHeight(String(Math.round(attrH)));
        }
      }
    } catch (err) {
      console.warn('SVG parsing warning:', err);
    }
  };

  const handleCreateMapSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || level === '') {
      setFormError('Please provide floor name and level.');
      return;
    }

    if (!svgFile.trim()) {
      setFormError('Please upload an SVG blueprint file for this map.');
      return;
    }

    const cleanLevel = Number(level);
    const cleanWidth = Number(svgWidth);
    const cleanHeight = Number(svgHeight);

    if (isNaN(cleanLevel)) {
      setFormError('Floor level must be a valid number (e.g. 0, 1, 2).');
      return;
    }

    if (isNaN(cleanWidth) || cleanWidth <= 0 || isNaN(cleanHeight) || cleanHeight <= 0) {
      setFormError('SVG Width and Height must be positive numbers.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalSvgData = svgData;
      if (selectedFileObj && (!finalSvgData || !finalSvgData.trim())) {
        finalSvgData = await selectedFileObj.text();
      }

      const payload = {
        name: name.trim(),
        level: cleanLevel,
        svgFile: svgFile.trim(),
        svgWidth: cleanWidth,
        svgHeight: cleanHeight,
        svgData: finalSvgData,
      };

      const res = await api.post('/api/floors', payload);

      if (res.data?.success && res.data?.data) {
        setShowAddModal(false);
        if (showToast) {
          showToast(`Floor map '${name.trim()}' (Level ${cleanLevel}) registered successfully!`);
        }
        await fetchMaps();
      } else {
        setFormError(res.data?.message || 'Failed to create map.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error saving floor map to database.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // UPDATE / EDIT MAP HANDLERS
  // ============================================================================
  const handleOpenUpdateModal = (map) => {
    setUpdateFormError('');
    setMapToUpdate(map);
    setUpdateName(map.name || '');
    setUpdateLevel(String(map.level ?? ''));
    setUpdateSvgFile(map.svgFile || '');
    setUpdateSvgWidth(String(map.svgWidth || '1920'));
    setUpdateSvgHeight(String(map.svgHeight || '1080'));
    setUpdateSelectedFileObj(null);
    setUpdateSelectedFileName('');
    setUpdateSelectedFileSize('');
    setUpdateSvgData('');
    setUpdatePreviewUrl(map.svgFile || '');
    setShowUpdateModal(true);
  };

  const handleCloseUpdateModal = () => {
    if (!isUpdating) {
      setShowUpdateModal(false);
      setMapToUpdate(null);
      setUpdateFormError('');
      if (updatePreviewUrl && updatePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(updatePreviewUrl);
      }
    }
  };

  const processUpdateSvgFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      setUpdateFormError('Please select a valid .svg vector blueprint file.');
      return;
    }

    setUpdateFormError('');
    setUpdateSelectedFileObj(file);
    setUpdateSelectedFileName(file.name);
    setUpdateSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');

    const cleanFileName = file.name.replace(/\s+/g, '_');
    const autoPath = `/${cleanFileName}`;
    setUpdateSvgFile(autoPath);

    if (updatePreviewUrl && updatePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(updatePreviewUrl);
    }
    const blobUrl = URL.createObjectURL(file);
    setUpdatePreviewUrl(blobUrl);

    try {
      const textContent = await file.text();
      setUpdateSvgData(textContent);

      const parser = new DOMParser();
      const doc = parser.parseFromString(textContent, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');

      if (svgEl) {
        const viewBox = svgEl.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.trim().split(/[\s,]+/);
          if (parts.length === 4) {
            const w = Math.round(parseFloat(parts[2]));
            const h = Math.round(parseFloat(parts[3]));
            if (w > 0 && h > 0) {
              setUpdateSvgWidth(String(w));
              setUpdateSvgHeight(String(h));
              return;
            }
          }
        }

        const attrW = parseFloat(svgEl.getAttribute('width'));
        const attrH = parseFloat(svgEl.getAttribute('height'));
        if (!isNaN(attrW) && attrW > 0 && !isNaN(attrH) && attrH > 0) {
          setUpdateSvgWidth(String(Math.round(attrW)));
          setUpdateSvgHeight(String(Math.round(attrH)));
        }
      }
    } catch (err) {
      console.warn('SVG parsing warning:', err);
    }
  };

  const handleUpdateMapSubmit = async (e) => {
    e.preventDefault();
    if (!mapToUpdate) return;
    setUpdateFormError('');

    if (!updateName.trim() || updateLevel === '') {
      setUpdateFormError('Please provide floor name and level.');
      return;
    }

    const cleanLevel = Number(updateLevel);
    const cleanWidth = Number(updateSvgWidth);
    const cleanHeight = Number(updateSvgHeight);

    if (isNaN(cleanLevel)) {
      setUpdateFormError('Floor level must be a valid number.');
      return;
    }

    if (isNaN(cleanWidth) || cleanWidth <= 0 || isNaN(cleanHeight) || cleanHeight <= 0) {
      setUpdateFormError('SVG dimensions must be positive numbers.');
      return;
    }

    setIsUpdating(true);

    try {
      let finalSvgData = updateSvgData;
      if (updateSelectedFileObj && (!finalSvgData || !finalSvgData.trim())) {
        finalSvgData = await updateSelectedFileObj.text();
      }

      const payload = {
        name: updateName.trim(),
        level: cleanLevel,
        svgFile: updateSvgFile.trim(),
        svgWidth: cleanWidth,
        svgHeight: cleanHeight,
      };

      if (finalSvgData && finalSvgData.trim()) {
        payload.svgData = finalSvgData;
      }

      const res = await api.put(`/api/floors/${mapToUpdate._id}`, payload);

      if (res.data?.success && res.data?.data) {
        setShowUpdateModal(false);
        const updatedDoc = res.data.data;
        setMapToUpdate(null);
        if (expandedMap && expandedMap._id === updatedDoc._id) {
          setExpandedMap(updatedDoc);
        }
        if (showToast) {
          showToast(`Floor map '${updateName.trim()}' updated and SVG blueprint replaced!`);
        }
        await fetchMaps();
      } else {
        setUpdateFormError(res.data?.message || 'Failed to update map.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error updating floor map on database.';
      setUpdateFormError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================================
  // DELETE MAP HANDLER (Deletes DB record & physical SVG file)
  // ============================================================================
  const handleDeleteMapConfirm = async () => {
    if (!mapToDelete) return;

    setIsDeleting(true);
    try {
      const res = await api.delete(`/api/floors/${mapToDelete._id}`);
      if (res.data?.success) {
        if (showToast) {
          showToast(`Floor map '${mapToDelete.name}' and its SVG blueprint deleted successfully!`);
        }
        if (expandedMap && expandedMap._id === mapToDelete._id) {
          setExpandedMap(null);
        }
        setMapToDelete(null);
        await fetchMaps();
      } else {
        if (showToast) {
          showToast(res.data?.message || 'Error deleting floor map', 'error');
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to delete floor map from server.';
      if (showToast) {
        showToast(msg, 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Launch 3D Map in Admin mode
  const handleLaunch3DMap = (map) => {
    const url = `/map?mode=admin&floor=${map.level ?? 0}`;
    window.open(url, '_blank');
  };

  // Launch Graph Editor / Point Picker Inspector
  const handleLaunchGraphEditor = (map) => {
    setInspectorMap(map);
  };

  return (
    <div className="tab-pane animate-fade-in">
      {/* Header Banner */}
      <div className="pane-header-banner">
        <div className="banner-text">
          <div className="banner-badge">
            <Sparkles size={14} color="#00ff88" />
            <span>Spatial Engine & Blueprints</span>
          </div>
          <h1 className="pane-title">Hospital Maps & Blueprints</h1>
          <p className="pane-subtitle">
            Manage vector floor plans, SVG dimension bounds, and interactive 2D/3D navigation layouts.
          </p>
        </div>
        <div className="banner-actions">
          <button
            className="action-btn-refresh"
            onClick={fetchMaps}
            disabled={isLoading}
            title="Reload maps from database"
          >
            <RefreshCw size={16} className={isLoading ? 'spin-animation' : ''} />
          </button>

          {/* Add New Map Button */}
          <button
            className="action-btn-primary"
            onClick={handleOpenAddModal}
            title="Register a new floor map"
          >
            <Plus size={17} />
            <span>Add New Map</span>
          </button>
        </div>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="admin-login-error mb-4">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Maps Grid Section */}
      <div className="maps-section-wrapper">
        <div className="maps-section-header">
          <div className="maps-count-indicator">
            <Layers size={18} color="#00ff88" />
            <span>Registered Floor Maps ({maps.length})</span>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-maps-card">
            <Loader2 size={36} className="spin empty-icon" color="#00ff88" />
            <h3>Loading Maps from Database...</h3>
            <p>Connecting to backend API and loading registered floor layouts.</p>
          </div>
        ) : maps.length === 0 ? (
          <div className="empty-maps-card">
            <MapIcon size={48} className="empty-icon" />
            <h3>No Floor Maps Found</h3>
            <p>No blueprint maps are currently registered in the database.</p>
          </div>
        ) : (
          <div className="maps-cards-grid">
            {maps.map((map) => (
              <div
                key={map._id || map.level}
                className="map-grid-card interactive-hover-card"
                onClick={() => setExpandedMap(map)}
                title="Click to expand details & actions"
              >
                {/* Card Top Title & Badge */}
                <div className="map-card-header">
                  <div className="map-card-title-group">
                    <div className="map-icon-box">
                      <MapIcon size={18} color="#00ff88" />
                    </div>
                    <div>
                      <h3 className="map-card-title">{map.name}</h3>
                      <span className="map-card-id">ID: {map._id ? map._id.slice(-6) : 'unassigned'}</span>
                    </div>
                  </div>
                  <div className="map-level-pill">
                    <Layers size={12} />
                    <span>Level {map.level}</span>
                  </div>
                </div>

                {/* SVG Image Preview Container with Dimensions */}
                <div className="map-svg-preview-container">
                  <img
                    src={map.svgFile}
                    alt={`${map.name} Blueprint`}
                    className="map-svg-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="map-svg-fallback-box" style={{ display: 'none' }}>
                    <MapIcon size={36} color="#64748b" />
                    <span>SVG Blueprint Preview</span>
                  </div>

                  {/* Dimension overlay badge */}
                  <div className="map-preview-overlay-badge">
                    <Maximize2 size={11} />
                    <span>{map.svgWidth} × {map.svgHeight} px</span>
                  </div>

                  {/* Hover Quick Action Ribbon */}
                  <div className="card-hover-expand-hint">
                    <span>Click to Manage / Expand</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* MODAL: EXPANDED FLOOR MAP VIEW (WITH ALL DETAILS & 4 ACTIONS) */}
      {/* ============================================================= */}
      {expandedMap && (
        <div
          className="admin-modal-backdrop animate-fade-in"
          onClick={() => setExpandedMap(null)}
        >
          <div
            className="map-expanded-dialog animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="map-expanded-header">
              <div className="map-expanded-title-box">
                <div className="map-icon-box large">
                  <MapIcon size={24} color="#00ff88" />
                </div>
                <div>
                  <div className="map-expanded-title-row">
                    <h2 className="map-expanded-name">{expandedMap.name}</h2>
                    <span className="map-level-pill large">
                      <Layers size={14} />
                      Level {expandedMap.level}
                    </span>
                  </div>
                  <span className="map-expanded-sub">
                    Registered Blueprint • MongoDB ObjectId: <code>{expandedMap._id}</code>
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setExpandedMap(null)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Large Blueprint Preview */}
            <div className="map-expanded-body">
              <div className="map-expanded-canvas-wrapper">
                <div className="map-expanded-canvas-header">
                  <div className="canvas-header-left">
                    <FileCode size={16} color="#00ff88" />
                    <span>Architectural Vector Canvas</span>
                  </div>
                  <div className="canvas-header-right">
                    <Maximize2 size={14} />
                    <span>{expandedMap.svgWidth} × {expandedMap.svgHeight} px</span>
                  </div>
                </div>

                <div className="map-expanded-preview-box">
                  <img
                    src={expandedMap.svgFile}
                    alt={`${expandedMap.name} Full Blueprint`}
                    className="map-expanded-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="map-svg-fallback-box" style={{ display: 'none' }}>
                    <MapIcon size={54} color="#64748b" />
                    <span>SVG Blueprint could not be rendered</span>
                  </div>
                </div>
              </div>

              {/* 4 ACTION BUTTONS: Delete, Update, Graph Editor, 3D Map */}
              <div className="map-expanded-actions-grid">
                {/* 1. DELETE */}
                <button
                  className="btn-card-action btn-action-delete"
                  onClick={() => setMapToDelete(expandedMap)}
                  title="Delete floor and remove physical SVG file from disk"
                >
                  <Trash2 size={17} />
                  <span>Delete Floor</span>
                </button>

                {/* 2. UPDATE */}
                <button
                  className="btn-card-action btn-action-update"
                  onClick={() => handleOpenUpdateModal(expandedMap)}
                  title="Update floor metadata and replace SVG blueprint file"
                >
                  <Edit3 size={17} />
                  <span>Update</span>
                </button>

                {/* 3. GRAPH EDITOR */}
                <button
                  className="btn-card-action btn-action-graph"
                  onClick={() => handleLaunchGraphEditor(expandedMap)}
                  title="Open Point Picker Inspector for this floor"
                >
                  <Network size={17} />
                  <span>Graph Editor</span>
                </button>

                {/* 4. 3D MAP */}
                <button
                  className="btn-card-action btn-action-3d"
                  onClick={() => handleLaunch3DMap(expandedMap)}
                  title="Launch the 3D Interactive Map Scene for this floor"
                >
                  <Compass size={17} />
                  <span>3D Map</span>
                  <ExternalLink size={13} style={{ marginLeft: '2px', opacity: 0.8 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: UPDATE FLOOR MAP & REPLACE SVG FILE */}
      {/* ============================================================= */}
      {showUpdateModal && mapToUpdate && (
        <div className="admin-modal-backdrop animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="admin-modal-dialog animate-scale-in">
            <div className="modal-header">
              <div className="modal-title-box">
                <Edit3 size={22} color="#60a5fa" />
                <h3>Update Floor Map</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseUpdateModal}
                disabled={isUpdating}
              >
                <X size={18} />
              </button>
            </div>

            {updateFormError && (
              <div className="modal-form-error">
                <span>⚠️ {updateFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateMapSubmit} className="modal-form">
              <div className="modal-form-row">
                <div className="admin-input-group flex-1">
                  <label className="admin-label">Floor Name *</label>
                  <div className="admin-input-box">
                    <Layers3 size={18} className="admin-field-icon" />
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Ground Floor, First Floor"
                      value={updateName}
                      onChange={(e) => setUpdateName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="admin-input-group" style={{ width: '130px' }}>
                  <label className="admin-label">Level (Index) *</label>
                  <div className="admin-input-box">
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="0, 1, 2"
                      value={updateLevel}
                      onChange={(e) => setUpdateLevel(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Re-upload / Replace SVG Blueprint File */}
              <div className="admin-input-group">
                <div className="admin-label-flex">
                  <label className="admin-label">Replace SVG Blueprint (Optional)</label>
                  <span className="admin-label-hint">Uploading a new file will replace the current file on disk</span>
                </div>

                <div
                  className={`map-upload-dropzone ${updateIsDragging ? 'dragging' : ''} ${updateSelectedFileName ? 'has-file' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setUpdateIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setUpdateIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setUpdateIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processUpdateSvgFile(file);
                  }}
                  onClick={() => updateFileInputRef.current?.click()}
                >
                  <input
                    ref={updateFileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processUpdateSvgFile(file);
                    }}
                    style={{ display: 'none' }}
                  />

                  {updateSelectedFileName ? (
                    <div className="upload-file-info">
                      <div className="upload-file-icon-box">
                        <CheckCircle2 size={24} color="#00ff88" />
                      </div>
                      <div className="upload-file-details">
                        <div className="upload-file-name">{updateSelectedFileName}</div>
                        <div className="upload-file-sub">
                          <span>{updateSelectedFileSize}</span>
                          <span className="dot-sep">•</span>
                          <span className="auto-path-text">Will replace: <code>{updateSvgFile}</code></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="upload-change-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFileInputRef.current?.click();
                        }}
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <div className="upload-icon-circle">
                        <UploadCloud size={24} color="#60a5fa" />
                      </div>
                      <div className="upload-prompt-text">
                        <span className="upload-main-text">Click to browse or drop new SVG to replace</span>
                        <span className="upload-sub-text">Current file: <code>{mapToUpdate.svgFile}</code> ({updateSvgWidth} × {updateSvgHeight} px)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              {updatePreviewUrl && (
                <div className="modal-live-svg-preview">
                  <div className="preview-label-row">
                    <FileCode size={14} color="#60a5fa" />
                    <span>{updateSelectedFileName ? 'New Blueprint Preview:' : 'Current Blueprint:'}</span>
                    <span className="preview-dim-tag">{updateSvgWidth} × {updateSvgHeight} px</span>
                  </div>
                  <div className="preview-canvas-box">
                    <img src={updatePreviewUrl} alt="Blueprint Preview" className="preview-svg-img" />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={handleCloseUpdateModal}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit btn-update-submit"
                  disabled={isUpdating || !updateName || updateLevel === ''}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save & Apply Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ============================================================= */}
      {mapToDelete && (
        <div className="admin-modal-backdrop animate-fade-in" style={{ zIndex: 10001 }}>
          <div className="admin-modal-dialog delete-dialog animate-scale-in">
            <div className="modal-header">
              <div className="modal-title-box">
                <AlertTriangle size={22} color="#ef4444" />
                <h3 style={{ color: '#ef4444' }}>Delete Floor Map</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setMapToDelete(null)}
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-padded">
              <p className="delete-confirm-text">
                Are you sure you want to delete <strong>{mapToDelete.name}</strong> (Level {mapToDelete.level})?
              </p>
              <div className="delete-warning-box">
                <AlertTriangle size={18} color="#ef4444" />
                <span>
                  This action will permanently delete this floor from the database and physically remove its SVG file (<code>{mapToDelete.svgFile}</code>) from disk.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setMapToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-delete-confirm"
                onClick={handleDeleteMapConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Deleting Floor...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD NEW MAP */}
      {/* ============================================================= */}
      {showAddModal && (
        <div className="admin-modal-backdrop animate-fade-in">
          <div className="admin-modal-dialog animate-scale-in">
            <div className="modal-header">
              <div className="modal-title-box">
                <MapIcon size={22} color="#00ff88" />
                <h3>Add New Floor Map</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseAddModal}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="modal-form-error">
                <span>⚠️ {formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMapSubmit} className="modal-form">
              <div className="modal-form-row">
                <div className="admin-input-group flex-1">
                  <label className="admin-label">Floor Name *</label>
                  <div className="admin-input-box">
                    <Layers3 size={18} className="admin-field-icon" />
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Ground Floor, First Floor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="admin-input-group" style={{ width: '130px' }}>
                  <label className="admin-label">Level (Index) *</label>
                  <div className="admin-input-box">
                    <input
                      type="number"
                      className="admin-input"
                      placeholder="0, 1, 2"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="admin-input-group">
                <label className="admin-label">SVG Blueprint File *</label>

                <div
                  className={`map-upload-dropzone ${isDragging ? 'dragging' : ''} ${selectedFileName ? 'has-file' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processSvgFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processSvgFile(file);
                    }}
                    style={{ display: 'none' }}
                  />

                  {selectedFileName ? (
                    <div className="upload-file-info">
                      <div className="upload-file-icon-box">
                        <CheckCircle2 size={24} color="#00ff88" />
                      </div>
                      <div className="upload-file-details">
                        <div className="upload-file-name">{selectedFileName}</div>
                        <div className="upload-file-sub">
                          <span>{selectedFileSize}</span>
                          <span className="dot-sep">•</span>
                          <span className="auto-path-text">Stored as: <code>{svgFile}</code></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="upload-change-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <div className="upload-icon-circle">
                        <UploadCloud size={24} color="#00ff88" />
                      </div>
                      <div className="upload-prompt-text">
                        <span className="upload-main-text">Click to browse or drag & drop SVG map</span>
                        <span className="upload-sub-text">SVG vector format (auto-assigns path & detects dimensions)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Live SVG Preview */}
              {previewUrl && (
                <div className="modal-live-svg-preview">
                  <div className="preview-label-row">
                    <FileCode size={14} color="#00ff88" />
                    <span>Live Blueprint Preview:</span>
                    <span className="preview-dim-tag">{svgWidth} × {svgHeight} px</span>
                  </div>
                  <div className="preview-canvas-box">
                    <img src={previewUrl} alt="Uploaded SVG Blueprint" className="preview-svg-img" />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={handleCloseAddModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting || !name || level === '' || !svgFile}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Saving Map...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Register Floor Map</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2D POINT PICKER INSPECTOR / GRAPH EDITOR */}
      {/* ============================================================= */}
      {inspectorMap && (
        <PointPickerInspector
          onClose={() => setInspectorMap(null)}
          map={inspectorMap}
          nodes={nodes}
          edges={[]}
        />
      )}
    </div>
  );
}
