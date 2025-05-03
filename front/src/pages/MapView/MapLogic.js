import L from 'leaflet';
import { clearDistanceElements, showMinimumDistances } from '../../services/distanceService';
import { cleanupSimulationManager, initSimulationManager } from '../../services/simulationManager';

const API_BASE = 'http://localhost:5000';
const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d';

/**
 * Inicializa el mapa de Leaflet
 * @param {HTMLElement} mapElement - Elemento DOM donde montar el mapa
 * @returns {Object} - Instancia del mapa y manager de simulación
 */
export const initializeMap = (mapElement) => {
  if (!mapElement) return { map: null, simulationManager: null };
  
  const map = L.map(mapElement).setView([5.0703, -75.5138], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  const simulationManager = initSimulationManager(map);
  
  setTimeout(() => map.invalidateSize(), 0);
  
  return { map, simulationManager };
};

/**
 * Limpia recursos del mapa
 * @param {Object} map - Instancia del mapa
 * @param {Object} simulationManager - Manager de simulación
 */
export const cleanupMap = (map, simulationManager) => {
  if (simulationManager) {
    cleanupSimulationManager();
  }
  
  if (map) {
    map.off();
    map.remove();
  }
};

/**
 * Maneja la simulación de una ruta
 * @param {Object} simulationManager - Manager de simulación
 * @param {Object} routeLayers - Capas de rutas
 * @param {Object} eventData - Datos del evento
 */
export const handleSimulateRoute = (simulationManager, routeLayers, eventData) => {
  const { routeName, speed } = eventData;
  
  if (!simulationManager) {
    console.error('Simulation manager not initialized');
    return;
  }

  try {
    // Cerrar todos los popups abiertos
    routeLayers.forEach(layer => {
      if (layer && layer.isPopupOpen()) {
        layer.closePopup();
      }
    });
    
    // Iniciar la simulación con la velocidad seleccionada
    const result = simulationManager.startSimulation(routeName, parseInt(speed));
    
    if (!result.success) {
      console.error('Failed to start simulation:', result.message);
    }
  } catch (error) {
    console.error('Error starting simulation:', error);
  }
};

/**
 * Configura los manejadores de eventos del mapa
 * @param {Object} map - Instancia del mapa
 * @param {Function} handleMapClick - Manejador de clic en el mapa
 */
export const setupMapEventHandlers = (map, handleMapClick) => {
  if (!map) return;
  
  map.on('click', handleMapClick);
  
  return () => {
    if (map) map.off('click', handleMapClick);
  };
};

/**
 * Configura los manejadores de eventos para cálculo de tiempo estimado
 */
export const setupTimeEstimationHandlers = (routeLayers) => {
  const handleSpeedInputChange = (e) => {
    const speedInput = e.target;
    const estimatedTimeSpan = document.getElementById('estimatedTime');
    if (speedInput && estimatedTimeSpan) {
      const speed = parseInt(speedInput.value) || 15;
      const routeLayer = routeLayers.find(
        layer => layer && layer.routeData && layer.isPopupOpen()
      );
      if (routeLayer) {
        const distance = routeLayer.routeData.distance;
        const timeHours = (distance / 1000) / speed;
        const minutes = Math.round(timeHours * 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        estimatedTimeSpan.textContent = `${hours > 0 ? `${hours}h ` : ''}${remainingMinutes}m`;
      }
    }
  };

  document.addEventListener('input', handleSpeedInputChange);
  
  return () => {  
    document.removeEventListener('input', handleSpeedInputChange);
  };
};

/**
 * Muestra las distancias mínimas desde un nodo
 * @param {Object} map - Instancia del mapa
 * @param {String} startNodeName - Nombre del nodo inicial
 * @param {Object} distanceElements - Elementos de distancia actuales
 * @returns {Object} - Nuevos elementos de distancia
 */
export const showMapMinimumDistances = async (map, startNodeName, distanceElements) => {
  try {
    const elements = await showMinimumDistances(
      map, 
      startNodeName, 
      API_BASE, 
      OPENROUTE_API_KEY
    );
    return elements;
  } catch (error) {
    alert(`Error: ${error.message}`);
    return distanceElements;
  }
};

/**
 * Limpia los elementos de distancia del mapa
 * @param {Object} map - Instancia del mapa
 * @param {Object} distanceElements - Elementos de distancia
 * @returns {Object} - Objeto vacío de elementos de distancia
 */
export const clearMapDistanceRoutes = (map, distanceElements) => {
  // Limpiar elementos del mapa
  const clearedElements = clearDistanceElements(map, distanceElements);
  
  // Limpiar cualquier otro elemento relacionado
  const distanceLabels = document.querySelectorAll('.distance-label');
  distanceLabels.forEach(label => label.remove());
  
  const startMarkers = document.querySelectorAll('.start-node-marker');
  startMarkers.forEach(marker => marker.remove());
  
  return { routes: [], markers: [], legend: null };
};

export const getApiBaseUrl = () => API_BASE;
export const getOpenRouteApiKey = () => OPENROUTE_API_KEY;