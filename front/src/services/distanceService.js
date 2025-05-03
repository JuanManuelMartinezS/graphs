import {
    createColoredRoute,
    formatDistance,
    highlightStartNode,
    showDistanceLegend
} from '../utils/distanceUtils';

export function clearDistanceElements(map, elements) {
    if (!map || !elements) return { routes: [], markers: [], legend: null };
  
    // Limpiar rutas
    elements.routes?.forEach(route => {
      try {
        if (route && map.hasLayer(route)) {
          map.removeLayer(route);
        }
      } catch (e) {
        console.error("Error removing route layer:", e);
      }
    });
  
    // Limpiar marcadores
    elements.markers?.forEach(marker => {
      try {
        if (marker && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (e) {
        console.error("Error removing marker layer:", e);
      }
    });
  
    // Limpiar leyenda
    try {
      if (elements.legend && map.hasLayer(elements.legend)) {
        map.removeLayer(elements.legend);
      }
    } catch (e) {
      console.error("Error removing legend:", e);
    }
  
    // Limpiar lista del DOM si existe
    try {
        const legend = document.getElementById('distance-legend');
        if (legend) legend.remove();
      } catch (e) {
        console.error("Error removing legend:", e);
      }
  
    return { routes: [], markers: [], legend: null };
  };

export const showMinimumDistances = async (mapInstance, startNodeName, API_BASE, OPENROUTE_API_KEY) => {
    try {
        // Obtener todos los nodos del mapa
        const response = await fetch(`${API_BASE}/nodes`);
        if (!response.ok) throw new Error("Error al obtener nodos");
        const allNodes = await response.json();
        
        // Verificar que el nodo inicial es válido
        const startNode = allNodes.find(node => node.name === startNodeName);
        if (!startNode) {
            throw new Error('El punto de interés seleccionado no existe');
        }
        
        if (startNode.type !== 'interest') {
            throw new Error('El punto seleccionado debe ser un punto de interés, no un punto de control');
        }
        
        // Llamar al endpoint de distancias mínimas
        const distancesResponse = await fetch(`${API_BASE}/shortest-distances`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nodes: allNodes,
                startNodeName: startNodeName
            }),
        });
        
        if (!distancesResponse.ok) {
            const errorData = await distancesResponse.json();
            throw new Error(errorData.error || 'Error al obtener las distancias mínimas');
        }
        
        const distancesData = await distancesResponse.json();
        
        // Elementos que se van a crear
        const elements = {
            routes: [],
            markers: [],
            legend: null
        };
        
        // Mostrar el nodo inicial con un marcador especial
        const startMarker = highlightStartNode(mapInstance, startNode);
        elements.markers.push(startMarker);
        
        // Crear rutas para cada nodo destino
        const routePromises = Object.entries(distancesData.distances).map(
            async ([nodeName, info]) => {
                const targetNode = allNodes.find(node => node.name === nodeName);
                if (!targetNode) return null;

                const routeResult = await createColoredRoute(
                    mapInstance, 
                    startNode, 
                    targetNode, 
                    info.color, 
                    info.distance,
                    OPENROUTE_API_KEY
                );

                if (routeResult) {
                    elements.routes.push(routeResult.route);
                    elements.markers.push(routeResult.label);
                }
            }
        );

        await Promise.all(routePromises);
        
        // Mostrar leyenda de colores
        elements.legend = showDistanceLegend(distancesData.distances);
        
        return elements;
        
    } catch (error) {
        console.error('Error al mostrar distancias mínimas:', error);
        throw error;
    }
};