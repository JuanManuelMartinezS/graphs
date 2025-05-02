import React, { useEffect, useState } from 'react';
import RutaPersonalizada from '../sugerenciasRutas/RutaPersonalizada';

function Sidebar({ onAddPoint, onCreateRoute, routes, onRouteSelected }) {
  const [showRutaPersonalizada, setShowRutaPersonalizada] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const handleRouteSelected = (routeName) => {
    // Buscar la ruta completa por nombre
    const route = routes.find(r => r.name === routeName);
    if (route) {
      setSelectedRoute(route);
      // Pasar la ruta seleccionada al componente padre
      onRouteSelected(routeName);
    }
  };

  return (
    <div className="w-64 bg-gray-700 text-white p-4 space-y-2 overflow-y-auto h-full">
      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
        Ruta según experiencia
      </button>
      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
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