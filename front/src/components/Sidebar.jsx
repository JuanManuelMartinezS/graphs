import React from 'react';

function Sidebar({ onAddPoint }) {
  return (
    <div className="w-64 bg-gray-700 text-white p-4 space-y-2 overflow-y-auto h-full">
      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
        Ruta según experiencia
      </button>
      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
        Ruta menos peligrosa
      </button>
      <button className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition">
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
      <button className="w-full bg-red-500 hover:bg-red-600 p-2 rounded transition">
        Eliminar punto
      </button>
    </div>
  );
}

export default Sidebar;