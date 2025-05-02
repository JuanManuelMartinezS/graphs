import React, { useState } from 'react';
import Modal from '../components/Modal';

function RutaPersonalizada({ isOpen, onClose, routes, onRouteSelected }) {
  const [distance, setDistance] = useState(1000);
  const [difficulty, setDifficulty] = useState(3);
  const [maxRisk, setMaxRisk] = useState(3);
  const [suggestedRoute, setSuggestedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionSuccess, setSelectionSuccess] = useState(false);

  const findBestRoute = () => {
    setLoading(true);
    setSuggestedRoute(null);
    setError(null);
    setSelectionSuccess(false);

    setTimeout(() => {
      try {
        if (!routes || routes.length === 0) {
          setError("No hay rutas disponibles");
          return;
        }

        const eligibleRoutes = routes.filter(route => {
          const distanceDiff = Math.abs(route.distance - distance);
          return (
            route.difficulty <= difficulty &&
            route.risk <= maxRisk &&
            distanceDiff <= Math.max(distance * 0.5, 1000)
          );
        });

        if (eligibleRoutes.length === 0) {
          setError("No se encontraron rutas que cumplan los criterios");
          return;
        }

        const bestRoute = [...eligibleRoutes].sort((a, b) => {
          const diffA = Math.abs(a.distance - distance);
          const diffB = Math.abs(b.distance - distance);
          
          if (diffA === diffB) {
            return a.risk - b.risk;
          }
          return diffA - diffB;
        })[0];

        setSuggestedRoute(bestRoute);
      } catch (err) {
        setError("Error al buscar rutas");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 100);
  };

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