import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Crosshair,
  Compass,
  Search,
  X,
  Filter,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function MapsTab({ nodes = [], onOpenInspector }) {
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState('all');
  const [nodeFloorFilter, setNodeFloorFilter] = useState('all');

  // Filtered Nodes for Maps tab
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesQuery =
        !nodeSearchQuery.trim() ||
        (node.name && node.name.toLowerCase().includes(nodeSearchQuery.toLowerCase())) ||
        (node._id && node._id.toLowerCase().includes(nodeSearchQuery.toLowerCase()));

      const matchesType =
        nodeTypeFilter === 'all' || node.type === nodeTypeFilter;

      const matchesFloor =
        nodeFloorFilter === 'all' ||
        String(node.floor ?? 0) === String(nodeFloorFilter);

      return matchesQuery && matchesType && matchesFloor;
    });
  }, [nodes, nodeSearchQuery, nodeTypeFilter, nodeFloorFilter]);

  return (
    <div className="tab-pane animate-fade-in">
      {/* Header */}
      <div className="pane-header-banner">
        <div className="banner-text">
          <h1 className="pane-title">Hospital Maps & Spatial Nodes</h1>
          <p className="pane-subtitle">
            Inspect 2D blueprint coordinate waypoints, calibrate rooms, and test the 3D WebGL engine.
          </p>
        </div>
        <div className="banner-actions">
          <button
            className="action-btn-primary"
            onClick={onOpenInspector}
          >
            <Crosshair size={17} />
            <span>Launch Point Inspector</span>
          </button>
          <Link to="/map" className="action-btn-secondary">
            <Compass size={17} />
            <span>Launch 3D Map</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="table-controls-bar multi-filter">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search nodes by name or ID..."
            value={nodeSearchQuery}
            onChange={(e) => setNodeSearchQuery(e.target.value)}
            className="table-search-input"
          />
          {nodeSearchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setNodeSearchQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-select-group">
          <div className="select-box">
            <Filter size={15} className="select-icon" />
            <select
              value={nodeTypeFilter}
              onChange={(e) => setNodeTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="room">Rooms & Clinics</option>
              <option value="entrance">Hospital Entrances</option>
              <option value="junction">Hallway Junctions</option>
            </select>
          </div>

          <div className="select-box">
            <Layers size={15} className="select-icon" />
            <select
              value={nodeFloorFilter}
              onChange={(e) => setNodeFloorFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Floors</option>
              <option value="0">Floor 0 (Ground)</option>
              <option value="1">Floor 1 (First Floor)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spatial Nodes Table */}
      <div className="table-card-container">
        <div className="table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Node Name</th>
                <th>Category</th>
                <th>Floor</th>
                <th>SVG Coordinates (X, Y)</th>
                <th>Nav Destination</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-table-msg">
                    No hospital nodes match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node, idx) => (
                  <tr key={node._id || idx}>
                    <td>
                      <div className="node-name-cell">
                        <div className={`node-type-dot dot-${node.type}`}></div>
                        <div>
                          <span className="node-title">{node.name || 'Unnamed Node'}</span>
                          <span className="node-id-sub">{node._id || `node_${idx + 1}`}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`node-badge badge-${node.type}`}>
                        {node.type}
                      </span>
                    </td>
                    <td>
                      <span className="floor-badge">
                        Floor {node.floor ?? 0}
                      </span>
                    </td>
                    <td>
                      <code className="coord-code">
                        X: {Math.round(node.x || 0)}, Y: {Math.round(node.y || 0)}
                      </code>
                    </td>
                    <td>
                      {node.isDestination !== false ? (
                        <span className="tag-destination dest-yes">
                          <CheckCircle2 size={13} /> Selectable
                        </span>
                      ) : (
                        <span className="tag-destination dest-no">
                          Waypoint only
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
