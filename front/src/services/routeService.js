const API_BASE = 'http://localhost:5000'; // URL base de la API backend

/**
 * Servicio para manejar operaciones relacionadas con rutas y nodos
 * @namespace routeService
 */

/**
 * Carga todas las rutas desde el servidor
 * @async
 * @function loadRoutes
 * @returns {Promise<Array>} Lista de rutas
 * @throws {Error} Cuando falla la carga de rutas
 * @example
 * const routes = await loadRoutes();
 * console.log(`Se cargaron ${routes.length} rutas`);
 */
export const loadRoutes = async () => {
  try {
    const response = await fetch(`${API_BASE}/routes`);
    if (!response.ok) throw new Error("Error al cargar rutas");
    return await response.json();
  } catch (error) {
    console.error("Error al cargar rutas:", error);
    throw error;
  }
};

/**
 * Carga todos los nodos desde el servidor
 * @async
 * @function loadNodes
 * @returns {Promise<Array>} Lista de nodos
 * @throws {Error} Cuando falla la carga de nodos
 * @example
 * const nodes = await loadNodes();
 * console.log(`Se cargaron ${nodes.length} nodos`);
 */
export const loadNodes = async () => {
  try {
    const response = await fetch(`${API_BASE}/nodes`);
    if (!response.ok) throw new Error("Error al cargar nodos");
    return await response.json();
  } catch (error) {
    console.error("Error al cargar nodos:", error);
    throw error;
  }
};

/**
 * Carga simultáneamente rutas y nodos desde el servidor
 * @async
 * @function loadRoutesAndNodes
 * @returns {Promise<Object>} Objeto con rutas y nodos
 * @property {Array} routes - Lista de rutas
 * @property {Array} nodes - Lista de nodos
 * @throws {Error} Cuando falla la carga de datos
 * @example
 * const { routes, nodes } = await loadRoutesAndNodes();
 */
export const loadRoutesAndNodes = async () => {
  try {
    const [routes, nodes] = await Promise.all([
      loadRoutes(),
      loadNodes()
    ]);
    return { routes, nodes };
  } catch (error) {
    console.error("Error al cargar datos:", error);
    throw error;
  }
};

/**
 * Carga datos desde un archivo JSON con soporte para múltiples formatos
 * @async
 * @function loadDataFromFile
 * @param {File} file - Archivo JSON a cargar
 * @returns {Promise<Object>} Datos estructurados
 * @property {Array} routes - Rutas cargadas
 * @property {Array} nodes - Nodos cargados
 * @throws {Error} Cuando:
 * - El archivo no tiene formato válido
 * - Fallan las operaciones de lectura
 * @example
 * const data = await loadDataFromFile(fileInput.files[0]);
 */
export const loadDataFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Formato preferido: objeto con routes y nodes
        if (data && typeof data === 'object' && data.routes && data.nodes) {
          resolve(data);
        }
        // Compatibilidad con formatos antiguos
        else {
          console.log("Interpretando formato alternativo...");
          let formattedData = { routes: [], nodes: [] };

          // Si es array, determinar si son rutas o nodos
          if (Array.isArray(data)) {
            if (data.length > 0) {
              if (data[0].hasOwnProperty('points')) {
                formattedData.routes = data;
              } else if (data[0].hasOwnProperty('lat') && data[0].hasOwnProperty('lng')) {
                formattedData.nodes = data;
              }
            }
          }

          if (formattedData.routes.length === 0 || formattedData.nodes.length === 0) {
            throw new Error("Formato de archivo no reconocido");
          }

          resolve(formattedData);
        }
      } catch (error) {
        console.error("Error al procesar archivo:", error);
        reject(new Error(`Error al procesar archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsText(file);
  });
};

/**
 * Guarda una ruta en el servidor
 * @async
 * @function saveRoute
 * @param {Object} routeData - Datos de la ruta a guardar
 * @param {string} routeData.name - Nombre único de la ruta
 * @param {Array} routeData.points - Puntos que conforman la ruta
 * @returns {Promise<Object>} Ruta guardada
 * @throws {Error} Cuando falla el guardado
 * @example
 * await saveRoute({
 *   name: "Ruta1",
 *   points: [{lat: 40.7128, lng: -74.0060}]
 * });
 */
export const saveRoute = async (routeData) => {
  try {
    const response = await fetch(`${API_BASE}/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al guardar la ruta");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al guardar ruta:", error);
    throw error;
  }
};

/**
 * Guarda múltiples rutas en el servidor, omitiendo duplicados
 * @async
 * @function saveRoutes
 * @param {Array} routes - Lista de rutas a guardar
 * @returns {Promise<Object>} Resultado de la operación
 * @property {boolean} success - Indica éxito general
 * @property {number} saved - Rutas guardadas exitosamente
 * @property {number} total - Total de rutas recibidas
 * @throws {Error} Cuando falla la carga inicial de rutas existentes
 * @example
 * const result = await saveRoutes(routesList);
 * console.log(`Guardadas ${result.saved}/${result.total} rutas`);
 */
export const saveRoutes = async (routes) => {
  try {
    console.log("Guardando rutas:", routes.length);
    
    const existingRoutes = await loadRoutes();
    const existingRouteNames = new Set(existingRoutes.map(r => r.name));

    const results = [];
    for (const route of routes) {
      try {
        if (existingRouteNames.has(route.name)) {
          console.log(`Ruta ${route.name} ya existe, omitiendo...`);
          continue;
        }
        const result = await saveRoute(route);
        results.push(result);
      } catch (error) {
        console.error(`Error al guardar ruta ${route.name}:`, error);
      }
    }

    console.log(`Rutas guardadas: ${results.length}/${routes.length}`);
    return { success: true, saved: results.length, total: routes.length };
  } catch (error) {
    console.error("Error al guardar rutas:", error);
    throw error;
  }
};

/**
 * Elimina una ruta del servidor
 * @async
 * @function deleteRoute
 * @param {string} routeName - Nombre de la ruta a eliminar
 * @returns {Promise<Object>} Respuesta del servidor
 * @throws {Error} Cuando falla la eliminación
 * @example
 * await deleteRoute("Ruta1");
 */
export const deleteRoute = async (routeName) => {
  try {
    const response = await fetch(`${API_BASE}/routes/${routeName}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al eliminar la ruta");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al eliminar ruta:", error);
    throw error;
  }
};

/**
 * Exporta rutas y nodos a un archivo JSON descargable
 * @async
 * @function exportDataToFile
 * @returns {Promise<boolean>} True si la exportación fue exitosa
 * @throws {Error} Cuando falla la carga de datos o la generación del archivo
 * @example
 * await exportDataToFile(); // Descarga automática del archivo
 */
export const exportDataToFile = async () => {
  try {
    const data = await loadRoutesAndNodes();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportName = `datos_bici_${new Date().toISOString().slice(0, 10)}.json`;

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error("Error al exportar datos:", error);
    throw error;
  }
};

/**
 * Calcula y dibuja una ruta usando OpenRouteService API
 * @async
 * @function drawRoute
 * @param {Array} points - Puntos de la ruta
 * @param {Object} routeData - Datos adicionales de la ruta
 * @param {string} OPENROUTE_API_KEY - Clave API de OpenRouteService
 * @returns {Promise<Object>} Datos de la ruta calculada en formato GeoJSON
 * @throws {Error} Cuando falla la comunicación con la API
 * @example
 * const route = await drawRoute(points, {}, 'api-key');
 */
export const drawRoute = async (points, routeData, OPENROUTE_API_KEY) => {
  try {
    const coordinates = points.map(point => [point.lng, point.lat]);

    const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
      method: 'POST',
      headers: {
        'Authorization': OPENROUTE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: coordinates,
        elevation: false,
        instructions: false,
        preference: 'recommended',
        units: 'm'
      })
    });

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error al calcular la ruta:", error);
    throw error;
  }
};