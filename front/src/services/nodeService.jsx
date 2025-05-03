export const addNode = async (nodeData, API_BASE) => {
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

export const deleteNode = async (nodeName, API_BASE) => {
    try {
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

export const loadNodes = async (API_BASE) => {
    try {
        const response = await fetch(`${API_BASE}/nodes`);
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        return await response.json();
    } catch (error) {
        console.error("Error al cargar nodos:", error);
        throw error;
    }
};