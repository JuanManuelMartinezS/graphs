
from collections import defaultdict, deque
import heapq

class Graph:
    """
    A graph implementation using adjacency lists (dictionary of dictionaries).
    Supports both directed and undirected weighted graphs.
    """

    def __init__(self):
        """
        Initialize an empty graph using a dictionary of dictionaries representation.
        """
        self.graph = defaultdict(dict)

    def add_node(self, node):
        """
        Add a node to the graph if it doesn't exist.

        Args:
            node: The node to be added to the graph.
        """
        if node not in self.graph:
            self.graph[node] = {}

    def add_edge(self, node1, node2, weight=1, directed=False):
        """
        Add an edge between two nodes with an optional weight.

        Args:
            node1: First node of the edge.
            node2: Second node of the edge.
            weight (int, optional): Weight of the edge. Defaults to 1.
            directed (bool, optional): If True, creates a directed edge. Defaults to False.
        """
        self.graph[node1][node2] = weight
        if not directed:
            self.graph[node2][node1] = weight

    def bfs(self, start):
        """
        Perform Breadth-First Search traversal starting from a given node.

        Args:
            start: Starting node for the traversal.

        Returns:
            list: Nodes in BFS traversal order.
        """
        visited = set()
        queue = deque([start])
        result = []

        while queue:
            node = queue.popleft()
            if node not in visited:
                visited.add(node)
                result.append(node)
                queue.extend(self.graph[node].keys() - visited)
        
        return result

    def dfs(self, start):
        """
        Perform Depth-First Search traversal starting from a given node.

        Args:
            start: Starting node for the traversal.

        Returns:
            list: Nodes in DFS traversal order.
        """
        visited = set()
        stack = [start]
        result = []

        while stack:
            node = stack.pop()
            if node not in visited:
                visited.add(node)
                result.append(node)
                stack.extend(self.graph[node].keys() - visited)
        
        return result

    def prim(self, start):
        """
        Find the Minimum Spanning Tree using Prim's algorithm.

        Args:
            start: Starting node for the algorithm.

        Returns:
            list: List of tuples (from_node, to_node, weight) representing MST edges.
        """
        visited = set([start])
        edges = [
            (weight, start, to) for to, weight in self.graph[start].items()
        ]
        heapq.heapify(edges)
        mst = []

        while edges:
            weight, frm, to = heapq.heappop(edges)
            if to not in visited:
                visited.add(to)
                mst.append((frm, to, weight))

                for next_to, next_weight in self.graph[to].items():
                    if next_to not in visited:
                        heapq.heappush(edges, (next_weight, to, next_to))

        return mst

    def kruskal(self):
        """
        Find the Minimum Spanning Tree using Kruskal's algorithm.

        Returns:
            list: List of tuples (from_node, to_node, weight) representing MST edges.
        """
        edges = [
            (weight, u, v) for u in self.graph for v, weight in self.graph[u].items()
        ]
        edges = sorted(edges)
        parent = {}

        def find(v):
            if parent[v] != v:
                parent[v] = find(parent[v])
            return parent[v]

        def union(v1, v2):
            root1, root2 = find(v1), find(v2)
            parent[root2] = root1

        mst = []
        for node in self.graph:
            parent[node] = node

        for weight, u, v in edges:
            if find(u) != find(v):
                union(u, v)
                mst.append((u, v, weight))

        return mst

    def dijkstra(self, start):
        """
        Find shortest paths from a start node using Dijkstra's algorithm.

        Args:
            start: Starting node for the algorithm.

        Returns:
            dict: Dictionary with shortest distances to all nodes from start node.
        """
        distances = {node: float('inf') for node in self.graph}
        distances[start] = 0
        pq = [(0, start)]

        while pq:
            current_distance, current_node = heapq.heappop(pq)

            if current_distance > distances[current_node]:
                continue

            for neighbor, weight in self.graph[current_node].items():
                distance = current_distance + weight

                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    heapq.heappush(pq, (distance, neighbor))

        return distances

    def floyd_warshall(self):
        """
        Find all-pairs shortest paths using Floyd-Warshall algorithm.

        Returns:
            dict: Dictionary of dictionaries with shortest distances between all pairs of nodes.
        """
        nodes = list(self.graph.keys())
        distances = {u: {v: float('inf') for v in nodes} for u in nodes}
        for u in nodes:
            distances[u][u] = 0
            for v, weight in self.graph[u].items():
                distances[u][v] = weight

        for k in nodes:
            for i in nodes:
                for j in nodes:
                    distances[i][j] = min(distances[i][j], distances[i][k] + distances[k][j])

        return distances

    def bellman_ford(self, start):
        """
        Find shortest paths from a start node using Bellman-Ford algorithm.
        Can detect negative cycles.

        Args:
            start: Starting node for the algorithm.

        Returns:
            dict: Dictionary with shortest distances to all nodes from start node.

        Raises:
            ValueError: If a negative cycle is detected in the graph.
        """
        distances = {node: float('inf') for node in self.graph}
        distances[start] = 0

        for _ in range(len(self.graph) - 1):
            for u in self.graph:
                for v, weight in self.graph[u].items():
                    if distances[u] + weight < distances[v]:
                        distances[v] = distances[u] + weight

        for u in self.graph:
            for v, weight in self.graph[u].items():
                if distances[u] + weight < distances[v]:
                    raise ValueError("El grafo contiene un ciclo negativo")

        return distances
    
    def ford_fulkerson(self, source, sink):
        """
        Find the maximum flow in a flow network using Ford-Fulkerson algorithm.

        Args:
            source: Source node of the flow network.
            sink: Sink node of the flow network.

        Returns:
            int: Maximum flow from source to sink.
        """
        def bfs_find_path(parent):
            visited = set([source])
            queue = deque([source])
            while queue:
                u = queue.popleft()
                for v in self.graph[u]:
                    if v not in visited and self.graph[u][v] - flow[u][v] > 0:
                        queue.append(v)
                        visited.add(v)
                        parent[v] = u
                        if v == sink:
                            return True
            return False

        flow = {u: {v: 0 for v in self.graph} for u in self.graph}
        max_flow = 0
        parent = {}

        while bfs_find_path(parent):
            path_flow = float('inf')
            s = sink
            while s != source:
                path_flow = min(path_flow, self.graph[parent[s]][s] - flow[parent[s]][s])
                s = parent[s]
            v = sink
            while v != source:
                u = parent[v]
                flow[u][v] += path_flow
                flow[v][u] -= path_flow
                v = u
            max_flow += path_flow

        return max_flow

    
def test_graph():
    g = Graph()

    nodes = ['A', 'B', 'C', 'D', 'E']
    for node in nodes:
        g.add_node(node)

    g.add_edge('A', 'B', weight=4)
    g.add_edge('A', 'C', weight=1)
    g.add_edge('B', 'C', weight=2)
    g.add_edge('B', 'D', weight=5)
    g.add_edge('C', 'D', weight=8)
    g.add_edge('C', 'E', weight=10)
    g.add_edge('D', 'E', weight=2)

    print("BFS from node 'A':", g.bfs('A'))
    print("DFS from node 'A':", g.dfs('A'))

    print("Primm from node 'A':", g.prim('A'))

    print("Kruskal:", g.kruskal())

    print("Minimum distances from node 'A' (Dijkstra):", g.dijkstra('A'))

    print("Minimum distances all-pair of nodes (Floyd-Warshall):")
    floyd_distances = g.floyd_warshall()
    for u in floyd_distances:
        for v in floyd_distances[u]:
            print(f"Distance from {u} to {v}: {floyd_distances[u][v]}")

    print("Minimum distances from node 'A' (Bellman-Ford):", g.bellman_ford('A'))

    try:
        max_flow = g.ford_fulkerson('A', 'E')
        print("Maximum flow from node A to node E (Ford-Fulkerson):", max_flow)
    except ValueError as e:
        print("Error:", e)

if __name__ == "__main__":
    test_graph()
