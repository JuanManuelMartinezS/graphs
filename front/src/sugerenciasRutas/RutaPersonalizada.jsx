import React, { useState } from 'react';
import Modal from '../components/ui/Modal';

/**
 * Componente RutaPersonalizada - Modal para encontrar rutas que cumplan con criterios específicos
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Controla si el modal está abierto
 * @param {Function} props.onClose - Manejador para cerrar el modal
 * @param {Array} props.routes - Lista de rutas disponibles para sugerir
 * @param {Function} props.onRouteSelected - Callback cuando se selecciona una ruta
 */
function RutaPersonalizada({ isOpen, onClose, routes, onRouteSelected }) {
  /**
 * @state {number} distance - Distancia deseada en metros (valor inicial: 1000)
 * @state {number} difficulty - Nivel máximo de dificultad permitido (1-5, valor inicial: 3)
 * @state {number} maxRisk - Nivel máximo de riesgo permitido (1-5, valor inicial: 3)
 * @state {Object|null} suggestedRoute - Ruta sugerida que cumple los criterios
 * @state {boolean} loading - Indica si está en proceso de búsqueda
 * @state {string|null} error - Mensaje de error si la búsqueda falla
 * @state {boolean} selectionSuccess - Indica si la selección fue exitosa
 */
  const [distance, setDistance] = useState(1000);
  const [difficulty, setDifficulty] = useState(3);
  const [maxRisk, setMaxRisk] = useState(3);
  const [suggestedRoute, setSuggestedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionSuccess, setSelectionSuccess] = useState(false);

  /**
   * Busca la mejor ruta según los criterios seleccionados
   * @description
   * - Filtra rutas que cumplan con los criterios de distancia, dificultad y riesgo
   * - Ordena las rutas por cercanía a la distancia deseada y menor riesgo
   * - Maneja estados de carga y errores durante el proceso
   * - Establece la ruta sugerida en el estado
   */
  const findBestRoute = () => {
    setLoading(true);
    setSuggestedRoute(null);
    setError(null);
    setSelectionSuccess(false);

    setTimeout(() => {
      try {
        // Validación de rutas disponibles
        if (!routes || routes.length === 0) {
          setError("No hay rutas disponibles");
          return;
        }

        // Filtrado de rutas elegibles
        const eligibleRoutes = routes.filter(route => {
          // Calcula la diferencia absoluta entre la distancia de la ruta y la distancia deseada
          const distanceDiff = Math.abs(route.distance - distance);

          // Retorna true si la ruta cumple con TODOS los siguientes criterios:
          return (
            // 1. La dificultad de la ruta es menor o igual a la dificultad máxima seleccionada
            route.difficulty <= difficulty &&

            // 2. El riesgo de la ruta es menor o igual al riesgo máximo seleccionado
            route.risk <= maxRisk &&

            // 3. La diferencia de distancia está dentro del margen permitido:
            //    - Se permite hasta un 50% de la distancia deseada O 1000 metros (lo que sea mayor)
            //    - Esto evita descartar rutas cercanas en distancia cuando se buscan distancias pequeñas
            distanceDiff <= Math.max(distance * 0.5, 1000)
          );
        });

        // Validación de rutas encontradas
        if (eligibleRoutes.length === 0) {
          // Si no se encontraron rutas que cumplan los filtros:
          // 1. Establece un mensaje de error para mostrar al usuario
          setError("No se encontraron rutas que cumplan los criterios");

          // 2. Termina la ejecución de la función ya que no hay rutas para procesar
          return;
        }

        // Ordenamiento y selección de la mejor ruta
        const bestRoute = [...eligibleRoutes].sort((a, b) => {
          // Calcula la diferencia de distancia para ambas rutas (respecto a la distancia deseada)
          const diffA = Math.abs(a.distance - distance);
          const diffB = Math.abs(b.distance - distance);

          // Criterios de ordenamiento:
          if (diffA === diffB) {
            // Si ambas rutas tienen la misma diferencia de distancia:
            // Prioriza la ruta con MENOR riesgo (orden ascendente por riesgo)
            return a.risk - b.risk;
          }

          // Si las diferencias de distancia son distintas:
          // Prioriza la ruta con MENOR diferencia de distancia (orden ascendente por diferencia)
          return diffA - diffB;
        })[0]; // Toma el primer elemento del array ordenado (el mejor según los criterios)

        setSuggestedRoute(bestRoute);
      } catch (err) {
        setError("Error al buscar rutas");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  /**
   * Maneja la selección de la ruta sugerida
   * @description
   * - Llama al callback onRouteSelected con el nombre de la ruta
   * - Muestra estado de éxito temporalmente
   * - Cierra el modal después de 800ms
   */
  const handleSelectRoute = () => {
    if (suggestedRoute) {
      onRouteSelected(suggestedRoute.name);
      setSelectionSuccess(true);

      setTimeout(() => {
        setSelectionSuccess(false);
        onClose();
      }, 800);
    }
  };

  /**
   * Renderiza un modal con:
   * - Controles para seleccionar criterios de búsqueda (distancia, dificultad, riesgo)
   * - Botón para iniciar la búsqueda
   * - Visualización de errores si ocurren
   * - Detalles de la ruta sugerida cuando se encuentra
   * - Botón para confirmar selección de ruta
   * 
   * @returns {JSX.Element} Componente Modal con formulario de búsqueda
   */
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4 max-w-md mx-auto bg-white rounded-lg">
        <h2 className="text-xl text-gray-800 font-bold mb-4 text-center">Sugerencia de Ruta</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distancia deseada (metros)
            </label>
            <input
              type="number"
              min="1"
              value={distance}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1) {
                  setDistance(val);
                } else if (e.target.value === "") {
                  setDistance("");
                }
              }}
              onBlur={(e) => {
                if (e.target.value === "" || parseInt(e.target.value) < 1) {
                  setDistance(1000);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dificultad máxima
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>
                    {num} - {['Muy fácil', 'Fácil', 'Moderada', 'Difícil', 'Muy difícil'][num - 1]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Riesgo máximo
              </label>
              <select
                value={maxRisk}
                onChange={(e) => setMaxRisk(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>
                    {num} - {['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'][num - 1]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              onClick={findBestRoute}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition disabled:bg-blue-400"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Buscando...
                </span>
              ) : 'Buscar Ruta'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {suggestedRoute && (
            <div className={`mt-4 p-4 border rounded-md ${selectionSuccess ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200'}`}>
              <h3 className="font-bold text-lg text-gray-800">{suggestedRoute.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{suggestedRoute.description}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-blue-100 p-2 rounded-md">
                  <div className="text-xs text-blue-800">Distancia</div>
                  <div className="font-bold text-gray-800">{suggestedRoute.distance}m</div>
                </div>
                <div className="bg-green-100 p-2 rounded-md">
                  <div className="text-xs text-green-800">Dificultad</div>
                  <div className="font-bold text-gray-800">{suggestedRoute.difficulty}/5</div>
                </div>
                <div className="bg-yellow-100 p-2 rounded-md">
                  <div className="text-xs text-yellow-800">Riesgo</div>
                  <div className="font-bold text-gray-800">{suggestedRoute.risk.toFixed(1)}/5</div>
                </div>
                <div className="bg-purple-100 p-2 rounded-md">
                  <div className="text-xs text-purple-800">Duración</div>
                  <div className="font-bold text-gray-800">{suggestedRoute.duration} min</div>
                </div>
              </div>

              <div className="text-xs mb-3 text-gray-700">
                <span className="font-semibold">Puntos:</span>
                <ul className="list-disc list-inside">
                  {suggestedRoute.points?.slice(0, 3).map((point, i) => (
                    <li key={i}>{point.nodeName}</li>
                  ))}
                  {suggestedRoute.points?.length > 3 && (
                    <li>...y {suggestedRoute.points.length - 3} más</li>
                  )}
                </ul>
              </div>

              <button
                onClick={handleSelectRoute}
                className={`w-full mt-2 ${selectionSuccess ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'} text-white py-2 px-4 rounded-md transition`}
              >
                {selectionSuccess ? '¡Ruta seleccionada!' : 'Seleccionar esta ruta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default RutaPersonalizada;