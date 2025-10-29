export interface MapNode {
  id: string;
  coordinates: [number, number];
  isPOI?: boolean;
  isIntersection?: boolean;
  portalGroup?: string;
}

export interface MapEdge {
  targetNodeId: string;
  weight: number;
}

export interface NavigationGraph {
  nodes: Map<string, MapNode>;
  adjacencyList: Map<string, MapEdge[]>;
}

export interface JSONNavigationGraph {
  nodes: MapNode[];
  adjacencyList: Record<string, MapEdge[]>;
}

