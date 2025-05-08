import {
  createColoredRoute,
  formatDistance,
  highlightStartNode,
  showDistanceLegend
} from '../utils/distanceUtils';

/**
* Limpia todos los elementos relacionados con distancias del mapa
* @function clearDistanceElements
* @param {Object} map - Instancia del mapa Leaflet
* @param {Object} elements - Objeto con elementos a limpiar
* @param {Array} [elements.routes] - Capas de rutas a eliminar
* @param {Array} [elements.markers] - Marcadores a eliminar
* @param {Object} [elements.legend] - Leyenda a eliminar
* @returns {Object} Objeto vacío de elementos {routes: [], markers: [], legend: null}
* @example
* const cleanElements = clearDistanceElements(map, currentElements);
*/
export function clearDistanceElements(map, elements) {
  if (!map || !elements) return { routes: [], markers: [], legend: null };

  // Limpiar rutas existentes
  elements.routes?.forEach(route => {
    try {
      if (route && map.hasLayer(route)) {
        map.removeLayer(route);
      }
    } catch (e) {
      console.error("Error removing route layer:", e);
    }
  });

  // Limpiar marcadores existentes
  elements.markers?.forEach(marker => {
    try {
      if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    } catch (e) {
      console.error("Error removing marker layer:", e);
    }
  });

  // Limpiar leyenda del mapa
  try {
    if (elements.legend && map.hasLayer(elements.legend)) {
      map.removeLayer(elements.legend);
    }
  } catch (e) {
    console.error("Error removing legend:", e);
  }

  // Limpiar leyenda del DOM si existe
  try {
      const legend = document.getElementById('distance-legend');
      if (legend) legend.remove();
    } catch (e) {
      console.error("Error removing legend:", e);
    }

  return { routes: [], markers: [], legend: null };
};

/**
* Calcula y muestra las distancias mínimas desde un nodo inicial a todos los demás nodos
* @async
* @function showMinimumDistances
* @param {Object} mapInstance - Instancia del mapa Leaflet
* @param {string} startNodeName - Nombre del nodo de inicio
* @param {string} API_BASE - URL base de la API
* @param {string} OPENROUTE_API_KEY - Clave API para OpenRouteService
* @returns {Promise<Object>} Objeto con los elementos creados {routes, markers, legend}
* @throws {Error} Cuando:
* - Fallan las peticiones a la API
* - El nodo inicial no existe o no es de interés
* - Hay errores al crear las rutas o marcadores
* @example
* const elements = await showMinimumDistances(map, 'Node1', 'https://api.example.com', 'api-key');
*/
export const showMinimumDistances = async (mapInstance, startNodeName, API_BASE, OPENROUTE_API_KEY) => {
  try {
      // 1. Obtener todos los nodos del backend
      const response = await fetch(`${API_BASE}/nodes`);
      if (!response.ok) throw new Error("Error al obtener nodos");
      const allNodes = await response.json();
      
      // 2. Validar nodo inicial
      const startNode = allNodes.find(node => node.name === startNodeName);
      if (!startNode) {
          throw new Error('El punto de interés seleccionado no existe');
      }
      
      if (startNode.type !== 'interest') {
          throw new Error('El punto seleccionado debe ser un punto de interés, no un punto de control');
      }
      
      // 3. Obtener distancias mínimas desde el backend
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
      
      // 4. Preparar contenedor para los nuevos elementos
      const elements = {
          routes: [],
          markers: [],
          legend: null
      };
      
      // 5. Resaltar nodo inicial con marcador especial
      const startMarker = highlightStartNode(mapInstance, startNode);
      elements.markers.push(startMarker);
      
      // 6. Crear rutas coloreadas para cada destino
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
      
      // 7. Mostrar leyenda de distancias
      elements.legend = showDistanceLegend(distancesData.distances);
      
      return elements;
      
  } catch (error) {
      console.error('Error al mostrar distancias mínimas:', error);
      throw error;
  }
};