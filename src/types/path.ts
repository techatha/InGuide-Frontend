export interface MapNode {
  id: string;
  coordinates: [number, number];
  isPOI?: boolean;
  isIntersection?: boolean;
}

export interface MapEdge {
  targetNodeId: string;
  weight: number;
}

export interface NavigationGraph {
  nodes: Map<string, MapNode>;
  adjacencyList: Map<string, MapEdge[]>;
}

