import React, { useState } from 'react';
import Modal from '../components/Modal';

const ModalRutasPersonalizadas = ({ isOpen, onClose, onSubmit }) => {
  const [filtros, setFiltros] = useState({
    duracion: '',
    dificultad: '',
    experiencia: ''
  });
  const [rutasSugeridas, setRutasSugeridas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
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
    setSelectedRoute(null);
    setNoResults(false);

    try {
      const response = await fetch('http://localhost:5000/routes/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filtros)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener rutas sugeridas');
      }

      const rutas = await response.json();
      
      if (rutas.length === 0) {
        setNoResults(true);
      } else {
        setRutasSugeridas(rutas);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoute = (ruta) => {
    setSelectedRoute(ruta);
    onSubmit(ruta);
    onClose();
  };

  const handleBackToForm = () => {
    setRutasSugeridas([]);
    setError(null);
    setNoResults(false);
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
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
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
              onClick={onClose}
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
          
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto space-y-3">
            {rutasSugeridas.map((ruta, index) => (
              <div 
                key={`${ruta.name}-${index}`}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedRoute?.name === ruta.name 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSelectRoute(ruta)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-800 text-lg">{ruta.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ruta.difficulty <= 2 ? 'bg-green-100 text-green-800' :
                    ruta.difficulty <= 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {ruta.difficulty <= 2 ? 'Fácil' : 
                     ruta.difficulty <= 3 ? 'Moderado' : 'Difícil'}
                  </span>
                </div>
                
                {renderRouteDetails(ruta)}
                
                <div className="mt-3 flex justify-between items-center text-xs">
                  <span className="text-gray-500">
                    Creada: {new Date(ruta.created_at).toLocaleDateString()}
                  </span>
                  <button 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRoute(ruta);
                    }}
                  >
                    Seleccionar ruta
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              onClick={handleBackToForm}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Volver
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ModalRutasPersonalizadas;