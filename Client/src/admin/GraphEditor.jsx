import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Save,
  Trash2,
  Edit3,
  X,
  Move,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  Check,
  AlertTriangle,
  RotateCcw,
  Search,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Sparkles,
  Info,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Share2,
  ArrowRightLeft,
  Link,
  Unlink,
} from 'lucide-react';
import api from '../utils/axios';
import './GraphEditor.css';

export default function GraphEditor({
  onClose,
  map = null,
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onNodesChange,
}) {
  // SVG Canvas Dimension Specs
  const SVG_W = Number(map?.svgWidth) || 1920;
  const SVG_H = Number(map?.svgHeight) || 1080;
  const svgSrc = map?.svgFile || '/Hospital G.svg';
  const mapName = map?.name || 'Hospital Map';
  // Default floor string representation auto-detected from map's floor level
  const defaultFloorStr = useMemo(() => {
    if (!map) return 'ground';
    const mapLevelNum = Number(map.level);
    if (mapLevelNum === 0 || String(map.level) === '0') return 'ground';
    if (mapLevelNum === 1 || String(map.level) === '1') return '1';
    if (map.level !== undefined && map.level !== null && String(map.level).trim() !== '') {
      return String(map.level);
    }
    if (map.name) {
      const lower = map.name.toLowerCase();
      if (lower.includes('ground') || lower.includes('0')) return 'ground';
      if (lower.includes('first') || lower.includes('1')) return '1';
      return map.name;
    }
    return 'ground';
  }, [map]);

  // Master Nodes & Floors State
  const [allNodes, setAllNodes] = useState(initialNodes || []);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);
  const [floorsList, setFloorsList] = useState([]);

  // Master Edges State
  const [allEdges, setAllEdges] = useState(initialEdges || []);
  const [isLoadingEdges, setIsLoadingEdges] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [showDeleteEdgeConfirm, setShowDeleteEdgeConfirm] = useState(false);

  // Drag-to-Connect Edge Creation State
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFromNode, setConnectingFromNode] = useState(null);
  const [connectingPos, setConnectingPos] = useState({ x: 0, y: 0 });
  const [hoveredCandidateNodeId, setHoveredCandidateNodeId] = useState(null);

  // Edge Form States
  const [createEdgeForm, setCreateEdgeForm] = useState({
    from: '',
    to: '',
    floor: defaultFloorStr,
    distance: 10,
  });

  const [editEdgeForm, setEditEdgeForm] = useState({
    id: '',
    from: '',
    to: '',
    floor: defaultFloorStr,
    distance: 10,
  });

  const [isSubmittingEdge, setIsSubmittingEdge] = useState(false);
  const [isDeletingEdge, setIsDeletingEdge] = useState(false);

  // Database Ground-Truth Cache & Baseline Snapshots
  const savedDbNodesRef = useRef(new Map());
  const initialLoadedSnapshotRef = useRef({ nodes: [], edges: [] });
  const isSnapshotInitializedRef = useRef(false);

  // Studio Blueprint Saving & Exit Modal States
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Populate DB ground-truth cache and snapshot from initialNodes
  useEffect(() => {
    if (initialNodes && initialNodes.length > 0) {
      initialNodes.forEach((n) => {
        savedDbNodesRef.current.set(n._id || n.name, { ...n });
      });
      setAllNodes((prev) => {
        const justCreatedNodes = prev.filter((n) => n._justCreated);
        const mapById = new Map();
        initialNodes.forEach((n) => mapById.set(n._id || n.name, n));
        justCreatedNodes.forEach((n) => mapById.set(n._id || n.name, n));
        return Array.from(mapById.values());
      });
      if (!isSnapshotInitializedRef.current) {
        initialLoadedSnapshotRef.current.nodes = JSON.parse(JSON.stringify(initialNodes));
      }
    }
  }, [initialNodes]);

  useEffect(() => {
    if (initialEdges && initialEdges.length > 0) {
      setAllEdges(initialEdges);
      if (!isSnapshotInitializedRef.current) {
        initialLoadedSnapshotRef.current.edges = JSON.parse(JSON.stringify(initialEdges));
      }
    }
  }, [initialEdges]);

  // Fetch registered floors from MongoDB to populate select options
  const fetchFloors = useCallback(async () => {
    try {
      const res = await api.get('/api/floors');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setFloorsList(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch floors from /api/floors:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchFloors();
  }, [fetchFloors]);

  // Dynamic Floor Options for Select Box
  const floorOptions = useMemo(() => {
    if (floorsList.length > 0) {
      return floorsList.map((f) => {
        const val = f.level === 0 || String(f.level) === '0' ? 'ground' : String(f.level);
        const name = f.name || `Floor Level ${f.level}`;
        return {
          value: val,
          label: `${name} (Level ${f.level})`,
          level: f.level,
        };
      });
    }

    // Default Fallback Options
    return [
      { value: 'ground', label: 'Ground Floor (Level 0)', level: 0 },
      { value: '1', label: 'First Floor (Level 1)', level: 1 },
      { value: '2', label: 'Second Floor (Level 2)', level: 2 },
      { value: '3', label: 'Third Floor (Level 3)', level: 3 },
      { value: '-1', label: 'Basement (Level -1)', level: -1 },
    ];
  }, [floorsList]);

  // Viewport Zoom & Filter Settings
  const [zoomLevel, setZoomLevel] = useState(1);
  const [labelMode, setLabelMode] = useState('full'); // 'full' | 'coords' | 'none'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'room' | 'entrance' | 'junction'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Node & Drag State
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOriginalPos, setDragOriginalPos] = useState(null); // { id, x, y }
  const [unsavedPosNodeId, setUnsavedPosNodeId] = useState(null); // Node with dirty position

  // New Node Placement State (Clicked pin on canvas)
  const [tempPin, setTempPin] = useState(null); // { x, y }

  // Sidebar Modes: 'idle' | 'create' | 'inspect' | 'create-edge' | 'inspect-edge'
  const [sidebarMode, setSidebarMode] = useState('idle');

  // Form States
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'room',
    floor: defaultFloorStr,
    x: 0,
    y: 0,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    type: 'room',
    floor: defaultFloorStr,
    x: 0,
    y: 0,
  });

  // Action Loading & Delete Confirmations
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // In-editor Toast Feedback
  const [toast, setToast] = useState(null);

  const showEditorToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const dragStartSnapshotRef = useRef(null);

  // Stage Reference for precise coordinate calculation
  const stageRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const pointerDownNodeRef = useRef(null);
  const isConnectingRef = useRef(false);
  const connectingFromNodeRef = useRef(null);
  const suppressClickRef = useRef(false);

  // 1. Fetch Latest Nodes from MongoDB API on Mount
  const fetchLatestNodes = useCallback(async () => {
    setIsLoadingNodes(true);
    try {
      const res = await api.get('/api/nodes');
      if (res.data?.data && Array.isArray(res.data.data)) {
        res.data.data.forEach((n) => {
          savedDbNodesRef.current.set(n._id || n.name, { ...n });
        });
        setAllNodes(res.data.data);
        if (!isSnapshotInitializedRef.current) {
          initialLoadedSnapshotRef.current.nodes = JSON.parse(JSON.stringify(res.data.data));
        }
      }
    } catch (err) {
      console.warn('Could not fetch nodes from /api/nodes, using fallback:', err.message);
    } finally {
      setIsLoadingNodes(false);
    }
  }, []);

  // Fetch Latest Edges from MongoDB API on Mount
  const fetchLatestEdges = useCallback(async () => {
    setIsLoadingEdges(true);
    try {
      const res = await api.get('/api/edges');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setAllEdges(res.data.data);
        if (!isSnapshotInitializedRef.current) {
          initialLoadedSnapshotRef.current.edges = JSON.parse(JSON.stringify(res.data.data));
          isSnapshotInitializedRef.current = true;
        }
      }
    } catch (err) {
      console.warn('Could not fetch edges from /api/edges, using fallback:', err.message);
    } finally {
      setIsLoadingEdges(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestNodes();
    fetchLatestEdges();
  }, [fetchLatestNodes, fetchLatestEdges]);

  // Filter nodes relevant to active floor with robust alias matching
  const isNodeOnThisFloor = useCallback(
    (n) => {
      // Newly created node is always visible on this editor map
      if (n._justCreated) return true;
      if (!map) return true;
      if (n.floor === undefined || n.floor === null || n.floor === '') return true;

      const nodeFloorStr = String(n.floor).trim().toLowerCase();
      const mapNameStr = String(map.name || '').trim().toLowerCase();
      const mapLevelStr = String(map.level ?? '').trim().toLowerCase();
      const mapLevelNum = Number(map.level);

      // Direct match
      if (nodeFloorStr === mapNameStr || nodeFloorStr === mapLevelStr) return true;
      if (map._id && String(n.floor) === String(map._id)) return true;

      // Ground / Level 0 floor matching
      const isMapGround =
        mapLevelNum === 0 ||
        mapLevelStr === '0' ||
        mapNameStr.includes('ground') ||
        mapNameStr.includes('floor 0') ||
        mapNameStr.includes('level 0');
      const isNodeGround =
        nodeFloorStr === 'ground' ||
        nodeFloorStr === '0' ||
        nodeFloorStr.includes('ground') ||
        nodeFloorStr === 'floor 0' ||
        nodeFloorStr === 'level 0';
      if (isMapGround && isNodeGround) return true;

      // Level 1 / First floor matching
      const isMapFirst =
        mapLevelNum === 1 ||
        mapLevelStr === '1' ||
        mapNameStr.includes('first') ||
        mapNameStr.includes('floor 1') ||
        mapNameStr.includes('level 1');
      const isNodeFirst =
        nodeFloorStr === 'first' ||
        nodeFloorStr === '1' ||
        nodeFloorStr.includes('first') ||
        nodeFloorStr === 'floor 1' ||
        nodeFloorStr === 'level 1';
      if (isMapFirst && isNodeFirst) return true;

      // Numeric level comparison
      if (!isNaN(mapLevelNum) && !isNaN(Number(nodeFloorStr))) {
        if (mapLevelNum === Number(nodeFloorStr)) return true;
      }

      // Substring fuzzy matching
      if (mapNameStr && (nodeFloorStr.includes(mapNameStr) || mapNameStr.includes(nodeFloorStr))) {
        return true;
      }

      return false;
    },
    [map]
  );

  const floorNodes = useMemo(() => {
    return allNodes.filter(isNodeOnThisFloor);
  }, [allNodes, isNodeOnThisFloor]);

  const visibleNodes = useMemo(() => {
    return floorNodes.filter((n) => {
      const matchesType = typeFilter === 'all' || n.type === typeFilter;
      const matchesSearch =
        !searchQuery ||
        n.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.type?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [floorNodes, typeFilter, searchQuery]);

  // Selected Node Object
  const selectedNode = useMemo(() => {
    return allNodes.find((n) => (n._id || n.name) === selectedNodeId) || null;
  }, [allNodes, selectedNodeId]);

  // Node Map for edge connections lookup
  const nodeMap = useMemo(() => {
    const mapObj = new Map();
    floorNodes.forEach((n) => mapObj.set(n.name, n));
    return mapObj;
  }, [floorNodes]);

  // Filter Edges visible on this floor
  const floorEdges = useMemo(() => {
    return allEdges.filter((e) => {
      const n1 = nodeMap.get(e.from);
      const n2 = nodeMap.get(e.to);
      return Boolean(n1 && n2);
    });
  }, [allEdges, nodeMap]);

  // Selected Edge Object
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return (
      allEdges.find(
        (e) =>
          (e._id && String(e._id) === String(selectedEdgeId)) ||
          `${e.from}-${e.to}` === selectedEdgeId ||
          `${e.to}-${e.from}` === selectedEdgeId
      ) || null
    );
  }, [allEdges, selectedEdgeId]);

  // Helper to compute exact distance for badges and forms uniformly
  const getEdgeDisplayDistance = useCallback(
    (edge) => {
      if (!edge) return 10;
      if (
        edge.distance !== undefined &&
        edge.distance !== null &&
        edge.distance !== '' &&
        !isNaN(Number(edge.distance)) &&
        Number(edge.distance) > 0
      ) {
        return Number(edge.distance);
      }
      if (
        edge.weight !== undefined &&
        edge.weight !== null &&
        edge.weight !== '' &&
        !isNaN(Number(edge.weight)) &&
        Number(edge.weight) > 0
      ) {
        return Number(edge.weight);
      }
      const n1 = nodeMap.get(edge.from);
      const n2 = nodeMap.get(edge.to);
      if (n1 && n2) {
        return Math.max(1, Math.round(Math.hypot(n2.x - n1.x, n2.y - n1.y)));
      }
      return 10;
    },
    [nodeMap]
  );

  // Handle Edge Selection
  const handleSelectEdge = useCallback(
    (edge) => {
      const edgeKey = edge._id || `${edge.from}-${edge.to}`;
      setSelectedEdgeId(edgeKey);
      setSelectedNodeId(null);
      setTempPin(null);
      const dist = getEdgeDisplayDistance(edge);
      setEditEdgeForm({
        id: edge._id || edgeKey,
        from: edge.from,
        to: edge.to,
        floor: String(edge.floor ?? defaultFloorStr),
        distance: dist,
      });
      setShowDeleteEdgeConfirm(false);
      setSidebarMode('inspect-edge');
    },
    [defaultFloorStr, getEdgeDisplayDistance]
  );

  // Sync edit form when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const nodeId = selectedNode._id || selectedNode.name;
      // Record initial baseline coordinates for revert functionality if not already tracked
      if (!dragOriginalPos || dragOriginalPos.id !== nodeId) {
        setDragOriginalPos({ id: nodeId, x: selectedNode.x, y: selectedNode.y });
      }

      let resolvedFloor = String(selectedNode.floor ?? defaultFloorStr);
      if (resolvedFloor === '0') resolvedFloor = 'ground';
      setEditForm({
        name: selectedNode.name || '',
        type: selectedNode.type || 'room',
        floor: resolvedFloor,
        x: selectedNode.x ?? 0,
        y: selectedNode.y ?? 0,
      });
      setShowDeleteConfirm(false);
    }
  }, [selectedNode, defaultFloorStr]);

  // Calculate count of unsaved draft modifications on active floor
  const unsavedCount = useMemo(() => {
    const snapNodes = (initialLoadedSnapshotRef.current.nodes || []).filter(isNodeOnThisFloor);
    const snapNodeNames = new Set(snapNodes.map((n) => n.name));

    const snapEdges = (initialLoadedSnapshotRef.current.edges || []).filter((e) => {
      return snapNodeNames.has(e.from) && snapNodeNames.has(e.to);
    });

    let count = 0;
    const snapNodeMap = new Map();
    snapNodes.forEach((n) => {
      if (n._id) snapNodeMap.set(String(n._id), n);
      if (n.name) snapNodeMap.set(n.name, n);
    });

    const currentNodeMap = new Map();
    floorNodes.forEach((n) => {
      if (n._id) currentNodeMap.set(String(n._id), n);
      if (n.name) currentNodeMap.set(n.name, n);
    });

    // Check current floor nodes against snapshot
    floorNodes.forEach((n) => {
      const snap = (n._id ? snapNodeMap.get(String(n._id)) : null) || snapNodeMap.get(n.name);
      if (!snap) {
        count++; // new node staged in draft
      } else {
        if (
          Math.round(Number(snap.x)) !== Math.round(Number(n.x)) ||
          Math.round(Number(snap.y)) !== Math.round(Number(n.y)) ||
          snap.name !== n.name ||
          snap.type !== n.type ||
          String(snap.floor ?? defaultFloorStr) !== String(n.floor ?? defaultFloorStr)
        ) {
          count++; // modified node properties
        }
      }
    });

    // Check for deleted nodes
    snapNodes.forEach((sn) => {
      const current = (sn._id ? currentNodeMap.get(String(sn._id)) : null) || currentNodeMap.get(sn.name);
      if (!current) {
        count++; // node removed in draft
      }
    });

    // Edge helper to normalize endpoints
    const edgeKey = (e) => (e.from < e.to ? `${e.from}__${e.to}` : `${e.to}__${e.from}`);
    const snapEdgeMap = new Map();
    snapEdges.forEach((e) => snapEdgeMap.set(edgeKey(e), e));

    const currentEdgeMap = new Map();
    floorEdges.forEach((e) => currentEdgeMap.set(edgeKey(e), e));

    floorEdges.forEach((e) => {
      const k = edgeKey(e);
      const snapE = snapEdgeMap.get(k);
      if (!snapE) {
        count++; // new edge staged in draft
      } else {
        const snapDist = Number(snapE.distance ?? snapE.weight ?? 0);
        const curDist = Number(e.distance ?? e.weight ?? 0);
        if (snapDist !== curDist) {
          count++; // modified edge weight
        }
      }
    });

    snapEdges.forEach((se) => {
      const k = edgeKey(se);
      if (!currentEdgeMap.has(k)) {
        count++; // edge deleted in draft
      }
    });

    return count;
  }, [allNodes, allEdges, floorNodes, floorEdges, isNodeOnThisFloor, defaultFloorStr]);

  // Warn user on browser refresh/tab close if unsaved modifications exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsavedCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedCount]);

  // Check if active selected node has modified coordinates compared to saved baseline
  const isPositionChanged = useMemo(() => {
    if (!selectedNode) return false;
    const selectedId = selectedNode._id || selectedNode.name;
    const snapNode = (initialLoadedSnapshotRef.current.nodes || []).find(
      (n) => (n._id && n._id === selectedId) || n.name === selectedNode.name
    );
    const dbNode = savedDbNodesRef.current.get(selectedId) || savedDbNodesRef.current.get(selectedNode.name);

    const origX = snapNode ? Math.round(snapNode.x) : (dbNode ? Math.round(dbNode.x) : Math.round(dragOriginalPos?.id === selectedId ? dragOriginalPos.x : selectedNode.x));
    const origY = snapNode ? Math.round(snapNode.y) : (dbNode ? Math.round(dbNode.y) : Math.round(dragOriginalPos?.id === selectedId ? dragOriginalPos.y : selectedNode.y));

    const currentX = Math.round(editForm.x !== undefined ? editForm.x : selectedNode.x);
    const currentY = Math.round(editForm.y !== undefined ? editForm.y : selectedNode.y);

    return currentX !== origX || currentY !== origY;
  }, [selectedNode, dragOriginalPos, editForm.x, editForm.y, allNodes]);

  // Coordinate Conversion Helper from Screen Pixel to SVG Grid (0..SVG_W, 0..SVG_H)
  const getSvgCoordinates = useCallback(
    (clientX, clientY) => {
      if (!stageRef.current) return { x: 0, y: 0 };
      const rect = stageRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;

      const svgX = Math.round((relativeX / rect.width) * SVG_W);
      const svgY = Math.round((relativeY / rect.height) * SVG_H);

      return {
        x: Math.max(0, Math.min(SVG_W, svgX)),
        y: Math.max(0, Math.min(SVG_H, svgY)),
      };
    },
    [SVG_W, SVG_H]
  );

  // ============================================================================
  // 2. CANVAS INTERACTIONS (CLICK TO CREATE PIN & DRAG REPOSITIONING)
  // ============================================================================

  // Handle clicking on empty canvas to drop a new node pin
  const handleStageClick = (e) => {
    // If just finished dragging, connecting, or click is suppressed, prevent canvas click from creating a pin
    if (suppressClickRef.current || dragMovedRef.current || isConnecting || isConnectingRef.current) {
      dragMovedRef.current = false;
      suppressClickRef.current = false;
      return;
    }

    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);

    // Proximity check: If clicked near an existing visible node, select it instead of creating
    const nearbyNode = visibleNodes.find((n) => Math.hypot(n.x - x, n.y - y) <= 38);
    if (nearbyNode) {
      const nodeId = nearbyNode._id || nearbyNode.name;
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setTempPin(null);
      setSidebarMode('inspect');
      return;
    }

    setTempPin({ x, y });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSidebarMode('create');
    setCreateForm({
      name: '',
      type: 'room',
      floor: defaultFloorStr,
      x,
      y,
    });
  };

  // ============================================================================
  // 3. IN-MEMORY UNDO / REDO HISTORY ENGINE & KEYBOARD SHORTCUTS
  // ============================================================================

  const pushToHistory = useCallback((action) => {
    setUndoStack((prev) => [...prev.slice(-40), action]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, action]);

    if (action.prevNodes) setAllNodes(action.prevNodes);
    if (action.prevEdges) setAllEdges(action.prevEdges);

    if (selectedNodeId && action.prevNodes) {
      const node = action.prevNodes.find((n) => (n._id || n.name) === selectedNodeId);
      if (node) {
        setEditForm({
          name: node.name,
          type: node.type,
          floor: String(node.floor || defaultFloorStr),
          x: node.x,
          y: node.y,
        });
      } else {
        setSelectedNodeId(null);
        setSidebarMode('idle');
      }
    }

    showEditorToast(`Undo: ${action.description}`, 'info');
  }, [undoStack, selectedNodeId, defaultFloorStr]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, action]);

    if (action.nextNodes) setAllNodes(action.nextNodes);
    if (action.nextEdges) setAllEdges(action.nextEdges);

    if (selectedNodeId && action.nextNodes) {
      const node = action.nextNodes.find((n) => (n._id || n.name) === selectedNodeId);
      if (node) {
        setEditForm({
          name: node.name,
          type: node.type,
          floor: String(node.floor || defaultFloorStr),
          x: node.x,
          y: node.y,
        });
      }
    }

    showEditorToast(`Redo: ${action.description}`, 'info');
  }, [redoStack, selectedNodeId, defaultFloorStr]);

  // Global Keyboard Shortcuts Listener for Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const activeEl = document.activeElement;
      const isTextInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        !activeEl.readOnly;

      // Undo: Ctrl+Z (without Shift)
      if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (isTextInput && activeEl.type === 'text') {
          return; // Allow native input undo
        }
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        e.key === 'y' ||
        e.key === 'Y' ||
        ((e.key === 'z' || e.key === 'Z') && e.shiftKey)
      ) {
        if (isTextInput && activeEl.type === 'text') {
          return; // Allow native input redo
        }
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ============================================================================
  // 4. CANVAS INTERACTIONS (POINTER EVENTS & DRAGGING)
  // ============================================================================

  // Pointer Down on Existing Node Pin (Start Drag Tracking)
  const handleNodePointerDown = (e, node) => {
    // If clicking on a connector handle, don't trigger node drag
    if (e.target.closest('.graph-connector-handle')) return;

    e.stopPropagation();
    const nodeId = node._id || node.name;

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    pointerDownNodeRef.current = node;
    dragStartSnapshotRef.current = JSON.parse(JSON.stringify(allNodes));

    isDraggingRef.current = true;
    dragMovedRef.current = false;
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setTempPin(null);
    setSidebarMode('inspect');

    // Save baseline database position for this node if not tracked
    const dbNode = savedDbNodesRef.current.get(nodeId);
    const origX = dbNode ? dbNode.x : node.x;
    const origY = dbNode ? dbNode.y : node.y;

    if (!dragOriginalPos || dragOriginalPos.id !== nodeId) {
      setDragOriginalPos({ id: nodeId, x: origX, y: origY });
    }

    // Capture pointer events
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  // Start drag-to-connect line from a node's directional arrow
  const handleStartConnecting = (e, node) => {
    e.stopPropagation();
    e.preventDefault();
    isConnectingRef.current = true;
    connectingFromNodeRef.current = node;
    setIsConnecting(true);
    setConnectingFromNode(node);
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    setConnectingPos(coords);
    setHoveredCandidateNodeId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTempPin(null);
  };

  // Window-level Pointer Move & Up listeners for reliable edge connection dragging
  useEffect(() => {
    if (!isConnecting) return;

    const handleWindowPointerMove = (e) => {
      const { x, y } = getSvgCoordinates(e.clientX, e.clientY);

      const fromNode = connectingFromNodeRef.current;
      if (!fromNode) {
        setConnectingPos({ x, y });
        return;
      }
      const fromId = fromNode._id || fromNode.name;

      let closestCandidate = null;
      let minDistance = 90;

      floorNodes.forEach((n) => {
        const id = n._id || n.name;
        if (id !== fromId) {
          const dist = Math.hypot(n.x - x, n.y - y);
          if (dist <= minDistance) {
            minDistance = dist;
            closestCandidate = n;
          }
        }
      });

      if (closestCandidate) {
        // Magnetic Lock onto candidate node center while within proximity
        setConnectingPos({ x: closestCandidate.x, y: closestCandidate.y });
        setHoveredCandidateNodeId(closestCandidate._id || closestCandidate.name);
      } else {
        // Freely track cursor when outside proximity
        setConnectingPos({ x, y });
        setHoveredCandidateNodeId(null);
      }
    };

    const handleWindowPointerUp = (e) => {
      if (!isConnectingRef.current) return;

      isConnectingRef.current = false;
      setIsConnecting(false);
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);

      const fromNode = connectingFromNodeRef.current;
      connectingFromNodeRef.current = null;
      setConnectingFromNode(null);
      setHoveredCandidateNodeId(null);

      const { x, y } = getSvgCoordinates(e.clientX, e.clientY);
      const fromId = fromNode?._id || fromNode?.name;

      let targetNode = null;
      let minDistance = 85;

      floorNodes.forEach((n) => {
        const id = n._id || n.name;
        if (id !== fromId) {
          const dist = Math.hypot(n.x - x, n.y - y);
          if (dist <= minDistance) {
            minDistance = dist;
            targetNode = n;
          }
        }
      });

      if (fromNode && targetNode) {
        const dx = targetNode.x - fromNode.x;
        const dy = targetNode.y - fromNode.y;
        const autoDist = Math.max(1, Math.round(Math.hypot(dx, dy)));

        setCreateEdgeForm({
          from: fromNode.name,
          to: targetNode.name,
          floor: String(fromNode.floor || targetNode.floor || defaultFloorStr),
          distance: autoDist,
        });
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setTempPin(null);
        setSidebarMode('create-edge');
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [isConnecting, getSvgCoordinates, floorNodes, defaultFloorStr]);

  // Pointer Move (Smooth real-time node drag across SVG)
  const handleStagePointerMove = (e) => {
    // Node Drag Repositioning
    if (!isDraggingRef.current || !draggingNodeId) return;

    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    if (dist > 3) {
      dragMovedRef.current = true;
      suppressClickRef.current = true;
    }

    if (!dragMovedRef.current) return;

    const { x, y } = getSvgCoordinates(e.clientX, e.clientY);

    // Update coordinates in local nodes list for real-time visual feedback
    setAllNodes((prev) =>
      prev.map((n) => {
        if ((n._id || n.name) === draggingNodeId) {
          return { ...n, x, y };
        }
        return n;
      })
    );

    // Update editForm coordinates live
    setEditForm((prev) => ({ ...prev, x, y }));
  };

  // Pointer Up (End Node Dragging)
  const handleStagePointerUp = (e) => {
    // Finish Node Dragging
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    const finishedId = draggingNodeId;
    setDraggingNodeId(null);

    if (dragMovedRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);
    }

    if (!finishedId) return;

    // Check if coordinates changed from the saved baseline
    const dbNode = savedDbNodesRef.current.get(finishedId);
    const snapNode = (initialLoadedSnapshotRef.current.nodes || []).find((n) => (n._id && n._id === finishedId) || n.name === finishedId);
    const origX = snapNode ? Math.round(snapNode.x) : (dbNode ? Math.round(dbNode.x) : Math.round(dragOriginalPos?.x ?? 0));
    const origY = snapNode ? Math.round(snapNode.y) : (dbNode ? Math.round(dbNode.y) : Math.round(dragOriginalPos?.y ?? 0));

    const currentNode = allNodes.find((n) => (n._id || n.name) === finishedId);
    if (currentNode && (Math.round(currentNode.x) !== origX || Math.round(currentNode.y) !== origY)) {
      setUnsavedPosNodeId(finishedId);
    } else {
      setUnsavedPosNodeId(null);
    }

    // If moved, record to undo history
    if (dragMovedRef.current && dragStartSnapshotRef.current) {
      const startNode = dragStartSnapshotRef.current.find((n) => (n._id || n.name) === finishedId);
      if (startNode && currentNode && (startNode.x !== currentNode.x || startNode.y !== currentNode.y)) {
        pushToHistory({
          type: 'MOVE_NODE',
          description: `Reposition '${currentNode.name || 'node'}' to (${currentNode.x}, ${currentNode.y})`,
          prevNodes: dragStartSnapshotRef.current,
          nextNodes: JSON.parse(JSON.stringify(allNodes)),
          nodeId: finishedId,
          nodeName: currentNode.name,
        });
      }
    }

    setSelectedNodeId(finishedId);
    setSelectedEdgeId(null);
    setTempPin(null);
    setSidebarMode('inspect');
  };

  // ============================================================================
  // 5. IN-MEMORY DRAFT CRUD ACTIONS (NODES & EDGES)
  // ============================================================================

  // Action: Create New Node in Draft
  const handleCreateNode = (e) => {
    e?.preventDefault();
    const trimmedName = createForm.name.trim();
    if (!trimmedName) {
      showEditorToast('Please enter a valid node name', 'error');
      return;
    }

    // Check if name already exists in this floor
    const exists = floorNodes.some((n) => n.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      showEditorToast(`A node named "${trimmedName}" already exists on this floor`, 'error');
      return;
    }

    const prevSnapshot = JSON.parse(JSON.stringify(allNodes));
    const draftId = `draft_node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const createdNode = {
      _id: draftId,
      name: trimmedName,
      type: createForm.type || 'room',
      floor: createForm.floor || defaultFloorStr,
      x: Math.round(Number(createForm.x)),
      y: Math.round(Number(createForm.y)),
      _justCreated: true,
    };

    const newNodesList = [...allNodes, createdNode];
    setAllNodes(newNodesList);

    pushToHistory({
      type: 'CREATE_NODE',
      description: `Create '${createdNode.name}'`,
      prevNodes: prevSnapshot,
      nextNodes: newNodesList,
      createdNodeId: draftId,
      createdNodeData: createdNode,
    });

    setSearchQuery('');
    setTypeFilter('all');
    setTempPin(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSidebarMode('idle');

    showEditorToast(`Node '${createdNode.name}' added to draft blueprint!`, 'success');
  };

  // Action: Fast Update Node Coordinates Only (From Dragging or Sidebar)
  const handleSaveCoordinatesOnly = () => {
    if (!selectedNode) return;
    const prevSnapshot = JSON.parse(JSON.stringify(allNodes));
    const targetX = Math.round(Number(editForm.x ?? selectedNode.x));
    const targetY = Math.round(Number(editForm.y ?? selectedNode.y));
    const key = selectedNode._id || selectedNode.name;

    const updatedNode = { ...selectedNode, x: targetX, y: targetY };
    const nextNodes = allNodes.map((n) => ((n._id || n.name) === key ? updatedNode : n));
    setAllNodes(nextNodes);
    setUnsavedPosNodeId(null);

    pushToHistory({
      type: 'MOVE_NODE',
      description: `Reposition '${selectedNode.name}' to (${targetX}, ${targetY})`,
      prevNodes: prevSnapshot,
      nextNodes,
      nodeId: key,
      nodeName: selectedNode.name,
    });

    showEditorToast(`Coordinates updated in draft: (${targetX}, ${targetY})`, 'success');
  };

  // Action: Revert Dragged / Modified Position back to exact saved values
  const handleRevertPosition = () => {
    if (!selectedNode) return;
    const prevSnapshot = JSON.parse(JSON.stringify(allNodes));
    const nodeId = selectedNode._id || selectedNode.name;

    const snapNode = (initialLoadedSnapshotRef.current.nodes || []).find(
      (n) => (n._id && n._id === nodeId) || n.name === selectedNode.name
    );
    const dbNode = savedDbNodesRef.current.get(nodeId) || savedDbNodesRef.current.get(selectedNode.name);

    const origX = snapNode ? Math.round(snapNode.x) : (dbNode ? Math.round(dbNode.x) : Math.round(dragOriginalPos?.x ?? selectedNode.x));
    const origY = snapNode ? Math.round(snapNode.y) : (dbNode ? Math.round(dbNode.y) : Math.round(dragOriginalPos?.y ?? selectedNode.y));

    const revertedNodes = allNodes.map((n) => {
      if ((n._id || n.name) === nodeId) {
        return { ...n, x: origX, y: origY };
      }
      return n;
    });

    setAllNodes(revertedNodes);
    setEditForm((prev) => ({
      ...prev,
      x: origX,
      y: origY,
    }));
    setUnsavedPosNodeId(null);

    pushToHistory({
      type: 'REVERT_NODE',
      description: `Revert position for '${selectedNode.name}'`,
      prevNodes: prevSnapshot,
      nextNodes: revertedNodes,
      nodeId,
      nodeName: selectedNode.name,
    });

    showEditorToast(`Coordinates reverted to saved location (${origX}, ${origY})`, 'info');
  };

  // Action: Save Full Node Updates in Draft (Name, Type, Floor, X, Y)
  const handleUpdateNodeFull = (e) => {
    e?.preventDefault();
    if (!selectedNode) return;
    const oldName = selectedNode.name;
    const newName = editForm.name.trim();
    if (!newName) {
      showEditorToast('Node name cannot be empty', 'error');
      return;
    }

    const prevSnapshot = JSON.parse(JSON.stringify(allNodes));
    const prevEdgesSnapshot = JSON.parse(JSON.stringify(allEdges));

    const targetX = Math.round(Number(editForm.x));
    const targetY = Math.round(Number(editForm.y));
    const key = selectedNode._id || selectedNode.name;

    const updatedNode = {
      ...selectedNode,
      name: newName,
      type: editForm.type,
      floor: editForm.floor || defaultFloorStr,
      x: targetX,
      y: targetY,
    };

    const nextNodes = allNodes.map((n) => ((n._id || n.name) === key ? updatedNode : n));
    setAllNodes(nextNodes);

    // If node name was renamed, update all connected edges in draft
    let nextEdges = allEdges;
    if (oldName !== newName) {
      nextEdges = allEdges.map((ed) => {
        let changed = false;
        let from = ed.from;
        let to = ed.to;
        if (from === oldName) {
          from = newName;
          changed = true;
        }
        if (to === oldName) {
          to = newName;
          changed = true;
        }
        return changed ? { ...ed, from, to } : ed;
      });
      setAllEdges(nextEdges);
    }

    setUnsavedPosNodeId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTempPin(null);
    setSidebarMode('idle');

    pushToHistory({
      type: 'UPDATE_NODE',
      description: `Update '${updatedNode.name}'`,
      prevNodes: prevSnapshot,
      nextNodes,
      prevEdges: prevEdgesSnapshot,
      nextEdges,
      nodeId: key,
      nodeName: updatedNode.name,
    });

    showEditorToast(`Node '${updatedNode.name}' updated in draft blueprint!`, 'success');
  };

  // Action: Delete Node from Draft
  const handleDeleteNode = () => {
    if (!selectedNode) return;
    const prevSnapshot = JSON.parse(JSON.stringify(allNodes));
    const prevEdgesSnapshot = JSON.parse(JSON.stringify(allEdges));
    const nodeToDelete = { ...selectedNode };
    const key = nodeToDelete._id || nodeToDelete.name;

    const filteredNodes = allNodes.filter((n) => (n._id || n.name) !== key);
    const filteredEdges = allEdges.filter((e) => e.from !== nodeToDelete.name && e.to !== nodeToDelete.name);

    setAllNodes(filteredNodes);
    setAllEdges(filteredEdges);

    pushToHistory({
      type: 'DELETE_NODE',
      description: `Delete '${nodeToDelete.name}'`,
      prevNodes: prevSnapshot,
      nextNodes: filteredNodes,
      prevEdges: prevEdgesSnapshot,
      nextEdges: filteredEdges,
      deletedNodeData: nodeToDelete,
      nodeName: nodeToDelete.name,
    });

    setSelectedNodeId(null);
    setUnsavedPosNodeId(null);
    setDragOriginalPos(null);
    setSidebarMode('idle');
    setShowDeleteConfirm(false);

    showEditorToast(`Node '${nodeToDelete.name}' removed from draft!`, 'success');
  };

  // Action: Create New Edge in Draft
  const handleCreateEdge = (e) => {
    e?.preventDefault();
    if (!createEdgeForm.from || !createEdgeForm.to) {
      showEditorToast('Source and target nodes are required', 'error');
      return;
    }
    if (createEdgeForm.from === createEdgeForm.to) {
      showEditorToast('Cannot connect a node to itself', 'error');
      return;
    }

    const prevEdgesSnapshot = JSON.parse(JSON.stringify(allEdges));
    const dist = Number(createEdgeForm.distance) || 10;
    const draftEdgeId = `draft_edge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const createdEdge = {
      _id: draftEdgeId,
      from: createEdgeForm.from,
      to: createEdgeForm.to,
      floor: createEdgeForm.floor || defaultFloorStr,
      distance: dist,
      weight: dist,
    };

    const nextEdgesList = [
      ...prevEdgesSnapshot.filter(
        (ed) =>
          !(ed.from === createdEdge.from && ed.to === createdEdge.to) &&
          !(ed.from === createdEdge.to && ed.to === createdEdge.from)
      ),
      createdEdge,
    ];

    setAllEdges(nextEdgesList);

    pushToHistory({
      type: 'CREATE_EDGE',
      description: `Connect '${createdEdge.from}' ↔ '${createdEdge.to}'`,
      prevEdges: prevEdgesSnapshot,
      nextEdges: nextEdgesList,
      createdEdgeId: draftEdgeId,
      createdEdgeData: createdEdge,
    });

    setSelectedEdgeId(null);
    setSelectedNodeId(null);
    setTempPin(null);
    setSidebarMode('idle');

    showEditorToast(`Path '${createdEdge.from}' ↔ '${createdEdge.to}' staged in draft!`, 'success');
  };

  // Action: Update Existing Edge in Draft
  const handleUpdateEdge = (e) => {
    e?.preventDefault();
    if (!editEdgeForm.from || !editEdgeForm.to) return;

    const prevEdgesSnapshot = JSON.parse(JSON.stringify(allEdges));
    const targetId = editEdgeForm.id || `${editEdgeForm.from}-${editEdgeForm.to}`;
    const dist = Number(editEdgeForm.distance) || 10;

    const nextEdgesList = allEdges.map((ed) => {
      if (
        (ed._id && String(ed._id) === String(targetId)) ||
        `${ed.from}-${ed.to}` === targetId ||
        `${ed.to}-${ed.from}` === targetId
      ) {
        return {
          ...ed,
          distance: dist,
          weight: dist,
          floor: editEdgeForm.floor || defaultFloorStr,
        };
      }
      return ed;
    });

    setAllEdges(nextEdgesList);
    setSelectedEdgeId(null);
    setSelectedNodeId(null);
    setTempPin(null);
    setSidebarMode('idle');

    pushToHistory({
      type: 'UPDATE_EDGE',
      description: `Update Path '${editEdgeForm.from}' ↔ '${editEdgeForm.to}'`,
      prevEdges: prevEdgesSnapshot,
      nextEdges: nextEdgesList,
    });

    showEditorToast(`Path distance updated in draft!`, 'success');
  };

  // Action: Delete Existing Edge from Draft
  const handleDeleteEdge = () => {
    if (!selectedEdge) return;
    const prevEdgesSnapshot = JSON.parse(JSON.stringify(allEdges));
    const edgeToDelete = { ...selectedEdge };
    const targetId = edgeToDelete._id || `${edgeToDelete.from}-${edgeToDelete.to}`;

    const nextEdgesList = allEdges.filter(
      (ed) =>
        !(ed._id && String(ed._id) === String(targetId)) &&
        !(ed.from === edgeToDelete.from && ed.to === edgeToDelete.to) &&
        !(ed.from === edgeToDelete.to && ed.to === edgeToDelete.from)
    );

    setAllEdges(nextEdgesList);

    pushToHistory({
      type: 'DELETE_EDGE',
      description: `Delete Path '${edgeToDelete.from}' ↔ '${edgeToDelete.to}'`,
      prevEdges: prevEdgesSnapshot,
      nextEdges: nextEdgesList,
      deletedEdgeData: edgeToDelete,
    });

    setSelectedEdgeId(null);
    setSidebarMode('idle');
    setShowDeleteEdgeConfirm(false);

    showEditorToast(`Path removed from draft blueprint!`, 'success');
  };

  // ============================================================================
  // 6. ATOMIC BLUEPRINT BATCH PERSISTENCE & DISCARD HANDLERS
  // ============================================================================

  // Save entire floor graph to MongoDB in a single atomic request
  const handleSaveBlueprint = async () => {
    setIsSavingBlueprint(true);
    try {
      const payload = {
        floor: defaultFloorStr,
        nodes: floorNodes.map((n) => ({
          name: n.name,
          type: n.type,
          floor: n.floor || defaultFloorStr,
          x: Math.round(Number(n.x)),
          y: Math.round(Number(n.y)),
        })),
        edges: floorEdges.map((e) => ({
          from: e.from,
          to: e.to,
          floor: e.floor || defaultFloorStr,
          distance: getEdgeDisplayDistance(e),
          weight: getEdgeDisplayDistance(e),
        })),
      };

      const res = await api.post('/api/nodes/sync-graph', payload);
      const { nodes: savedNodes, edges: savedEdges } = res.data?.data || { nodes: floorNodes, edges: floorEdges };

      // Preserve nodes and edges of other floors
      const otherFloorNodes = allNodes.filter((n) => !isNodeOnThisFloor(n));
      const otherFloorEdges = allEdges.filter((e) => !floorEdges.some((fe) => (fe._id && fe._id === e._id) || (fe.from === e.from && fe.to === e.to) || (fe.from === e.to && fe.to === e.from)));

      const nextAllNodes = [...otherFloorNodes, ...savedNodes];
      const nextAllEdges = [...otherFloorEdges, ...savedEdges];

      setAllNodes(nextAllNodes);
      setAllEdges(nextAllEdges);

      // Update baseline snapshots & cache
      savedDbNodesRef.current.clear();
      savedNodes.forEach((n) => savedDbNodesRef.current.set(n._id || n.name, { ...n }));

      initialLoadedSnapshotRef.current = {
        nodes: JSON.parse(JSON.stringify(nextAllNodes)),
        edges: JSON.parse(JSON.stringify(nextAllEdges)),
      };

      setUnsavedPosNodeId(null);
      setUndoStack([]);
      setRedoStack([]);

      showEditorToast(`Blueprint saved successfully! (${savedNodes.length} nodes, ${savedEdges.length} paths)`, 'success');
      if (onNodesChange) onNodesChange();
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save blueprint';
      showEditorToast(errMsg, 'error');
      return false;
    } finally {
      setIsSavingBlueprint(false);
    }
  };

  // Discard all unsaved draft changes and reset in-memory state to saved baseline
  const handleDiscardChanges = () => {
    if (initialLoadedSnapshotRef.current.nodes) {
      const restoredNodes = JSON.parse(JSON.stringify(initialLoadedSnapshotRef.current.nodes));
      const restoredEdges = JSON.parse(JSON.stringify(initialLoadedSnapshotRef.current.edges));
      setAllNodes(restoredNodes);
      setAllEdges(restoredEdges);
      savedDbNodesRef.current.clear();
      restoredNodes.forEach((n) => savedDbNodesRef.current.set(n._id || n.name, { ...n }));
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setTempPin(null);
      setSidebarMode('idle');
      setUndoStack([]);
      setRedoStack([]);
      setUnsavedPosNodeId(null);
      showEditorToast('All draft changes discarded', 'info');
    }
  };

  // Handle Exit Studio button click with unsaved check
  const handleExitStudio = () => {
    if (unsavedCount > 0) {
      setShowExitConfirmModal(true);
    } else {
      onClose();
    }
  };

  // Node Color Helper
  const getNodeColor = (type) => {
    switch (type) {
      case 'room':
        return '#ff4d4f';
      case 'entrance':
        return '#00ff88';
      case 'junction':
        return '#00d2d3';
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="graph-editor-overlay">
      {/* 1. TOP HEADER TOOLBAR */}
      <header className="graph-editor-header">
        <div className="graph-editor-title-group">

          <div className="graph-editor-headings">
            <h2>
              <span>Graph Editor Studio</span>
              <span style={{ color: '#00ff88', fontSize: '0.85rem' }}>- {mapName}</span>
            </h2>
            <p>
              Click canvas to drop nodes • Drag to reposition • Blueprint bounds:{' '}
              <strong style={{ color: '#ffffff' }}>{SVG_W} × {SVG_H} px</strong>
            </p>
          </div>
        </div>

        <div className="graph-editor-header-controls">
          <div className="graph-editor-stats-container">
            <div className="graph-editor-stat-pill">
              <Layers size={13} color="#00ff88" />
              <span>
                Nodes: <strong>{floorNodes.length}</strong>
              </span>
            </div>

            <div className="graph-editor-stat-pill">
              <Share2 size={13} color="#3b82f6" />
              <span>
                Edges: <strong>{floorEdges.length}</strong>
              </span>
            </div>

            <div className="graph-editor-stat-pill graph-stat-pill-secondary">
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#ff4d4f' }} />
              <span>Rooms: <strong>{floorNodes.filter((n) => n.type === 'room').length}</strong></span>
            </div>

            <div className="graph-editor-stat-pill graph-stat-pill-secondary">
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#00ff88' }} />
              <span>Entrances: <strong>{floorNodes.filter((n) => n.type === 'entrance').length}</strong></span>
            </div>

            <div className="graph-editor-stat-pill graph-stat-pill-secondary">
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#00d2d3' }} />
              <span>Junctions: <strong>{floorNodes.filter((n) => n.type === 'junction').length}</strong></span>
            </div>
          </div>

          <div className="graph-editor-actions-container">
            {unsavedCount > 0 && (
              <button
                className="graph-btn-discard"
                onClick={handleDiscardChanges}
                title="Discard all unsaved changes and revert to saved blueprint"
              >
                <RotateCcw size={14} />
                <span>Discard</span>
              </button>
            )}

            <button
              className={`graph-btn-save-blueprint ${unsavedCount > 0 ? 'dirty' : ''}`}
              onClick={handleSaveBlueprint}
              disabled={isSavingBlueprint || unsavedCount === 0}
              title={unsavedCount > 0 ? `Save ${unsavedCount} pending blueprint change(s) to database` : 'Blueprint is up to date'}
            >
              {isSavingBlueprint ? (
                <>
                  <Loader2 size={15} className="spin-animation" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Changes</span>
                  {unsavedCount > 0 && <span className="unsaved-pulse-badge">{unsavedCount}</span>}
                </>
              )}
            </button>

            <button className="graph-editor-close-btn" onClick={handleExitStudio} title="Close Graph Editor">
              <X size={15} />
              <span>Exit Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="graph-editor-body">
        {/* Left Viewport / Interactive Canvas */}
        <div
          className="graph-editor-viewport"
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
        >
          {/* Floating Viewport Quick Controls */}
          <div className="graph-editor-viewport-toolbar">
            <button
              className={`graph-toolbar-btn ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Types
            </button>
            <button
              className={`graph-toolbar-btn ${typeFilter === 'room' ? 'active' : ''}`}
              onClick={() => setTypeFilter('room')}
            >
              Rooms
            </button>
            <button
              className={`graph-toolbar-btn ${typeFilter === 'entrance' ? 'active' : ''}`}
              onClick={() => setTypeFilter('entrance')}
            >
              Entrances
            </button>
            <button
              className={`graph-toolbar-btn ${typeFilter === 'junction' ? 'active' : ''}`}
              onClick={() => setTypeFilter('junction')}
            >
              Junctions
            </button>

            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <button
              className={`graph-toolbar-btn ${showEdges ? 'active' : ''}`}
              onClick={() => setShowEdges((prev) => !prev)}
              title="Toggle Edge Visibility on Blueprint"
            >
              {showEdges ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>Edges: {showEdges ? 'ON' : 'OFF'}</span>
            </button>

            <button
              className="graph-toolbar-btn"
              onClick={() =>
                setLabelMode((prev) => (prev === 'full' ? 'coords' : prev === 'coords' ? 'none' : 'full'))
              }
              title="Cycle Node Label Visibility"
            >
              Labels: {labelMode}
            </button>

            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <button
              className={`graph-toolbar-btn ${undoStack.length === 0 ? 'disabled' : ''}`}
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              className={`graph-toolbar-btn ${redoStack.length === 0 ? 'disabled' : ''}`}
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 size={14} />
            </button>

            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <button
              className="graph-toolbar-btn"
              onClick={() => setZoomLevel((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              className="graph-toolbar-btn"
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              className="graph-toolbar-btn"
              onClick={() => setZoomLevel((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* SVG Blueprint Canvas Stage */}
          <div
            ref={stageRef}
            className={`graph-stage-wrapper ${draggingNodeId ? 'dragging-active' : ''} ${
              isConnecting ? 'connecting-active' : ''
            }`}
            style={{
              aspectRatio: `${SVG_W} / ${SVG_H}`,
              transform: `scale(${zoomLevel})`,
            }}
            onClick={handleStageClick}
          >
            {/* Background Floor SVG */}
            <img src={svgSrc} alt={mapName} className="graph-stage-svg-bg" />

            {/* SVG 2D Overlay for Interactive Edges & Live Connecting Rubberband */}
            <svg className="graph-svg-overlay" viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
              <defs>
                <marker
                  id="drag-arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="5"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0.8, 7 3.5, 0 6.2" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Existing Floor Edges */}
              {showEdges &&
                floorEdges.map((e, idx) => {
                  const n1 = nodeMap.get(e.from);
                  const n2 = nodeMap.get(e.to);
                  if (!n1 || !n2) return null;
                  const edgeKey = e._id || `${e.from}-${e.to}`;
                  const isSelected =
                    selectedEdgeId === edgeKey ||
                    selectedEdgeId === e._id ||
                    selectedEdgeId === `${e.to}-${e.from}`;
                  const isHovered =
                    hoveredEdgeId === edgeKey ||
                    hoveredEdgeId === e._id ||
                    hoveredEdgeId === `${e.to}-${e.from}`;

                  const midX = (n1.x + n2.x) / 2;
                  const midY = (n1.y + n2.y) / 2;

                  return (
                    <g key={`edge-group-${edgeKey}-${idx}`}>
                      {/* Transparent Wide Click Hit Area for effortless selection & hover */}
                      <line
                        x1={n1.x}
                        y1={n1.y}
                        x2={n2.x}
                        y2={n2.y}
                        className="graph-edge-hit-area"
                        onPointerEnter={() => setHoveredEdgeId(edgeKey)}
                        onPointerLeave={() => setHoveredEdgeId((curr) => (curr === edgeKey ? null : curr))}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          handleSelectEdge(e);
                        }}
                      />
                      {/* Foreground Visible Edge Line (Solid, Crisp, Clean) */}
                      <line
                        x1={n1.x}
                        y1={n1.y}
                        x2={n2.x}
                        y2={n2.y}
                        className={`graph-edge-line ${isSelected ? 'graph-edge-line-selected' : ''}`}
                        stroke={isSelected ? '#ff007f' : isHovered ? '#facc15' : '#3b82f6'}
                        strokeWidth={isSelected || isHovered ? '6' : '4.5'}
                      />
                    </g>
                  );
                })}

              {/* Rubberband Preview Line while Dragging from Connector Arrow */}
              {isConnecting && connectingFromNode && connectingPos && (
                <line
                  x1={connectingFromNode.x}
                  y1={connectingFromNode.y}
                  x2={connectingPos.x}
                  y2={connectingPos.y}
                  className="graph-rubberband-line"
                  markerEnd="url(#drag-arrowhead)"
                />
              )}

              {/* Pending Edge Preview Line while creating an edge (between drag-release and saving) */}
              {sidebarMode === 'create-edge' && createEdgeForm.from && createEdgeForm.to && (() => {
                const pFrom = nodeMap.get(createEdgeForm.from);
                const pTo = nodeMap.get(createEdgeForm.to);
                if (!pFrom || !pTo) return null;
                return (
                  <line
                    x1={pFrom.x}
                    y1={pFrom.y}
                    x2={pTo.x}
                    y2={pTo.y}
                    className="graph-rubberband-line graph-pending-edge-line"
                  />
                );
              })()}
            </svg>

            {/* Render Crisp HTML Distance Badges on Hover or Selection */}
            {showEdges &&
              floorEdges.map((e, idx) => {
                const n1 = nodeMap.get(e.from);
                const n2 = nodeMap.get(e.to);
                if (!n1 || !n2) return null;
                const edgeKey = e._id || `${e.from}-${e.to}`;
                const isSelected =
                  selectedEdgeId === edgeKey ||
                  selectedEdgeId === e._id ||
                  selectedEdgeId === `${e.to}-${e.from}`;
                const isHovered =
                  hoveredEdgeId === edgeKey ||
                  hoveredEdgeId === e._id ||
                  hoveredEdgeId === `${e.to}-${e.from}`;

                // Only show badge when hovered or selected
                if (!isHovered && !isSelected) return null;

                const midX = (n1.x + n2.x) / 2;
                const midY = (n1.y + n2.y) / 2;
                const displayDist = getEdgeDisplayDistance(e);

                return (
                  <div
                    key={`edge-html-badge-${edgeKey}-${idx}`}
                    className={`graph-edge-html-badge ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      left: `${(midX / SVG_W) * 100}%`,
                      top: `${(midY / SVG_H) * 100}%`,
                    }}
                    onPointerEnter={() => setHoveredEdgeId(edgeKey)}
                    onPointerLeave={() => setHoveredEdgeId((curr) => (curr === edgeKey ? null : curr))}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      handleSelectEdge(e);
                    }}
                    title={`Edge: ${e.from} ↔ ${e.to} (${displayDist}m) — Click to inspect`}
                  >
                    {displayDist}m
                  </div>
                );
              })}

            {/* Pending Edge Distance Badge (Between drag-release and saving) */}
            {sidebarMode === 'create-edge' && createEdgeForm.from && createEdgeForm.to && (() => {
              const pFrom = nodeMap.get(createEdgeForm.from);
              const pTo = nodeMap.get(createEdgeForm.to);
              if (!pFrom || !pTo) return null;
              const midX = (pFrom.x + pTo.x) / 2;
              const midY = (pFrom.y + pTo.y) / 2;
              return (
                <div
                  className="graph-edge-html-badge graph-pending-edge-badge"
                  style={{
                    left: `${(midX / SVG_W) * 100}%`,
                    top: `${(midY / SVG_H) * 100}%`,
                  }}
                >
                  {createEdgeForm.distance || 0}m
                </div>
              );
            })()}

            {/* Live Distance Badge while Dragging & Magnetically Locked onto a Candidate Node */}
            {isConnecting && connectingFromNode && hoveredCandidateNodeId && (() => {
              const candidate = nodeMap.get(hoveredCandidateNodeId);
              if (!candidate) return null;
              const midX = (connectingFromNode.x + candidate.x) / 2;
              const midY = (connectingFromNode.y + candidate.y) / 2;
              const liveDist = Math.max(1, Math.round(Math.hypot(candidate.x - connectingFromNode.x, candidate.y - connectingFromNode.y)));
              return (
                <div
                  className="graph-edge-html-badge graph-pending-edge-badge"
                  style={{
                    left: `${(midX / SVG_W) * 100}%`,
                    top: `${(midY / SVG_H) * 100}%`,
                  }}
                >
                  {liveDist}m
                </div>
              );
            })()}

            {/* Render Visible Interactive Draggable Node Pins */}
            {visibleNodes.map((n) => {
              const nodeId = n._id || n.name;
              const isSelected = selectedNodeId === nodeId;
              const isDragging = draggingNodeId === nodeId;
              const dbNode = savedDbNodesRef.current.get(nodeId);
              const isDirty =
                unsavedPosNodeId === nodeId &&
                dbNode &&
                (Math.round(n.x) !== Math.round(dbNode.x) || Math.round(n.y) !== Math.round(dbNode.y));
              const isCandidate = hoveredCandidateNodeId === nodeId;
              const isEdgeFormNode =
                sidebarMode === 'create-edge' &&
                (n.name === createEdgeForm.from || n.name === createEdgeForm.to);

              return (
                <div
                  key={nodeId}
                  className={`graph-node-pin type-${n.type} ${isSelected ? 'is-selected' : ''} ${
                    isDragging ? 'is-dragging' : ''
                  } ${isDirty ? 'is-dirty' : ''} ${isCandidate ? 'is-connect-candidate' : ''} ${
                    isEdgeFormNode ? 'is-edge-form-node' : ''
                  }`}
                  style={{
                    left: `${(n.x / SVG_W) * 100}%`,
                    top: `${(n.y / SVG_H) * 100}%`,
                    backgroundColor: getNodeColor(n.type),
                  }}
                  onPointerDown={(e) => handleNodePointerDown(e, n)}
                  onClick={(e) => {
                    if (suppressClickRef.current || isConnecting || isConnectingRef.current) {
                      e.stopPropagation();
                      return;
                    }
                    e.stopPropagation();
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                    setTempPin(null);
                    setSidebarMode('inspect');
                  }}
                  title={`${n.name} (${n.type}) — Click to inspect, drag node to move, or drag arrow to connect`}
                >
                  {/* Directional Connector Arrow Handles (Drag to connect) */}
                  <div
                    className="graph-connector-handle connector-top"
                    onPointerDown={(e) => handleStartConnecting(e, n)}
                    title={`Connect ${n.name} to another node`}
                  >
                    <ArrowUp size={9} strokeWidth={2.5} />
                  </div>
                  <div
                    className="graph-connector-handle connector-right"
                    onPointerDown={(e) => handleStartConnecting(e, n)}
                    title={`Connect ${n.name} to another node`}
                  >
                    <ArrowRight size={9} strokeWidth={2.5} />
                  </div>
                  <div
                    className="graph-connector-handle connector-bottom"
                    onPointerDown={(e) => handleStartConnecting(e, n)}
                    title={`Connect ${n.name} to another node`}
                  >
                    <ArrowDown size={9} strokeWidth={2.5} />
                  </div>
                  <div
                    className="graph-connector-handle connector-left"
                    onPointerDown={(e) => handleStartConnecting(e, n)}
                    title={`Connect ${n.name} to another node`}
                  >
                    <ArrowLeft size={9} strokeWidth={2.5} />
                  </div>

                  {/* Label Tooltip */}
                  {labelMode !== 'none' && (
                    <div
                      className="graph-node-label"
                      onClick={(e) => {
                        if (suppressClickRef.current || isConnecting || isConnectingRef.current) {
                          e.stopPropagation();
                          return;
                        }
                        e.stopPropagation();
                        setSelectedNodeId(nodeId);
                        setSelectedEdgeId(null);
                        setTempPin(null);
                        setSidebarMode('inspect');
                      }}
                    >
                      {labelMode === 'full' && <span>{n.name}</span>}
                      <span style={{ color: '#00ff88', opacity: 0.9 }}>
                        ({Math.round(n.x)}, {Math.round(n.y)})
                      </span>
                      {isDirty && <span style={{ color: '#f59e0b' }}>⚠️ Unsaved</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Temporary Click Placement Pin */}
            {tempPin && (
              <div
                className="graph-temporary-pin"
                style={{
                  left: `${(tempPin.x / SVG_W) * 100}%`,
                  top: `${(tempPin.y / SVG_H) * 100}%`,
                }}
              >
                <div className="graph-temporary-pin-label">
                  📍 New Pin: ({Math.round(tempPin.x)}, {Math.round(tempPin.y)})
                </div>
              </div>
            )}
          </div>

          {/* In-Editor Toast Alert */}
          {toast && (
            <div className={`graph-editor-toast ${toast.type === 'error' ? 'error' : ''}`}>
              {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
              <span>{toast.message}</span>
            </div>
          )}
        </div>

        {/* 3. RIGHT SIDEBAR EDITOR & INSPECTOR PANEL */}
        <aside className="graph-editor-sidebar">
          {/* Sidebar Header */}
          <div className="graph-sidebar-header">
            <div className="graph-sidebar-header-left">
              <Crosshair size={18} color="#00ff88" />
              <div>
                <h3 className="graph-sidebar-title">
                  {sidebarMode === 'create'
                    ? 'Create New Node'
                    : sidebarMode === 'create-edge'
                    ? 'Create New Edge'
                    : sidebarMode === 'inspect-edge'
                    ? 'Edge Inspector & Actions'
                    : sidebarMode === 'inspect'
                    ? 'Node Inspector & Actions'
                    : 'Graph Editor Studio'}
                </h3>
                <p className="graph-sidebar-subtitle">
                  {sidebarMode === 'create'
                    ? 'Configure and upload node to database'
                    : sidebarMode === 'create-edge'
                    ? 'Connect two nodes with distance & floor'
                    : sidebarMode === 'inspect-edge'
                    ? 'View or edit edge properties or delete'
                    : sidebarMode === 'inspect'
                    ? 'View, edit, or drag coordinates'
                    : 'Select or click blueprint to begin'}
                </p>
              </div>
            </div>

            {(sidebarMode === 'create' ||
              sidebarMode === 'create-edge' ||
              sidebarMode === 'inspect' ||
              sidebarMode === 'inspect-edge') && (
              <button
                className="graph-toolbar-btn"
                onClick={() => {
                  setSidebarMode('idle');
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                  setTempPin(null);
                }}
                title="Deselect"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="graph-sidebar-content">
            {/* ============================================================= */}
            {/* MODE A: CREATE NEW NODE FORM */}
            {/* ============================================================= */}
            {sidebarMode === 'create' && (
              <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Node Name</span>
                    <small>*</small>
                  </label>
                  <input
                    type="text"
                    className="graph-form-input"
                    placeholder="e.g. Cardiology Clinic 201"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    autoFocus
                    required
                  />
                </div>

                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Node Type</span>
                  </label>
                  <div className="graph-type-selector">
                    <button
                      type="button"
                      className={`graph-type-btn ${createForm.type === 'room' ? 'active type-room' : ''}`}
                      onClick={() => setCreateForm({ ...createForm, type: 'room' })}
                    >
                      <span className="type-indicator-dot room" />
                      <span>Room / Dept</span>
                    </button>
                    <button
                      type="button"
                      className={`graph-type-btn ${createForm.type === 'entrance' ? 'active type-entrance' : ''}`}
                      onClick={() => setCreateForm({ ...createForm, type: 'entrance' })}
                    >
                      <span className="type-indicator-dot entrance" />
                      <span>Entrance</span>
                    </button>
                    <button
                      type="button"
                      className={`graph-type-btn ${createForm.type === 'junction' ? 'active type-junction' : ''}`}
                      onClick={() => setCreateForm({ ...createForm, type: 'junction' })}
                    >
                      <span className="type-indicator-dot junction" />
                      <span>Junction</span>
                    </button>
                  </div>
                </div>

                {/* Auto-filled Coordinates */}
                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Blueprint Coordinates (Auto-Filled)</span>
                    <small>0..{SVG_W}, 0..{SVG_H}</small>
                  </label>
                  <div className="graph-coords-row">
                    <div className="graph-coord-box">
                      <label>X Coordinate</label>
                      <input
                        type="number"
                        value={createForm.x}
                        onChange={(e) => setCreateForm({ ...createForm, x: Number(e.target.value) })}
                      />
                    </div>
                    <div className="graph-coord-box">
                      <label>Y Coordinate</label>
                      <input
                        type="number"
                        value={createForm.y}
                        onChange={(e) => setCreateForm({ ...createForm, y: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Floor Level</span>
                    <small>Auto-selected from map</small>
                  </label>
                  <select
                    className="graph-form-select"
                    value={createForm.floor}
                    onChange={(e) => setCreateForm({ ...createForm, floor: e.target.value })}
                  >
                    {floorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="graph-sidebar-actions">
                  <button type="submit" className="btn-primary-action" disabled={isSubmitting}>
                    <Plus size={16} />
                    <span>Stage Node in Draft</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => {
                      setTempPin(null);
                      setSidebarMode('idle');
                    }}
                  >
                    <span>Cancel Pin</span>
                  </button>
                </div>
              </form>
            )}

            {/* ============================================================= */}
            {/* MODE: CREATE NEW EDGE FORM (Triggered by drag-to-connect)   */}
            {/* ============================================================= */}
            {sidebarMode === 'create-edge' && (
              <form onSubmit={handleCreateEdge} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="graph-node-details-card">
                  <div className="graph-details-row">
                    <span className="label">From Node:</span>
                    <span className="value" style={{ color: '#00ff88', fontWeight: 700 }}>
                      {createEdgeForm.from}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">To Node:</span>
                    <span className="value" style={{ color: '#38bdf8', fontWeight: 700 }}>
                      {createEdgeForm.to}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">Mode:</span>
                    <span className="value" style={{ color: '#94a3b8' }}>
                      Bidirectional Path ↔
                    </span>
                  </div>
                </div>

                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Distance / Weight (Auto-Computed)</span>
                    <small>in meters / units</small>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="graph-form-input"
                    value={createEdgeForm.distance}
                    onChange={(e) => setCreateEdgeForm({ ...createEdgeForm, distance: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Floor Level</span>
                  </label>
                  <select
                    className="graph-form-select"
                    value={createEdgeForm.floor}
                    onChange={(e) => setCreateEdgeForm({ ...createEdgeForm, floor: e.target.value })}
                  >
                    {floorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="graph-sidebar-actions">
                  <button type="submit" className="btn-primary-action" disabled={isSubmittingEdge}>
                    <Link size={16} />
                    <span>Connect Nodes in Draft</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => {
                      setSidebarMode('idle');
                      setSelectedEdgeId(null);
                    }}
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            )}

            {/* ============================================================= */}
            {/* MODE: INSPECT & UPDATE / DELETE EXISTING EDGE               */}
            {/* ============================================================= */}
            {sidebarMode === 'inspect-edge' && selectedEdge && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Edge Details Card */}
                <div className="graph-node-details-card">
                  <div className="graph-details-row">
                    <span className="label">From:</span>
                    <span className="value" style={{ color: '#00ff88', fontWeight: 700 }}>
                      {editEdgeForm.from}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">To:</span>
                    <span className="value" style={{ color: '#38bdf8', fontWeight: 700 }}>
                      {editEdgeForm.to}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">Type:</span>
                    <span className="value" style={{ color: '#94a3b8' }}>
                      Bidirectional Walkway ↔
                    </span>
                  </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleUpdateEdge} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="graph-form-group">
                    <label className="graph-form-label">
                      <span>Distance / Weight</span>
                      <small>meters</small>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="graph-form-input"
                      value={editEdgeForm.distance}
                      onChange={(e) => setEditEdgeForm({ ...editEdgeForm, distance: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="graph-form-group">
                    <label className="graph-form-label">
                      <span>Floor Level</span>
                    </label>
                    <select
                      className="graph-form-select"
                      value={editEdgeForm.floor}
                      onChange={(e) => setEditEdgeForm({ ...editEdgeForm, floor: e.target.value })}
                    >
                      {floorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn-primary-action" disabled={isSubmittingEdge}>
                    <Check size={16} />
                    <span>Apply Path Changes to Draft</span>
                  </button>
                </form>

                {/* Delete Edge Confirmation */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                  {!showDeleteEdgeConfirm ? (
                    <button
                      type="button"
                      className="btn-danger-action"
                      style={{ width: '100%' }}
                      onClick={() => setShowDeleteEdgeConfirm(true)}
                    >
                      <Trash2 size={15} />
                      <span>Remove Path from Draft</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600 }}>
                        Are you sure you want to remove the path between '{editEdgeForm.from}' and '{editEdgeForm.to}' from the draft?
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-danger-action"
                          style={{ flex: 1 }}
                          onClick={handleDeleteEdge}
                          disabled={isDeletingEdge}
                        >
                          <Trash2 size={14} />
                          <span>Confirm Remove</span>
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-action"
                          onClick={() => setShowDeleteEdgeConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE B: INSPECT, VIEW, UPDATE & DELETE EXISTING NODE */}
            {/* ============================================================= */}
            {sidebarMode === 'inspect' && selectedNode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 1. Quick Info / View Summary Card */}
                <div className="graph-node-details-card">
                  <div className="graph-details-row">
                    <span className="label">Active Node:</span>
                    <span className="value" style={{ color: '#00ff88' }}>
                      {selectedNode.name}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">Category:</span>
                    <span
                      className="value"
                      style={{
                        color: getNodeColor(selectedNode.type),
                        textTransform: 'capitalize',
                        fontWeight: 700,
                      }}
                    >
                      ● {selectedNode.type}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">Saved Coords:</span>
                    <span className="value">
                      X: {selectedNode.x}, Y: {selectedNode.y}
                    </span>
                  </div>
                  <div className="graph-details-row">
                    <span className="label">Floor Level:</span>
                    <span className="value">{String(selectedNode.floor || defaultFloorStr)}</span>
                  </div>
                </div>

                {/* 2. Full Update Form */}
                <form onSubmit={handleUpdateNodeFull} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="graph-form-group">
                    <label className="graph-form-label">
                      <span>Edit Name</span>
                    </label>
                    <input
                      type="text"
                      className="graph-form-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="graph-form-group">
                    <label className="graph-form-label">
                      <span>Edit Type</span>
                    </label>
                    <div className="graph-type-selector">
                      <button
                        type="button"
                        className={`graph-type-btn ${editForm.type === 'room' ? 'active type-room' : ''}`}
                        onClick={() => setEditForm({ ...editForm, type: 'room' })}
                      >
                        <span className="type-indicator-dot room" />
                        <span>Room</span>
                      </button>
                      <button
                        type="button"
                        className={`graph-type-btn ${editForm.type === 'entrance' ? 'active type-entrance' : ''}`}
                        onClick={() => setEditForm({ ...editForm, type: 'entrance' })}
                      >
                        <span className="type-indicator-dot entrance" />
                        <span>Entrance</span>
                      </button>
                      <button
                        type="button"
                        className={`graph-type-btn ${editForm.type === 'junction' ? 'active type-junction' : ''}`}
                        onClick={() => setEditForm({ ...editForm, type: 'junction' })}
                      >
                        <span className="type-indicator-dot junction" />
                        <span>Junction</span>
                      </button>
                    </div>
                  </div>

                  <div className="graph-form-group">
                    <div className="graph-form-label">
                      <span>Coordinates (X, Y)</span>
                      {isPositionChanged && (
                        <button
                          type="button"
                          onClick={handleRevertPosition}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f59e0b',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: 0,
                          }}
                          title="Revert coordinates to saved location"
                        >
                          <RotateCcw size={12} />
                          <span>Revert</span>
                        </button>
                      )}
                    </div>
                    <div className="graph-coords-row">
                      <div className="graph-coord-box">
                        <label>X Coordinate</label>
                        <input
                          type="number"
                          value={editForm.x !== undefined && editForm.x !== '' ? Math.round(Number(editForm.x)) : ''}
                          onChange={(e) => {
                            const newX = e.target.value === '' ? '' : Math.round(Number(e.target.value));
                            setEditForm({ ...editForm, x: newX });
                            const nodeId = selectedNode._id || selectedNode.name;
                            const dbNode = savedDbNodesRef.current.get(nodeId);
                            const origX = dbNode ? Math.round(dbNode.x) : Math.round(dragOriginalPos?.x ?? 0);
                            if (newX !== '' && origX !== newX) {
                              setUnsavedPosNodeId(nodeId);
                            } else if (newX !== '' && origX === newX) {
                              const origY = dbNode ? Math.round(dbNode.y) : Math.round(dragOriginalPos?.y ?? 0);
                              if (Math.round(Number(editForm.y)) === origY) {
                                setUnsavedPosNodeId(null);
                              }
                            }
                            if (newX !== '') {
                              setAllNodes((prev) =>
                                prev.map((n) =>
                                  (n._id || n.name) === nodeId
                                    ? { ...n, x: newX }
                                    : n
                                )
                              );
                            }
                          }}
                        />
                      </div>
                      <div className="graph-coord-box">
                        <label>Y Coordinate</label>
                        <input
                          type="number"
                          value={editForm.y !== undefined && editForm.y !== '' ? Math.round(Number(editForm.y)) : ''}
                          onChange={(e) => {
                            const newY = e.target.value === '' ? '' : Math.round(Number(e.target.value));
                            setEditForm({ ...editForm, y: newY });
                            const nodeId = selectedNode._id || selectedNode.name;
                            const dbNode = savedDbNodesRef.current.get(nodeId);
                            const origY = dbNode ? Math.round(dbNode.y) : Math.round(dragOriginalPos?.y ?? 0);
                            if (newY !== '' && origY !== newY) {
                              setUnsavedPosNodeId(nodeId);
                            } else if (newY !== '' && origY === newY) {
                              const origX = dbNode ? Math.round(dbNode.x) : Math.round(dragOriginalPos?.x ?? 0);
                              if (Math.round(Number(editForm.x)) === origX) {
                                setUnsavedPosNodeId(null);
                              }
                            }
                            if (newY !== '') {
                              setAllNodes((prev) =>
                                prev.map((n) =>
                                  (n._id || n.name) === nodeId
                                    ? { ...n, y: newY }
                                    : n
                                )
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="graph-form-group">
                    <label className="graph-form-label">
                      <span>Floor Level</span>
                    </label>
                    <select
                      className="graph-form-select"
                      value={editForm.floor}
                      onChange={(e) => setEditForm({ ...editForm, floor: e.target.value })}
                    >
                      {floorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn-primary-action" disabled={isSubmitting}>
                    <Check size={16} />
                    <span>Apply Changes to Draft</span>
                  </button>
                </form>

                {/* 3. Delete Node Section */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      className="btn-danger-action"
                      style={{ width: '100%' }}
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={15} />
                      <span>Remove Node from Draft</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 10,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600 }}>
                        Are you sure you want to remove '{selectedNode.name}' and its connected paths from the draft?
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-danger-action"
                          style={{ flex: 1 }}
                          onClick={handleDeleteNode}
                          disabled={isDeleting}
                        >
                          <Trash2 size={14} />
                          <span>Confirm Remove</span>
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-action"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE C: IDLE WORKSPACE & NODE / EDGE LIST SEARCH */}
            {/* ============================================================= */}
            {sidebarMode === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="graph-idle-box">
                  <Crosshair size={28} color="#00ff88" />
                  <h4>Graph Editor Studio</h4>
                  <p>
                    • <strong>Click anywhere</strong> on the blueprint to create a waypoint node.
                    <br />• <strong>Click or drag</strong> a node to reposition it.
                    <br />• <strong>Drag connector arrow</strong> on any node to draw an edge.
                    <br />• <strong>Click any edge line</strong> to inspect, edit, or delete.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="graph-form-group">
                  <label className="graph-form-label">
                    <span>Floor Nodes ({visibleNodes.length})</span>
                  </label>
                  <div className="graph-search-wrapper">
                    <Search size={15} className="graph-search-icon" />
                    <input
                      type="text"
                      className="graph-search-input"
                      placeholder="Search node by name or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Nodes Mini Directory */}
                <div className="graph-nodes-list-mini">
                  {visibleNodes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: 12 }}>
                      No nodes found matching your filter.
                    </div>
                  ) : (
                    visibleNodes.map((n) => {
                      const nodeId = n._id || n.name;
                      return (
                        <div
                          key={nodeId}
                          className={`graph-node-list-item ${selectedNodeId === nodeId ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedNodeId(nodeId);
                            setSelectedEdgeId(null);
                            setTempPin(null);
                            setSidebarMode('inspect');
                          }}
                        >
                          <div className="graph-node-item-left">
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: getNodeColor(n.type),
                                flexShrink: 0,
                              }}
                            />
                            <span>{n.name}</span>
                          </div>
                          <span className="graph-node-item-coords">
                            ({Math.round(n.x)}, {Math.round(n.y)})
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Floor Edges Mini Directory */}
                {floorEdges.length > 0 && (
                  <div className="graph-form-group" style={{ marginTop: 4 }}>
                    <label className="graph-form-label">
                      <span>Connected Edges ({floorEdges.length})</span>
                    </label>
                    <div className="graph-nodes-list-mini" style={{ maxHeight: 160 }}>
                      {floorEdges.map((e, idx) => {
                        const edgeKey = e._id || `${e.from}-${e.to}`;
                        const isSelected =
                          selectedEdgeId === edgeKey ||
                          selectedEdgeId === e._id ||
                          selectedEdgeId === `${e.to}-${e.from}`;
                        return (
                          <div
                            key={`edge-item-${edgeKey}-${idx}`}
                            className={`graph-node-list-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectEdge(e)}
                          >
                            <div className="graph-node-item-left">
                              <Share2 size={13} color="#3b82f6" />
                              <span>
                                {e.from} ↔ {e.to}
                              </span>
                            </div>
                            <span className="graph-node-item-coords">{getEdgeDisplayDistance(e)}m</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 3. UNSAVED CHANGES EXIT CONFIRMATION MODAL */}
      {showExitConfirmModal && (
        <div className="graph-modal-overlay">
          <div className="graph-modal-card">
            <div className="graph-modal-header">
              <div className="graph-modal-warning-icon">
                <AlertTriangle size={24} color="#f59e0b" />
              </div>
              <div className="graph-modal-title">
                <h3>Unsaved Blueprint Changes</h3>
                <p>You have {unsavedCount} unsaved modification{unsavedCount !== 1 ? 's' : ''} in this draft.</p>
              </div>
            </div>
            <div className="graph-modal-body">
              If you exit now without saving, all uncommitted waypoint nodes, paths, and coordinate changes will be lost.
            </div>
            <div className="graph-modal-actions">
              <button
                type="button"
                className="btn-primary-action"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}
                onClick={async () => {
                  const ok = await handleSaveBlueprint();
                  if (ok) {
                    setShowExitConfirmModal(false);
                    onClose();
                  }
                }}
                disabled={isSavingBlueprint}
              >
                {isSavingBlueprint ? <Loader2 size={15} className="spin-animation" /> : <Save size={15} />}
                <span>Save & Exit</span>
              </button>
              <button
                type="button"
                className="btn-danger-action"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onClose();
                }}
              >
                <span>Discard & Exit</span>
              </button>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setShowExitConfirmModal(false)}
              >
                <span>Keep Editing</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

