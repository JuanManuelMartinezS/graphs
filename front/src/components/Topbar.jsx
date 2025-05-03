import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveNodes } from '../services/nodeService';
import {
  exportDataToFile,
  loadDataFromFile,
  saveRoutes
} from '../services/routeService';

function Topbar() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      await exportDataToFile();
      alert('Datos exportados con éxito');
    } catch (error) {
      alert(`Error al exportar: ${error.message}`);
    }
  };

  const handleLoadData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await loadDataFromFile(file);

      // Validar estructura básica de los datos
      if (!data.routes || !data.nodes) {
        throw new Error("El archivo no contiene datos válidos (debe tener 'routes' y 'nodes')");
      }

      if (window.confirm(`¿Desea cargar ${data.nodes.length} nodos y ${data.routes.length} rutas desde el archivo?`)) {
        // Guardamos primero los nodos y luego las rutas para mantener referencias
        const nodesResult = await saveNodes(data.nodes);
        const routesResult = await saveRoutes(data.routes);

        alert('Datos cargados con éxito. Recargando página...');

        // Recargar la página para mostrar los nuevos datos
        window.location.reload();
      }
    } catch (error) {
      alert(`Error al cargar datos: ${error.message}`);
    } finally {
      // Resetear el input para permitir cargar el mismo archivo otra vez
      e.target.value = '';
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-end shadow-md z-10">
    <div className="flex space-x-6">
      <button
        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition"
        onClick={handleExport}
      >
        Exportar rutas y nodos
      </button>
  
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadData}
        accept=".json"
        className="hidden"
      />
      <button
        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition"
        onClick={() => fileInputRef.current.click()}
      >
        Cargar Rutas predefinidas
      </button>
  
      <button
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition"
        onClick={() => navigate('/add-route')}
      >
        Crear ruta
      </button>
    </div>
  </div>
  );
}

export default Topbar;