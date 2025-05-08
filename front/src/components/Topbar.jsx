import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveNodes } from '../services/nodeService';
import {
  exportDataToFile,
  loadDataFromFile,
  saveRoutes
} from '../services/routeService';

/**
 * Componente Topbar - Barra superior de navegación con funcionalidades de exportación,
 * carga de datos y creación de rutas.
 * 
 * @component
 * @example
 * return <Topbar />
 */
function Topbar() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null); // Referencia al input file oculto

  /**
   * Maneja la exportación de datos (nodos y rutas) a un archivo JSON
   * @async
   * @function handleExport
   * @throws {Error} Cuando falla la exportación de datos
   */
  const handleExport = async () => {
    try {
      await exportDataToFile();
      alert('Datos exportados con éxito');
    } catch (error) {
      alert(`Error al exportar: ${error.message}`);
    }
  };

  /**
   * Maneja la carga de datos desde un archivo JSON
   * @async
   * @function handleLoadData
   * @param {Event} e - Evento del input file
   * @throws {Error} Cuando:
   * - No se selecciona archivo
   * - El archivo no tiene estructura válida
   * - Fallan las operaciones de guardado
   */
  const handleLoadData = async (e) => {
    const file = e.target.files[0];
    if (!file) return; // Salir si no hay archivo

    try {
      // Cargar y parsear datos del archivo
      const data = await loadDataFromFile(file);

      // Validar estructura básica de los datos
      if (!data.routes || !data.nodes) {
        throw new Error("El archivo no contiene datos válidos (debe tener 'routes' y 'nodes')");
      }

      // Pedir confirmación al usuario mostrando estadísticas
      if (window.confirm(`¿Desea cargar ${data.nodes.length} nodos y ${data.routes.length} rutas desde el archivo?`)) {
        // Guardar primero nodos y luego rutas para mantener referencias
        const nodesResult = await saveNodes(data.nodes);
        const routesResult = await saveRoutes(data.routes);

        alert('Datos cargados con éxito. Recargando página...');
        window.location.reload(); // Recargar para mostrar nuevos datos
      }
    } catch (error) {
      alert(`Error al cargar datos: ${error.message}`);
    } finally {
      // Resetear input para permitir cargar el mismo archivo nuevamente
      e.target.value = '';
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex justify-end shadow-md z-10">
      <div className="flex space-x-6">
        {/* Botón para exportar datos */}
        <button
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition"
          onClick={handleExport}
        >
          Exportar rutas y nodos
        </button>
    
        {/* Input file oculto para cargar datos */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleLoadData}
          accept=".json"
          className="hidden"
        />
        {/* Botón que activa el input file */}
        <button
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition"
          onClick={() => fileInputRef.current.click()}
        >
          Cargar Rutas predefinidas
        </button>
    
        {/* Botón para navegar a la creación de rutas */}
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