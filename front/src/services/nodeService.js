const API_BASE = 'http://localhost:5000';


export const addNode = async (nodeData) => {
    try {
        const response = await fetch(`${API_BASE}/nodes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nodeData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al guardar");
        }

        return await response.json();
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
 //Guardar un nodo en el servidor
 export const saveNode = async (nodeData) => {
   try {
     const response = await fetch(`${API_BASE}/nodes`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(nodeData)
     });
     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || "Error al guardar el nodo");
     }
     return await response.json();
   } catch (error) {
     console.error("Error al guardar nodo:", error);
     throw error;
   }
 };


// Guardar múltiples nodos a la vez
export const saveNodes = async (nodes) => {
  try {
    console.log("Guardando nodos:", nodes.length);
    // Primero cargamos los nodos existentes
    const existingNodes = await loadNodes();
    const existingNodeNames = new Set(existingNodes.map(n => n.name));
    // Guardamos cada nodo individualmente usando la API existente
    const results = [];
    for (const node of nodes) {
      try {
        if (existingNodeNames.has(node.name)) {
          console.log(`Nodo ${node.name} ya existe, omitiendo...`);
          continue;
        }
        const result = await saveNode(node);
        results.push(result);
      } catch (error) {
        console.error(`Error al guardar nodo ${node.name}:`, error);
        // Continuamos con el siguiente nodo
      }
    }
    console.log(`Nodos guardados correctamente: ${results.length} de ${nodes.length}`);
    return { success: true, saved: results.length, total: nodes.length };
  } catch (error) {
    console.error("Error global al guardar nodos:", error);
    throw error;
  }
};

export const deleteNode = async (nodeName) => {
    try {
     
        console.log("API_BASE:", API_BASE);
        const response = await fetch(`${API_BASE}/nodes/${nodeName}`, {
            method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.in_use) {
                throw new Error(`No se puede eliminar el punto "${nodeName}" porque está siendo utilizado en una o más rutas.`);
            } else {
                throw new Error(data.error || "Error al eliminar");
            }
        }

        return data;
    } catch (error) {
        console.error("Error al eliminar nodo:", error);
        throw error;
    }
};


export const loadNodes = async () => {
    try {
        const response = await fetch(`${API_BASE}/nodes`);
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        return await response.json();
    } catch (error) {
        console.error("Error al cargar nodos:", error);
        throw error;
    }
};