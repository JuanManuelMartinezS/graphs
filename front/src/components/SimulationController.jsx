import React, { useState, useEffect } from 'react';
import { SIMULATION_EVENTS } from '../services/simulationService';

/**
 * Componente SimulationController - Controlador de simulación que muestra un panel flotante
 * con información y controles durante la simulación de rutas.
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.simulationManager - Gestor de simulación con métodos para controlar el marcador de bicicleta
 * @returns {JSX.Element|null} Componente de control de simulación o null si no está activo
 */
const SimulationController = ({ simulationManager }) => {
  // Estados del componente
  const [isOpen, setIsOpen] = useState(false);
  const [simulationData, setSimulationData] = useState(null);

  /**
   * Efecto para configurar los listeners de eventos de simulación
   */
  useEffect(() => {
    /**
     * Maneja el evento de inicio de simulación
     * @param {CustomEvent} e - Evento con detalles de la simulación
     */
    const handleSimulationStart = (e) => {
      // Inicializa el marcador de bicicleta en el mapa
      if (simulationManager?.initializeBicycleMarker) {
        simulationManager.initializeBicycleMarker(e.detail.initialPosition);
      }
      
      // Calcula el tiempo estimado en minutos
      const distanceKm = e.detail.totalDistance / 1000;
      const speedKmh = e.detail.averageSpeed;
      const estimatedMinutes = Math.round((distanceKm / speedKmh) * 60);
      
      // Actualiza el estado con los datos de la simulación
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

    /**
     * Maneja el evento de progreso de simulación
     * @param {CustomEvent} e - Evento con detalles del progreso
     */
    const handleSimulationProgress = (e) => {
      // Actualiza la posición del marcador de bicicleta
      if (simulationManager?.updateBicyclePosition) {
        simulationManager.updateBicyclePosition(e.detail.currentPosition);
      }
      
      // Actualiza los datos de progreso
      setSimulationData(prev => ({
        ...prev,
        distanceTraveled: e.detail.distanceTraveled,
        elapsedTime: e.detail.elapsedTime,
        averageSpeed: e.detail.averageSpeed
      }));
    };

    /**
     * Maneja el evento de finalización de simulación
     */
    const handleSimulationFinish = () => {
      // Elimina el marcador de bicicleta
      if (simulationManager?.removeBicycleMarker) {
        simulationManager.removeBicycleMarker();
      }
      setIsOpen(false);
      setSimulationData(null);
    };

    // Configura listeners de eventos
    window.addEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
    window.addEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
    window.addEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);

    // Limpieza de listeners
    return () => {
      window.removeEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
      window.removeEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
      window.removeEventListener(SIMULATION_EVENTS.FINISH, handleSimulationFinish);
    };
  }, [simulationManager]);

  /**
   * Formatea minutos en un string legible (ej: 125 => "2h 5m")
   * @param {number} minutes - Minutos a formatear
   * @returns {string} Tiempo formateado
   */
  const formatTime = (minutes) => {
    if (isNaN(minutes)) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${remainingMinutes}m`;
  };

  /**
   * Pausa la simulación actual
   */
  const handlePauseSimulation = () => {
    simulationManager?.pauseSimulation();
  };

  /**
   * Reanuda la simulación pausada
   */
  const handleResumeSimulation = () => {
    simulationManager?.resumeSimulation();
  };

  /**
   * Detiene completamente la simulación
   */
  const handleStopSimulation = () => {
    if (simulationManager) {
      simulationManager.stopSimulation();
      setIsOpen(false);
      setSimulationData(null);
    }
  };

  // No renderizar si no hay simulación activa
  if (!isOpen || !simulationData) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg w-80 z-50">
      {/* Encabezado del panel */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Simulación en curso</h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Cerrar panel de simulación"
        >
          ✕
        </button>
      </div>
      
      {/* Información de la simulación */}
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Ruta: {simulationData.routeName}</p>
          <p className="text-sm text-gray-600">
            Distancia: {(simulationData.distanceTraveled / 1000).toFixed(2)} km / {(simulationData.totalDistance / 1000).toFixed(2)} km
          </p>
          <p className="text-sm text-gray-600">
            Tiempo transcurrido: {Math.floor(simulationData.elapsedTime / 60)}:{(simulationData.elapsedTime % 60).toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-600">
            Tiempo estimado: {formatTime(simulationData.estimatedTime)}
          </p>
          <p className="text-sm text-gray-600">
            Velocidad: {simulationData.averageSpeed} km/h
          </p>
        </div>

        {/* Controles de simulación */}
        <div className="flex space-x-2">
          <button
            onClick={handlePauseSimulation}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            aria-label="Pausar simulación"
          >
            Pausar
          </button>
          <button
            onClick={handleResumeSimulation}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            aria-label="Reanudar simulación"
          >
            Reanudar
          </button>
          <button
            onClick={handleStopSimulation}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            aria-label="Detener simulación"
          >
            Detener
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationController;