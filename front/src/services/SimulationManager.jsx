import { createBicycleMarker } from '../components/ui/BicycleMarker';
import {
  startSimulation as initializeSimulation,
  pauseSimulation,
  resumeSimulation,
  SIMULATION_EVENTS,
  stopSimulation
} from './simulationService';

// Variables de estado del módulo
let bicycleMarker = null;
let simulationActive = false;
let currentMap = null;

/**
 * Inicializa el gestor de simulación con el mapa de Leaflet
 * @param {L.Map} map - Instancia del mapa Leaflet
 * @returns {Object|null} Objeto con métodos de control de simulación o null si falla
 * 
 * @example
 * const simulationManager = initSimulationManager(map);
 * simulationManager.startSimulation('ruta-1', 15);
 */
export const initSimulationManager = (map) => {
  if (!map) {
    console.error('Map instance is required to initialize simulation manager');
    return null;
  }
  
  currentMap = map;
  
  // Configurar listeners de eventos de simulación
  window.addEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
  window.addEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
  window.addEventListener(SIMULATION_EVENTS.STOP, handleSimulationStop);
  window.addEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
  
  return {
    startSimulation: startRouteSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    isSimulationActive: () => simulationActive
  };
};

/**
 * Limpia los recursos del gestor de simulación
 * - Elimina event listeners
 * - Remueve el marcador de bicicleta
 * - Reinicia el estado
 */
export const cleanupSimulationManager = () => {
  // Remover listeners de eventos
  window.removeEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
  window.removeEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
  window.removeEventListener(SIMULATION_EVENTS.STOP, handleSimulationStop);
  window.removeEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
  
  // Limpiar marcador de bicicleta si existe
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  simulationActive = false;
};

/**
 * Inicia una simulación de ruta
 * @param {string} routeName - Nombre de la ruta a simular
 * @param {number} [speed=15] - Velocidad de simulación en km/h
 * @returns {Promise<Object>} Objeto con resultado de la operación
 */
const startRouteSimulation = async (routeName, speed = 15) => {
  try {
    if (!currentMap) {
      return { success: false, message: 'Map not initialized' };
    }
    
    // Detener simulación activa si existe
    if (simulationActive) {
      stopSimulation();
    }
    
    simulationActive = true;
    const result = await initializeSimulation(routeName, speed);
    
    if (!result.success) {
      simulationActive = false;
      return result;
    }
    
    return { success: true, message: `Simulation started for route: ${routeName}` };
  } catch (error) {
    simulationActive = false;
    return { success: false, message: `Failed to start simulation: ${error.message}` };
  }
};

/**
 * Manejador del evento de inicio de simulación
 * @param {CustomEvent} e - Evento con detalles de la simulación
 */
const handleSimulationStart = (e) => {
  if (!currentMap) return;
  
  // Limpiar marcador existente
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  try {
    // Crear nuevo marcador de bicicleta
    bicycleMarker = createBicycleMarker(currentMap, e.detail.initialPosition);
    
    // Centrar mapa en la posición inicial
    currentMap.setView([
      e.detail.initialPosition.lat,
      e.detail.initialPosition.lng
    ], currentMap.getZoom());
  } catch (error) {
    console.error('Error creating bicycle marker:', error);
  }
};

/**
 * Manejador del evento de progreso de simulación
 * @param {CustomEvent} e - Evento con detalles del progreso
 */
const handleSimulationProgress = (e) => {
  if (!bicycleMarker || !currentMap) return;
  
  // Actualizar posición del marcador
  bicycleMarker.updatePosition(e.detail.currentPosition);
  
  // Mover el mapa para seguir la bicicleta
  currentMap.panTo([e.detail.currentPosition.lat, e.detail.currentPosition.lng], {
    animate: true,
    duration: 0.2
  });
};

/**
 * Manejador del evento de detención de simulación
 */
const handleSimulationStop = () => {
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  simulationActive = false;
};

/**
 * Manejador del evento de finalización de simulación
 */
const handleSimulationFinish = () => {
  handleSimulationStop();
};