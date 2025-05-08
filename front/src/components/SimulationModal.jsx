import React, { useEffect, useState } from 'react';
import { 
  pauseSimulation, 
  resumeSimulation, 
  stopSimulation, 
  changeSimulationSpeed, 
  changeAverageSpeed, 
  SIMULATION_EVENTS 
} from '../services/simulationService';

/**
 * Componente SimulationModal - Modal completo con controles detallados de simulación
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Controla si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @returns {JSX.Element|null} Modal de simulación o null si no está abierto
 */
function SimulationModal({ isOpen, onClose }) {
  // Estado con todos los datos de simulación
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

  /**
   * Formatea segundos en formato mm:ss
   * @param {number} timeInSeconds - Tiempo en segundos
   * @returns {string} Tiempo formateado
   */
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Formatea metros a kilómetros con un decimal
   * @param {number} distanceInMeters - Distancia en metros
   * @returns {string} Distancia formateada
   */
  const formatDistance = (distanceInMeters) => {
    return (distanceInMeters / 1000).toFixed(1);
  };

  /**
   * Efecto para configurar listeners de eventos de simulación
   */
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

    const handleSpeedChange = (e) => {
      setSimulationData(prev => ({ ...prev, simulationSpeed: e.detail.speedMultiplier }));
    };

    // Configurar listeners
    window.addEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
    window.addEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
    window.addEventListener(SIMULATION_EVENTS.PAUSE, handleSimulationPause);
    window.addEventListener(SIMULATION_EVENTS.RESUME, handleSimulationResume);
    window.addEventListener(SIMULATION_EVENTS.SPEED_CHANGE, handleSpeedChange);

    // Limpieza
    return () => {
      window.removeEventListener(SIMULATION_EVENTS.START, handleSimulationStart);
      window.removeEventListener(SIMULATION_EVENTS.PROGRESS, handleSimulationProgress);
      window.removeEventListener(SIMULATION_EVENTS.PAUSE, handleSimulationPause);
      window.removeEventListener(SIMULATION_EVENTS.RESUME, handleSimulationResume);
      window.removeEventListener(SIMULATION_EVENTS.SPEED_CHANGE, handleSpeedChange);
    };
  }, []);

  /**
   * Calcula el porcentaje de progreso de la ruta
   * @returns {number} Porcentaje completado (0-100)
   */
  const progressPercentage = Math.min(
    (simulationData.distanceTraveled / simulationData.totalDistance) * 100,
    100
  );

  /**
   * Calcula el tiempo estimado de llegada
   * @returns {string} Tiempo estimado en formato mm:ss
   */
  const calculateETA = () => {
    if (simulationData.averageSpeed <= 0) return 'N/A';
    
    const remainingDistance = simulationData.totalDistance - simulationData.distanceTraveled;
    const remainingTimeInMinutes = (remainingDistance / 1000) / simulationData.averageSpeed * 60;
    
    const minutes = Math.floor(remainingTimeInMinutes);
    const seconds = Math.floor((remainingTimeInMinutes - minutes) * 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Maneja el cambio de velocidad del ciclista
   * @param {React.ChangeEvent<HTMLInputElement>} e - Evento del input range
   */
  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    changeAverageSpeed(newSpeed);
    setSimulationData(prev => ({ ...prev, averageSpeed: newSpeed }));
  };

  /**
   * Maneja el cambio de velocidad de simulación
   * @param {number} multiplier - Multiplicador de velocidad (0.5x, 1x, 2x, etc.)
   */
  const handleSimulationSpeedChange = (multiplier) => {
    changeSimulationSpeed(multiplier);
  };

  // No renderizar si el modal está cerrado
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 m-4">
        {/* Encabezado del modal */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Simulación de Ruta</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Cerrar modal de simulación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nombre de la ruta */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{simulationData.routeName}</h3>
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={progressPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>0 km</span>
            <span>{formatDistance(simulationData.totalDistance)} km</span>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Distancia recorrida', value: formatDistance(simulationData.distanceTraveled), unit: 'km' },
            { label: 'Tiempo transcurrido', value: formatTime(simulationData.elapsedTime) },
            { label: 'Velocidad media', value: simulationData.averageSpeed, unit: 'km/h' },
            { label: 'Tiempo estimado llegada', value: calculateETA() }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-100 p-3 rounded">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-xl font-bold">
                {stat.value} {stat.unit ? <span className="text-sm font-normal">{stat.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>

        {/* Próximos puntos de control */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Próximos puntos de control</h4>
          {simulationData.upcomingCheckpoints.length > 0 ? (
            <div className="overflow-y-auto max-h-32">
              {simulationData.upcomingCheckpoints.map((checkpoint, index) => (
                <div key={index} className="flex items-center border-b border-gray-200 py-2">
                  <div 
                    className={`w-4 h-4 rounded-full mr-2 ${checkpoint.type === 'control' ? 
                      ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'][checkpoint.risk - 1] || 'bg-blue-500' : 
                      'bg-purple-500'}`}
                    aria-label={checkpoint.type === 'control' ? `Punto de control riesgo ${checkpoint.risk}` : 'Punto de interés'}
                  >
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

        {/* Control de velocidad del ciclista */}
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
            aria-label="Control deslizante para ajustar velocidad de ciclismo"
          />
        </div>

        {/* Control de velocidad de simulación */}
        <div className="mb-6">
          <p className="font-semibold mb-2">Velocidad de simulación:</p>
          <div className="flex space-x-2">
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => handleSimulationSpeedChange(speed)}
                className={`px-3 py-1 rounded ${simulationData.simulationSpeed === speed ? 
                  'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                aria-label={`Velocidad de simulación ${speed}x`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Botones de control principales */}
        <div className="flex justify-between">
          <button
            onClick={stopSimulation}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            aria-label="Detener simulación"
          >
            Detener
          </button>
          <button
            onClick={simulationData.isPaused ? resumeSimulation : pauseSimulation}
            className={`px-4 py-2 ${simulationData.isPaused ? 
              'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded`}
            aria-label={simulationData.isPaused ? 'Reanudar simulación' : 'Pausar simulación'}
          >
            {simulationData.isPaused ? 'Reanudar' : 'Pausar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimulationModal;