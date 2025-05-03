import React, { useState, useEffect } from 'react';
import { SIMULATION_EVENTS } from '../services/SimulationService';

const SimulationController = ({ simulationManager }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [simulationData, setSimulationData] = useState(null);

  // Escuchar eventos de simulación
  useEffect(() => {
    const handleSimulationStart = (e) => {
      if (simulationManager && simulationManager.initializeBicycleMarker) {
        simulationManager.initializeBicycleMarker(e.detail.initialPosition);
      }
      
      // Calcular el tiempo estimado en minutos
      const distanceKm = e.detail.totalDistance / 1000;
      const speedKmh = e.detail.averageSpeed;
      const estimatedMinutes = Math.round((distanceKm / speedKmh) * 60);
      
      setSimulationData({
        routeName: e.detail.routeName,
        totalDistance: e.detail.totalDistance,
        distanceTraveled: 0,
        elapsedTime: 0,
        averageSpeed: e.detail.averageSpeed,
        estimatedTime: estimatedMinutes
      });
      setIsOpen(true);
    };

    const handleSimulationProgress = (e) => {
      if (simulationManager && simulationManager.updateBicyclePosition) {
        simulationManager.updateBicyclePosition(e.detail.currentPosition);
      }
      setSimulationData(prev => ({
        ...prev,
        distanceTraveled: e.detail.distanceTraveled,
        elapsedTime: e.detail.elapsedTime,
        averageSpeed: e.detail.averageSpeed
      }));
    };

    const handleSimulationFinish = () => {
      if (simulationManager && simulationManager.removeBicycleMarker) {
        simulationManager.removeBicycleMarker();
      }
      setIsOpen(false);
      setSimulationData(null);
    };

    window.addEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
    window.addEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
    window.addEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);

    return () => {
      window.removeEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
      window.removeEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
      window.removeEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
    };
  }, [simulationManager]);

  const formatTime = (minutes) => {
    if (isNaN(minutes)) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${remainingMinutes}m`;
  };

  const handlePauseSimulation = () => {
    if (simulationManager) {
      simulationManager.pauseSimulation();
    }
  };

  const handleResumeSimulation = () => {
    if (simulationManager) {
      simulationManager.resumeSimulation();
    }
  };

  const handleStopSimulation = () => {
    if (simulationManager) {
      simulationManager.stopSimulation();
      setIsOpen(false);
      setSimulationData(null);
    }
  };

  if (!isOpen || !simulationData) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg w-80 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Simulación en curso</h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Ruta: {simulationData?.routeName}</p>
          <p className="text-sm text-gray-600">
            Distancia: {(simulationData?.distanceTraveled / 1000).toFixed(2)} km / {(simulationData?.totalDistance / 1000).toFixed(2)} km
          </p>
          <p className="text-sm text-gray-600">
            Tiempo transcurrido: {Math.floor(simulationData?.elapsedTime / 60)}:{(simulationData?.elapsedTime % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-600">
            Tiempo estimado: {formatTime(simulationData?.estimatedTime)}
          </p>
          <p className="text-sm text-gray-600">
            Velocidad: {simulationData?.averageSpeed} km/h
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handlePauseSimulation}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Pausar
          </button>
          <button
            onClick={handleResumeSimulation}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Reanudar
          </button>
          <button
            onClick={handleStopSimulation}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Detener
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationController;