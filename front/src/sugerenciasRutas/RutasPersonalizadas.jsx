import React, { useState } from 'react';
import Modal from '../components/ui/Modal';
import { loadNodes } from '../services/nodeService';
import {
   getOpenRouteApiKey
} from '../pages/MapView/MapLogic';
const API_BASE = 'http://localhost:5000';
const OPENROUTE_API_KEY = getOpenRouteApiKey(); // Asegúrate de que esta función esté definida y retorne la clave correcta
// Array de colores para las rutas (puedes personalizarlos)
const ROUTE_COLORS = [
  '#FF5733', // Rojo anaranjado
  '#33FF57', // Verde
  '#3357FF', // Azul
  '#F033FF', // Magenta
  '#FF33F0', // Rosa
  '#33FFF5', // Turquesa
  '#F5FF33', // Amarillo
  '#8A2BE2', // Azul violeta
  '#FF6347', // Tomate
  '#20B2AA'  // Verde mar
];
export const createMultiPointColoredRoute = async (mapInstance, points, color, OPENROUTE_API_KEY) => {
  if (!mapInstance || points.length < 2) return null;
console.log(points);

  try {
    const coordinates = points.map(point => [point.lng, point.lat]);

    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/foot-walking/geojson`,
      {
        method: 'POST',
        headers: {
          'Authorization': OPENROUTE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: coordinates,
          elevation: false,
          instructions: false,
          preference: 'shortest',
        })
      }
    );

    if (!response.ok) throw new Error('Error al obtener la ruta');
console.log("response",response);

    const routeData = await response.json();

    return L.geoJSON(routeData, {
      style: {
        color: color,
        weight: 5,
        opacity: 0.8
      }
    }).addTo(mapInstance);

  } catch (error) {
    console.error('Error al crear ruta:', error);
    // Fallback: línea que conecta todos los puntos
    const latLngs = points.map(point => [point.lat, point.lng]);
    return L.polyline(latLngs, {
      color: color,
      weight: 5,
      opacity: 0.8
    }).addTo(mapInstance);
  }
};
const ModalRutasPersonalizadas = ({ isOpen, onClose, onSubmit, mapViewRef  }) => {
  const [filtros, setFiltros] = useState({
    duracion: '',
    dificultad: '',
    experiencia: '',
    velocidad: 0,
    nodos: []
  });
  const [currentRouteLayers, setCurrentRouteLayers] = useState([]); // <-- Añade este estado
  const [rutasMostradas, setRutasMostradas] = useState(false); // Nuevo estado
  const [rutasSugeridas, setRutasSugeridas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noResults, setNoResults] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRutasSugeridas([]);
    setNoResults(false);

    try {
      if (!filtros.duracion || !filtros.dificultad || !filtros.experiencia) {
        throw new Error("Todos los campos son requeridos");
      }

      const requestBody = {
        duracion_objetivo: Number(filtros.duracion),
        dificultad: Number(filtros.dificultad),
        experiencia: Number(filtros.experiencia),
        nodos: await loadNodes()
      };

      const response = await fetch(`${API_BASE}/generar_rutas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const data = await response.json();

      if (!data.rutas || data.rutas.length === 0) {
        setNoResults(true);
      } else {
        console.log("rutas",data.rutas)
        // Asegúrate de que cada ruta tenga sus puntos convertidos al formato correcto
        const rutasConColores = data.rutas.map((ruta, index) => {
          // Validación inicial de la ruta
          if (!ruta || typeof ruta !== 'object') {
            console.error('Ruta inválida:', ruta);
            return null;
          }
        
          // Procesar puntos con validación
          let processedPoints = [];
          if (Array.isArray(ruta.points)) {
            processedPoints = ruta.points
              .map(p => {
            
              if (typeof p === 'object' && p !== null && 'lat' in p && 'lng' in p) {
                  return { lat: p.lat, lng: p.lng };
                }
                // Formato no reconocido
                console.warn('Formato de punto no reconocido:', p);
                return null;
              })
              .filter(p => p !== null); // Filtrar puntos inválidos
          }
        
          // Validación final
          if (processedPoints.length < 2) {
            console.error('Ruta no tiene suficientes puntos válidos:', ruta);
            return null;
          }
        
          return {
            ...ruta,
            points: processedPoints,
            color: ROUTE_COLORS[index % ROUTE_COLORS.length]
          };
        }).filter(Boolean); // Filtrar rutas inválidas
console.log("rutasConColores",rutasConColores)
        setRutasSugeridas(rutasConColores);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error en generación de rutas:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleExitRouteMode = () => {
    // Limpiar las capas del mapa
    if (currentRouteLayers.length > 0 && mapViewRef.current) {
      currentRouteLayers.forEach(layer => {
        mapViewRef.current.getMapInstance()?.removeLayer(layer);
      });
      setCurrentRouteLayers([]);
    }

    setRutasMostradas(false);
    onSubmit([]); // Para limpiar cualquier otra visualización
  };
  const handleViewOnMap = async () => {
    try {
      if (!rutasSugeridas?.length || !mapViewRef?.current) return;
  
      // Limpiar rutas anteriores
      onSubmit([]); // Esto limpia las rutas anteriores en el mapa
      setCurrentRouteLayers([]); // Limpia las referencias anteriores
  
      const mapInstance = mapViewRef.current.getMapInstance();
      if (!mapInstance) return;
  
      const newRouteLayers = [];
      for (const ruta of rutasSugeridas) {c
        try {
          if (!ruta.points || ruta.points.length < 2) continue;
  
          const layer = await createMultiPointColoredRoute(
            mapInstance,
            ruta.points,
            ruta.color,
            OPENROUTE_API_KEY
          );
          
          if (layer) newRouteLayers.push(layer);
        } catch (error) {
          console.error(`Error al mostrar ruta ${ruta.name}:`, error);
        }
      }
  
      setCurrentRouteLayers(newRouteLayers);
      setRutasMostradas(true);
  
      // Ajustar vista del mapa
      if (newRouteLayers.length > 0) {
        const bounds = newRouteLayers.reduce((acc, layer) => {
          return acc.extend(layer.getBounds());
        }, L.latLngBounds([]));
        
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
      }
      onClose();
    } catch (error) {
      console.error("Error al mostrar rutas:", error);
      setError("Error al mostrar las rutas en el mapa");
    }
  };

  const handleBackToForm = () => {
    setRutasSugeridas([]);
    setError(null);
    setNoResults(false);
    // Notificar al componente padre para limpiar las rutas mostradas
    onSubmit([]);
  };

  const renderRouteDetails = (ruta) => {
    return (
      <div className="mt-2 text-sm text-gray-600">
        <p className="mb-1">{ruta.description}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">Dificultad: </span>
            <span>{ruta.difficulty}/5</span>
          </div>
          <div>
            <span className="font-medium">Duración: </span>
            <span>{ruta.duration} min</span>
          </div>
          <div>
            <span className="font-medium">Riesgo: </span>
            <span>{ruta.risk}/5</span>
          </div>
          <div>
            <span className="font-medium">Distancia: </span>
            <span>{(ruta.distance / 1000).toFixed(1)} km</span>
          </div>
          <div>
            <span className="font-medium">Popularidad: </span>
            <span>{ruta.popularity || 'N/A'}/5</span>
          </div>
          <div>
            <span className="font-medium">Puntos: </span>
            <span>{ruta.points?.length || 0}</span>
          </div>
          <div>
            <span className="font-medium">Color: </span>
            <span
              className="inline-block w-4 h-4 rounded-full ml-1 border border-gray-300"
              style={{ backgroundColor: ruta.color }}
            ></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {
      onClose();
      // Limpiar las rutas al cerrar el modal
      onSubmit([]);
    }}>
      <h2 className="text-xl font-bold mb-4 text-gray-800">Ruta Personalizada</h2>

      {rutasSugeridas.length === 0 && !noResults ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Duración máxima (minutos)
            </label>
            <input
              type="number"
              name="duracion"
              value={filtros.duracion}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Velocidad promedio (km/h)
            </label>
            <input
              type="number"
              name="velocidad"
              value={filtros.velocidad}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Nivel de dificultad
            </label>
            <select
              name="dificultad"
              value={filtros.dificultad}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione...</option>
              <option value="1">1 - Muy fácil</option>
              <option value="2">2 - Fácil</option>
              <option value="3">3 - Moderado</option>
              <option value="4">4 - Difícil</option>
              <option value="5">5 - Muy difícil</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Nivel de experiencia
            </label>
            <select
              name="experiencia"
              value={filtros.experiencia}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione...</option>
              <option value="1">1 - Principiante</option>
              <option value="2">2 - Básico</option>
              <option value="3">3 - Intermedio</option>
              <option value="4">4 - Avanzado</option>
              <option value="5">5 - Experto</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSubmit([]);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Buscando...' : 'Buscar Rutas'}
            </button>
          </div>
        </form>
      ) : noResults ? (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800">No se encontraron rutas</h3>
            <p className="text-yellow-700 mt-2">
              No hay rutas disponibles que coincidan con tus criterios de búsqueda.
            </p>
            <p className="text-yellow-700 mt-1">
              Intenta ajustar la duración máxima o el nivel de dificultad.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleBackToForm}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Ajustar criterios
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Rutas sugeridas:</h3>
          <p className="text-sm text-gray-500">
            {rutasMostradas
              ? "Las rutas están siendo mostradas en el mapa"
              : "Puedes ver las rutas en el mapa con colores diferentes"}
          </p>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-3">
            {rutasSugeridas.map((ruta, index) => (
              <div
                key={`${ruta.name}-${index}`}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-800 text-lg">{ruta.name}</h4>
                  <div className="flex items-center">
                    <span
                      className="inline-block w-4 h-4 rounded-full mr-2 border border-gray-300"
                      style={{ backgroundColor: ruta.color }}
                    ></span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ruta.difficulty <= 2 ? 'bg-green-100 text-green-800' :
                        ruta.difficulty <= 3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {ruta.difficulty <= 2 ? 'Fácil' :
                        ruta.difficulty <= 3 ? 'Moderado' : 'Difícil'}
                    </span>
                  </div>
                </div>

                {renderRouteDetails(ruta)}

                <div className="mt-3 text-xs text-gray-500">
                  Creada: {new Date(ruta.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {rutasMostradas ? (
            <div className="flex justify-between pt-4">
              <button
                onClick={handleBackToForm}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Volver
              </button>
              <button
                onClick={handleExitRouteMode}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Salir de este modo
              </button>
            </div>
          ) : (
            <div className="flex justify-between pt-4">
              <button
                onClick={handleBackToForm}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Volver
              </button>
              <button
                onClick={handleViewOnMap}
                disabled={rutasSugeridas.length === 0}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Ver en mapa
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ModalRutasPersonalizadas;