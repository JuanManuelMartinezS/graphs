const API_BASE = 'http://localhost:5000';

/**
 * Servicio para manejar operaciones relacionadas con rutas y nodos
 */

// Cargar rutas desde el servidor
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

// Cargar nodos desde el servidor
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

// Cargar tanto rutas como nodos
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

// Cargar datos desde un archivo JSON unificado
export const loadDataFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Si es un objeto con routes y nodes directamente
        if (data && typeof data === 'object' && data.routes && data.nodes) {
          resolve(data);
        }
        // Comprobar si el formato es de una exportación antigua (sin estructura anidada)
        else {
          // Intenta dar formato a los datos si no tienen la estructura esperada
          console.log("Intentando interpretar formato de datos alternativo...");

          let formattedData = {
            routes: [],
            nodes: []
          };

          // Comprueba diferentes posibilidades de estructura
          if (Array.isArray(data)) {
            // Si es un array, podría ser solo nodos o solo rutas
            // Intentamos identificar por las propiedades características
            if (data.length > 0) {
              if (data[0].hasOwnProperty('points')) {
                // Parece ser un array de rutas
                formattedData.routes = data;
              } else if (data[0].hasOwnProperty('lat') && data[0].hasOwnProperty('lng')) {
                // Parece ser un array de nodos
                formattedData.nodes = data;
              }
            }
          }

          // Si alguno de los arrays sigue vacío, podríamos tener un formato diferente
          if (formattedData.routes.length === 0 || formattedData.nodes.length === 0) {
            throw new Error("El archivo no tiene el formato esperado.");
          }

          resolve(formattedData);
        }
      } catch (error) {
        console.error("Error al procesar archivo:", error);
        reject(new Error(`Error al procesar el archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsText(file);
  });
};

// Guardar una ruta en el servidor
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

// Guardar múltiples rutas a la vez
export const saveRoutes = async (routes) => {
  try {
    console.log("Guardando rutas:", routes.length);

    // Primero cargamos las rutas existentes
    const existingRoutes = await loadRoutes();
    const existingRouteNames = new Set(existingRoutes.map(r => r.name));

    // Guardamos cada ruta individualmente usando la API existente
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
        // Continuamos con la siguiente ruta
      }
    }

    console.log(`Rutas guardadas correctamente: ${results.length} de ${routes.length}`);
    return { success: true, saved: results.length, total: routes.length };
  } catch (error) {
    console.error("Error global al guardar rutas:", error);
    throw error;
  }
};


// Eliminar una ruta
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


// Exportar rutas y nodos a un único archivo JSON
export const exportDataToFile = async () => {
  try {
    // Cargar rutas y nodos
    const data = await loadRoutesAndNodes();

    // Generar JSON con ambos datos
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

// Exportar solo las rutas a un archivo JSON
export const exportRoutesToFile = async () => {
  try {
    const routes = await loadRoutes();
    const routesStr = JSON.stringify(routes, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(routesStr)}`;

    const exportName = `rutas_bici_${new Date().toISOString().slice(0, 10)}.json`;

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error("Error al exportar rutas:", error);
    throw error;
  }
};

// Cargar rutas desde un archivo JSON (compatible con versiones anteriores)
export const loadRoutesFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Si es un array, asumimos que son solo rutas
        if (Array.isArray(data)) {
          resolve(data);
        }
        // Si es un objeto con propiedad routes, extraemos las rutas
        else if (data && data.routes && Array.isArray(data.routes)) {
          resolve(data.routes);
        } else {
          throw new Error("El archivo no contiene rutas válidas");
        }
      } catch (error) {
        console.error("Error al procesar archivo:", error);
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsText(file);
  });
};

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
