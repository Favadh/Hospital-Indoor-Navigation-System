/**
 * Pure JavaScript Implementation of Dijkstra's Shortest Path Algorithm
 *
 * @param {String} startName - Starting Node name (e.g. 'Main Entrance')
 * @param {String} destinationName - Target Destination Node name (e.g. 'ICU')
 * @param {Array} nodesList - Array of all Node documents from MongoDB
 * @param {Array} edgesList - Array of all Edge documents from MongoDB
 * @returns {Object} { path: Array<Node>, totalDistance: Number }
 */
export const findShortestPath = (startName, destinationName, nodesList, edgesList) => {
  const nodeMap = new Map();
  nodesList.forEach((n) => nodeMap.set(n.name, n));

  if (!nodeMap.has(startName)) {
    throw new Error(`Start node '${startName}' not found in graph`);
  }
  if (!nodeMap.has(destinationName)) {
    throw new Error(`Destination node '${destinationName}' not found in graph`);
  }

  // 1. Build Adjacency List Graph
  const graph = new Map();
  nodeMap.forEach((_, name) => graph.set(name, []));

  edgesList.forEach((edge) => {
    const { from, to, weight } = edge;
    if (graph.has(from) && graph.has(to)) {
      const edgeWeight = Number(weight) || 1;
      graph.get(from).push({ node: to, weight: edgeWeight });
      graph.get(to).push({ node: from, weight: edgeWeight });
    }
  });

  // 2. Initialize Dijkstra Data Structures
  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

  nodeMap.forEach((_, name) => {
    distances.set(name, Infinity);
    previous.set(name, null);
    unvisited.add(name);
  });

  distances.set(startName, 0);

  // 3. Dijkstra Search Loop
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current = null;
    let smallestDistance = Infinity;

    for (const name of unvisited) {
      const distVal = distances.get(name);
      if (distVal < smallestDistance) {
        smallestDistance = distVal;
        current = name;
      }
    }

    // If destination reached or remaining nodes are unreachable
    if (current === null || current === destinationName || smallestDistance === Infinity) {
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
  let curr = destinationName;

  if (distances.get(destinationName) === Infinity) {
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
    totalDistance: distances.get(destinationName),
  };
};
