import { createBicycleMarker } from '../components/ui/BicycleMarker';
import {
  startSimulation as initializeSimulation,
  pauseSimulation,
  resumeSimulation,
  SIMULATION_EVENTS,
  stopSimulation
} from './SimulationService';

let bicycleMarker = null;
let simulationActive = false;
let currentMap = null;

// Initialize the simulation manager with the map
export const initSimulationManager = (map) => {
  if (!map) {
    console.error('Map instance is required to initialize simulation manager');
    return null;
  }
  
  currentMap = map;
  
  // Listen for simulation events
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

// Clean up event listeners
export const cleanupSimulationManager = () => {
  window.removeEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
  window.removeEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
  window.removeEventListener(SIMULATION_EVENTS.STOP, handleSimulationStop);
  window.removeEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
  
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  simulationActive = false;
};

// Start a route simulation
const startRouteSimulation = async (routeName, speed = 15) => {
  try {
    if (!currentMap) {
      return { success: false, message: 'Map not initialized' };
    }
    
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

// Handle simulation start event
const handleSimulationStart = (e) => {
  if (!currentMap) {
    return;
  }
  
  // Create the bicycle marker at the initial position
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  try {
    bicycleMarker = createBicycleMarker(currentMap, e.detail.initialPosition);
    
    // Center map on the starting position
    currentMap.setView([
      e.detail.initialPosition.lat,
      e.detail.initialPosition.lng
    ], currentMap.getZoom());
  } catch (error) {
    console.error('Error creating bicycle marker:', error);
  }
};

// Handle simulation progress event
const handleSimulationProgress = (e) => {
  if (!bicycleMarker || !currentMap) {
    return;
  }
  
  // Update the bicycle position
  bicycleMarker.updatePosition(e.detail.currentPosition);
  
  // Follow the bicycle on the map
  currentMap.panTo([e.detail.currentPosition.lat, e.detail.currentPosition.lng], {
    animate: true,
    duration: 0.2
  });
};

// Handle simulation stop event
const handleSimulationStop = () => {
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  simulationActive = false;
};

// Handle simulation finish event
const handleSimulationFinish = () => {
  if (bicycleMarker) {
    bicycleMarker.remove();
    bicycleMarker = null;
  }
  
  simulationActive = false;
};