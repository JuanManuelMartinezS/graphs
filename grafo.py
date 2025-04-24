from collections import defaultdict, deque
import heapq

class Graph:
    def __init__(self):
        self.graph = defaultdict(dict)

    def add_node(self, node):
        if node not in self.graph:
            self.graph[node] = {}

    def add_edge(self, node1, node2, weight=1, directed=False):
        self.graph[node1][node2] = weight
        if not directed:
            self.graph[node2][node1] = weight

    def dijkstra(self, start):
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