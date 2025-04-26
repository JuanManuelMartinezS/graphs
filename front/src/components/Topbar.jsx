import React from 'react';

function Topbar() {
  return (
    <div className="bg-gray-800 text-white p-4 flex space-x-4 shadow-md z-10">
      <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition">
        Exportar rutas
      </button>
      <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition">
        Cargar rutas predefinidas
      </button>
      <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition">
        Crear ruta
      </button>
      <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition">
        Cambiar experiencia
      </button>
    </div>
  );
}

export default Topbar;