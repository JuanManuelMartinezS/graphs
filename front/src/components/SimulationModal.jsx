import React, { useEffect, useState } from 'react';
import { pauseSimulation, resumeSimulation, stopSimulation, changeSimulationSpeed, changeAverageSpeed, SIMULATION_EVENTS } from '../services/SimulationService';

function SimulationModal({ isOpen, onClose }) {
  const [simulationData, setSimulationData] = useState({
    routeName: '',
    distanceTraveled: 0,
    totalDistance: 0,
    elapsedTime: 0,
    averageSpeed: 15,
    estimatedTime: 0,
    simulationSpeed: 1,
    isPaused: false,
    upcomingCheckpoints: []
  });

  // Format time in minutes:seconds
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format distance in km with one decimal
  const formatDistance = (distanceInMeters) => {
    return (distanceInMeters / 1000).toFixed(1);
  };

  // Setup event listeners
  useEffect(() => {
    const handleSimulationStart = (e) => {
      setSimulationData({
        routeName: e.detail.routeName,
        distanceTraveled: 0,
        totalDistance: e.detail.totalDistance,
        elapsedTime: 0,
        averageSpeed: e.detail.averageSpeed,
        estimatedTime: e.detail.estimatedTime,
        simulationSpeed: 1,
        isPaused: false,
        upcomingCheckpoints: e.detail.upcomingCheckpoints || []
      });
    };

    const handleSimulationProgress = (e) => {
      setSimulationData(prev => ({
        ...prev,
        distanceTraveled: e.detail.distanceTraveled,
        elapsedTime: e.detail.elapsedTime,
        upcomingCheckpoints: e.detail.upcomingCheckpoints || prev.upcomingCheckpoints
      }));
    };

    const handleSimulationPause = () => {
      setSimulationData(prev => ({ ...prev, isPaused: true }));
    };

    const handleSimulationResume = () => {
      setSimulationData(prev => ({ ...prev, isPaused: false }));
    };

    const handleSimulationStop = () => {
      // The modal will be closed by the parent component
    };

    const handleSimulationFinish = () => {
      // Can be extended with additional UI elements for completion
    };

    const handleSpeedChange = (e) => {
      setSimulationData(prev => ({ ...prev, simulationSpeed: e.detail.speedMultiplier }));
    };

    // Add event listeners
    window.addEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
    window.addEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
    window.addEventListener(SIMULATION_EVENTS.PAUSE, handleSimulationPause);
    window.addEventListener(SIMULATION_EVENTS.RESUME, handleSimulationResume);
    window.addEventListener(SIMULATION_EVENTS.STOP, handleSimulationStop);
    window.addEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
    window.addEventListener(SIMULATION_EVENTS.SPEED_CHANGE, handleSpeedChange);

    // Clean up
    return () => {
      window.removeEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
      window.removeEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
      window.removeEventListener(SIMULATION_EVENTS.PAUSE, handleSimulationPause);
      window.removeEventListener(SIMULATION_EVENTS.RESUME, handleSimulationResume);
      window.removeEventListener(SIMULATION_EVENTS.STOP, handleSimulationStop);
      window.removeEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
      window.removeEventListener(SIMULATION_EVENTS.SPEED_CHANGE, handleSpeedChange);
    };
  }, []);

  // Calculate progress percentage
  const progressPercentage = Math.min(
    (simulationData.distanceTraveled / simulationData.totalDistance) * 100,
    100
  );

  // Calculate estimated time of arrival
  const calculateETA = () => {
    if (simulationData.averageSpeed <= 0) return 'N/A';
    
    const remainingDistance = simulationData.totalDistance - simulationData.distanceTraveled;
    const remainingTimeInMinutes = (remainingDistance / 1000) / simulationData.averageSpeed * 60;
    
    // Format as minutes:seconds
    const minutes = Math.floor(remainingTimeInMinutes);
    const seconds = Math.floor((remainingTimeInMinutes - minutes) * 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle speed change
  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    changeAverageSpeed(newSpeed);
    setSimulationData(prev => ({ ...prev, averageSpeed: newSpeed }));
  };

  // Handle simulation speed change
  const handleSimulationSpeedChange = (multiplier) => {
    changeSimulationSpeed(multiplier);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Simulación de Ruta</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold">{simulationData.routeName}</h3>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>0 km</span>
            <span>{formatDistance(simulationData.totalDistance)} km</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm text-gray-600">Distancia recorrida</p>
            <p className="text-xl font-bold">{formatDistance(simulationData.distanceTraveled)} km</p>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm text-gray-600">Tiempo transcurrido</p>
            <p className="text-xl font-bold">{formatTime(simulationData.elapsedTime)}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm text-gray-600">Velocidad media</p>
            <p className="text-xl font-bold">{simulationData.averageSpeed} km/h</p>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm text-gray-600">Tiempo estimado llegada</p>
            <p className="text-xl font-bold">{calculateETA()}</p>
          </div>
        </div>

        {/* Upcoming Checkpoints */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Próximos puntos de control</h4>
          {simulationData.upcomingCheckpoints.length > 0 ? (
            <div className="overflow-y-auto max-h-32">
              {simulationData.upcomingCheckpoints.map((checkpoint, index) => (
                <div key={index} className="flex items-center border-b border-gray-200 py-2">
                  <div className={`w-4 h-4 rounded-full mr-2 ${checkpoint.type === 'control' ? 
                    ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'][checkpoint.risk - 1] || 'bg-blue-500' : 
                    'bg-purple-500'}`}>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{checkpoint.nodeName}</p>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>
                        {checkpoint.type === 'control' ? `Riesgo: ${checkpoint.risk}` : 'Punto de interés'}
                      </span>
                      <span>{formatDistance(checkpoint.distanceRemaining)} km restantes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay puntos de control próximos</p>
          )}
        </div>

        {/* Control Settings */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold">Velocidad de ciclismo:</label>
            <span>{simulationData.averageSpeed} km/h</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={simulationData.averageSpeed}
            onChange={handleSpeedChange}
            className="w-full"
          />
        </div>

        {/* Simulation Speed Controls */}
        <div className="mb-6">
          <p className="font-semibold mb-2">Velocidad de simulación:</p>
          <div className="flex space-x-2">
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => handleSimulationSpeedChange(speed)}
                className={`px-3 py-1 rounded ${simulationData.simulationSpeed === speed ? 
                  'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-between">
          <button
            onClick={stopSimulation}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Detener
          </button>
          <button
            onClick={simulationData.isPaused ? resumeSimulation : pauseSimulation}
            className={`px-4 py-2 ${simulationData.isPaused ? 
              'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded`}
          >
            {simulationData.isPaused ? 'Reanudar' : 'Pausar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimulationModal;