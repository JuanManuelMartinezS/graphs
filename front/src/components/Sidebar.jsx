import React, { useEffect, useState } from 'react';
import RutaPersonalizada from '../sugerenciasRutas/RutaPersonalizada';

function Sidebar({ onAddPoint, onCreateRoute, routes, onRouteSelected }) {
  const [showRutaPersonalizada, setShowRutaPersonalizada] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showExperienciaSelect, setShowExperienciaSelect] = useState(false);
  const [selectedExperiencia, setSelectedExperiencia] = useState(null);

  const handleRouteSelected = (routeName) => {
    const route = routes.find(r => r.name === routeName);
    if (route) {
      setSelectedRoute(route);
      onRouteSelected(routeName);
    }
  };

  const handleExperienciaSelect = (nivel) => {
    setSelectedExperiencia(nivel);
    setShowExperienciaSelect(false);

    // Buscar la ruta con dificultad más cercana al nivel seleccionado
    const rutasConDiferencia = routes.map(route => ({
      ...route,
      diferencia: Math.abs(route.difficulty - nivel)
    }));

    // Ordenar por diferencia y seleccionar la primera
    const rutaRecomendada = [...rutasConDiferencia].sort((a, b) => a.diferencia - b.diferencia)[0];

    if (rutaRecomendada) {
      handleRouteSelected(rutaRecomendada.name);
    } else {
      alert("No se encontraron rutas con el nivel de dificultad seleccionado");
    }
  };

  const handleRutaMenosPeligrosa = () => {
    if (routes.length === 0) {
      alert("No hay rutas disponibles");
      return;
    }

    // Buscar la ruta con menor riesgo
    const rutasOrdenadasPorRiesgo = [...routes].sort((a, b) => a.risk - b.risk);
    const rutaMenosPeligrosa = rutasOrdenadasPorRiesgo[0];

    if (rutaMenosPeligrosa) {
      handleRouteSelected(rutaMenosPeligrosa.name);
      alert(`Ruta menos peligrosa seleccionada: ${rutaMenosPeligrosa.name} (Riesgo: ${rutaMenosPeligrosa.risk})`);
    } else {
      alert("No se pudo determinar la ruta menos peligrosa");
    }
  };

  return (
    <div className="w-64 bg-gray-700 text-white p-4 space-y-2 overflow-y-auto h-full">
      <div className="relative">
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
          onClick={() => setShowExperienciaSelect(!showExperienciaSelect)}
        >
          Ruta según experiencia
        </button>

        {showExperienciaSelect && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded shadow-lg">
            <select
              className="w-full p-2 text-gray-800 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleExperienciaSelect(parseInt(e.target.value))}
              value={selectedExperiencia || ''}
            >
              <option value="" disabled>Selecciona tu nivel</option>
              <option value="1">1 - Principiante</option>
              <option value="2">2 - Básico</option>
              <option value="3">3 - Intermedio</option>
              <option value="4">4 - Avanzado</option>
              <option value="5">5 - Experto</option>
            </select>
          </div>
        )}
      </div>

      <button
        className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
        onClick={handleRutaMenosPeligrosa}
      >
        Ruta menos peligrosa
      </button>

      <button
        className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
        onClick={() => setShowRutaPersonalizada(true)}
      >
        Ruta personalizada
      </button>

      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
        Ruta personalizada 2
      </button>

      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
        Recomendar distancias mínimas
      </button>

      <button
        className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
        onClick={onAddPoint}
      >
        Añadir punto
      </button>

      <RutaPersonalizada
        isOpen={showRutaPersonalizada}
        onClose={() => setShowRutaPersonalizada(false)}
        routes={routes}
        onRouteSelected={handleRouteSelected}
      />
    </div>
  );
}

export default Sidebar;