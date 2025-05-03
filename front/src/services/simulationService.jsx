const API_BASE = 'http://localhost:5000';

// Global event for simulation updates
const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d';

export const SIMULATION_EVENTS = {
  START: 'simulation:start',
  PROGRESS: 'simulation:progress',
  FINISH: 'simulation:finish',
  PAUSE: 'simulation:pause',
  RESUME: 'simulation:resume',
  STOP: 'simulation:stop'
};

// State for the current simulation
let simulationState = {
  isActive: false,
  isPaused: false,
  currentPosition: null,
  routePoints: [],
  routeGeometry: null,
  routeName: '',
  distanceTraveled: 0,
  totalDistance: 0,
  elapsedTime: 0,
  averageSpeed: 15, // km/h
  intervalId: null,
  currentSegmentIndex: 0,
  startTime: null,
  currentSegmentDistance: 0
};

export const startSimulation = async (routeName, speed = 15) => {
  try {
    // Get route details
    const routeDetails = await fetchRouteDetails(routeName);
    
    // Get the full route geometry from OpenRouteService
    const routeGeometry = await fetchRouteGeometry(routeDetails);
    
    // Set initial simulation state
    resetSimulationState();
    
    simulationState.routeName = routeName;
    simulationState.routePoints = routeDetails.points;
    simulationState.routeGeometry = routeGeometry;
    simulationState.totalDistance = routeDetails.distance;
    simulationState.averageSpeed = speed;
    simulationState.startTime = Date.now();
    
    // Set initial position
    const startPoint = routeGeometry.coordinates[0];
    simulationState.currentPosition = {
      lat: startPoint[1],
      lng: startPoint[0]
    };
    
    // Dispatch start event with initial position
    const startEvent = new CustomEvent(SIMULATION_EVENTS.START, {
      detail: {
        routeName,
        totalDistance: routeDetails.distance,
        averageSpeed: speed,
        initialPosition: simulationState.currentPosition
      }
    });
    window.dispatchEvent(startEvent);
    
    // Start the simulation
    initializeSimulation();
    
    return {
      success: true,
      message: `Simulation started for route: ${routeName} at ${speed} km/h`
    };
  } catch (error) {
    resetSimulationState();
    return {
      success: false,
      message: `Failed to start simulation: ${error.message}`
    };
  }
};

const fetchRouteDetails = async (routeName) => {
  try {
    const response = await fetch(`${API_BASE}/routes`);
    if (!response.ok) {
      throw new Error(`Failed to fetch route details: ${response.statusText}`);
    }
    const routes = await response.json();
    const route = routes.find(r => r.name === routeName);
    if (!route) {
      throw new Error(`Route "${routeName}" not found`);
    }
    return route;
  } catch (error) {
    console.error('Error fetching route details:', error);
    throw error;
  }
};

const fetchRouteGeometry = async (routeDetails) => {
  try {
    const coordinates = routeDetails.points.map(point => [point.lng, point.lat]);
    
    const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
      method: 'POST',
      headers: {
        'Authorization': OPENROUTE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: coordinates,
        elevation: false,
        instructions: false,
        preference: 'recommended',
        units: 'm'
      })
    });

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }

    const data = await response.json();
    return data.features[0].geometry;
  } catch (error) {
    console.error("Error al calcular la geometría de la ruta:", error);
    throw error;
  }
};

const initializeSimulation = () => {
  if (!simulationState.routeGeometry || !simulationState.startTime) {
    return;
  }
  
  simulationState.isActive = true;
  startSimulationLoop();
};

const startSimulationLoop = () => {
  if (simulationState.intervalId) {
    clearInterval(simulationState.intervalId);
  }
  
  const updateInterval = 200; // Update every 200ms
  simulationState.intervalId = setInterval(() => {
    if (!simulationState.isActive || simulationState.isPaused) return;
    updatePosition();
  }, updateInterval);
};

const updatePosition = () => {
  if (!simulationState.isActive || simulationState.isPaused) return;
  
  const now = Date.now();
  const elapsedTime = (now - simulationState.startTime) / 1000; // in seconds
  const distanceToCover = (simulationState.averageSpeed * 1000 / 3600) * elapsedTime; // in meters
  
  // Check if we've reached the end
  if (distanceToCover >= simulationState.totalDistance) {
    endSimulation();
    return;
  }
  
  // Find the current segment based on distance covered
  let currentDistance = 0;
  let currentSegmentIndex = 0;
  
  for (let i = 0; i < simulationState.routeGeometry.coordinates.length - 1; i++) {
    const segmentStart = simulationState.routeGeometry.coordinates[i];
    const segmentEnd = simulationState.routeGeometry.coordinates[i + 1];
    const segmentDistance = calculateDistance(
      segmentStart[1], segmentStart[0],
      segmentEnd[1], segmentEnd[0]
    );
    
    if (currentDistance + segmentDistance > distanceToCover) {
      currentSegmentIndex = i;
      break;
    }
    
    currentDistance += segmentDistance;
  }
  
  // Calculate position within the current segment
  const segmentStart = simulationState.routeGeometry.coordinates[currentSegmentIndex];
  const segmentEnd = simulationState.routeGeometry.coordinates[currentSegmentIndex + 1];
  const segmentDistance = calculateDistance(
    segmentStart[1], segmentStart[0],
    segmentEnd[1], segmentEnd[0]
  );
  
  const remainingDistance = distanceToCover - currentDistance;
  const ratio = remainingDistance / segmentDistance;
  
  const newLat = segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * ratio;
  const newLng = segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * ratio;
  
  simulationState.currentPosition = { lat: newLat, lng: newLng };
  simulationState.currentSegmentIndex = currentSegmentIndex;
  simulationState.distanceTraveled = distanceToCover;
  simulationState.elapsedTime = elapsedTime;
  
  // Dispatch progress event with updated position
  window.dispatchEvent(new CustomEvent(SIMULATION_EVENTS.PROGRESS, {
    detail: {
      currentPosition: simulationState.currentPosition,
      distanceTraveled: distanceToCover,
      elapsedTime,
      averageSpeed: simulationState.averageSpeed,
      currentSegmentIndex
    }
  }));
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const endSimulation = () => {
  if (simulationState.intervalId) {
    clearInterval(simulationState.intervalId);
    simulationState.intervalId = null;
  }
  
  simulationState.isActive = false;
  
  window.dispatchEvent(new CustomEvent(SIMULATION_EVENTS.FINISH, { 
    detail: {
      routeName: simulationState.routeName,
      totalDistance: simulationState.totalDistance,
      totalTime: simulationState.elapsedTime
    }
  }));
};

const resetSimulationState = () => {
  if (simulationState.intervalId) {
    clearInterval(simulationState.intervalId);
  }
  
  simulationState = {
    isActive: false,
    isPaused: false,
    currentPosition: null,
    routePoints: [],
    routeGeometry: null,
    routeName: '',
    distanceTraveled: 0,
    totalDistance: 0,
    elapsedTime: 0,
    averageSpeed: 15,
    intervalId: null,
    currentSegmentIndex: 0,
    startTime: null,
    currentSegmentDistance: 0
  };
};

export const pauseSimulation = () => {
  if (!simulationState.isActive || simulationState.isPaused) return;
  
  simulationState.isPaused = true;
  
  window.dispatchEvent(new CustomEvent(SIMULATION_EVENTS.PAUSE, { 
    detail: { elapsedTime: simulationState.elapsedTime }
  }));
};

export const resumeSimulation = () => {
  if (!simulationState.isActive || !simulationState.isPaused) return;
  
  simulationState.isPaused = false;
  
  window.dispatchEvent(new CustomEvent(SIMULATION_EVENTS.RESUME, { 
    detail: { elapsedTime: simulationState.elapsedTime }
  }));
};

export const stopSimulation = () => {
  if (!simulationState.isActive) return;
  
  if (simulationState.intervalId) {
    clearInterval(simulationState.intervalId);
    simulationState.intervalId = null;
  }
  
  simulationState.isActive = false;
  
  window.dispatchEvent(new CustomEvent(SIMULATION_EVENTS.STOP, { 
    detail: {
      routeName: simulationState.routeName,
      distanceTraveled: simulationState.distanceTraveled,
      elapsedTime: simulationState.elapsedTime
    }
  }));
  
  resetSimulationState();
};