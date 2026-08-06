/**
 * Pure JavaScript Implementation of Dijkstra's Shortest Path Algorithm
 *
 * @param {String} startNodeId - Starting Node ID (e.g. 'main_entrance')
 * @param {String} destinationNodeId - Target Destination Node ID (e.g. 'icu')
 * @param {Array} nodesList - Array of all Node documents from MongoDB
 * @param {Array} edgesList - Array of all Edge documents from MongoDB
 * @returns {Object} { path: Array<Node>, totalDistance: Number }
 */
export const findShortestPath = (startNodeId, destinationNodeId, nodesList, edgesList) => {
  const nodeMap = new Map();
  nodesList.forEach((n) => nodeMap.set(n.nodeId, n));

  if (!nodeMap.has(startNodeId)) {
    throw new Error(`Start node '${startNodeId}' not found in graph`);
  }
  if (!nodeMap.has(destinationNodeId)) {
    throw new Error(`Destination node '${destinationNodeId}' not found in graph`);
  }

  // 1. Build Adjacency List Graph
  const graph = new Map();
  nodeMap.forEach((_, nodeId) => graph.set(nodeId, []));

  edgesList.forEach((edge) => {
    const { from, to, weight, bidirectional = true } = edge;
    if (graph.has(from) && graph.has(to)) {
      graph.get(from).push({ node: to, weight: weight || 1 });
      if (bidirectional) {
        graph.get(to).push({ node: from, weight: weight || 1 });
      }
    }
  });

  // 2. Initialize Dijkstra Data Structures
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  nodeMap.forEach((_, nodeId) => {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
    unvisited.add(nodeId);
  });

  distances.set(startNodeId, 0);

  // 3. Dijkstra Search Loop
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current = null;
    let smallestDistance = Infinity;

    for (const nodeId of unvisited) {
      const distVal = distances.get(nodeId);
      if (distVal < smallestDistance) {
        smallestDistance = distVal;
        current = nodeId;
      }
    }

    // If destination reached or remaining nodes are unreachable
    if (current === null || current === destinationNodeId || smallestDistance === Infinity) {
      break;
    }

    unvisited.delete(current);

    // Evaluate all neighbors of current node
    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor.node)) {
        const altDistance = distances.get(current) + neighbor.weight;
        if (altDistance < distances.get(neighbor.node)) {
          distances.set(neighbor.node, altDistance);
          previous.set(neighbor.node, current);
        }
      }
    }
  }

  // 4. Reconstruct Shortest Path Array
  const path = [];
  let curr = destinationNodeId;

  if (distances.get(destinationNodeId) === Infinity) {
    return { path: [], totalDistance: 0 };
  }

  while (curr !== null) {
    const nodeObj = nodeMap.get(curr);
    if (nodeObj) {
      path.unshift(nodeObj);
    }
    curr = previous.get(curr);
  }

  return {
    path,
    totalDistance: distances.get(destinationNodeId),
  };
};
