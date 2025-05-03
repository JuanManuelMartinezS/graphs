import L from 'leaflet';
import { createNodeIcon, createNodePopupContent } from '../../components/ui/Nodes/NodeInfo';
import { addNode, deleteNode, loadNodes } from '../../services/nodeService';

/**
 * Carga y renderiza los nodos en el mapa
 * @param {Object} map - Instancia del mapa
 * @param {Array} markersRef - Referencia a los marcadores actuales
 * @param {String} apiBaseUrl - URL base de la API
 * @param {Function} setSelectedNode - Función para establecer el nodo seleccionado
 * @returns {Promise<Array>} - Nodos cargados
 */
export const loadMapNodes = async (map, markersRef, apiBaseUrl, setSelectedNode) => {
  try {
    if (!map) return [];

    clearMarkers(map, markersRef);

    const nodes = await loadNodes(apiBaseUrl);
    renderNodes(map, nodes, markersRef, setSelectedNode);
    return nodes;
  } catch (error) {
    console.error("Error al cargar nodos:", error);
   
    return [];
  }
};

/**
 * Elimina todos los marcadores del mapa
 * @param {Object} map - Instancia del mapa
 * @param {Array} markersRef - Referencia a los marcadores actuales
 */
export const clearMarkers = (map, markersRef) => {
  if (Array.isArray(markersRef)) {
    markersRef.forEach(marker => {
      if (marker && map) marker.remove();
    });
    markersRef.length = 0;
  }
};

/**
 * Renderiza nodos en el mapa
 * @param {Object} map - Instancia del mapa
 * @param {Array} nodes - Array de nodos
 * @param {Array} markersRef - Referencia para guardar los marcadores
 * @param {Function} setSelectedNode - Función para establecer el nodo seleccionado
 */
// Then in your renderNodes function:
export const renderNodes = (map, nodes, markersRef, setSelectedNode) => {
  nodes.forEach(node => {
      const marker = L.marker([node.lat, node.lng], { icon: createNodeIcon(node) })
          .addTo(map)
          .bindPopup(createNodePopupContent(node));

      marker.on('popupopen', () => {
          setSelectedNode(node);
          // Add event listener after popup is opened
          document.querySelector('.delete-node-btn')?.addEventListener('click', (e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('deleteNode', { detail: node.name }));
          });
      });

      marker.on('popupclose', () => setSelectedNode(null));
      markersRef.push(marker);
  });
};
/**
 * Maneja la adición de un nuevo punto
 * @param {Object} pointData - Datos del punto
 * @param {Object} clickedPosition - Posición donde se hizo clic
 * @param {String} apiBaseUrl - URL base de la API
 * @param {Function} onSuccess - Callback en caso de éxito
 */
export const handleAddPoint = async (pointData, clickedPosition, apiBaseUrl, onSuccess) => {
  try {
    if (!pointData.name || !pointData.description || !clickedPosition) {
      alert("Por favor complete todos los campos requeridos");
      return false;
    }

    if (pointData.type === 'control' && !pointData.risk) {
      alert("Los puntos de control deben tener un nivel de riesgo");
      return false;
    }

    const pointPayload = {
      lat: clickedPosition.lat,
      lng: clickedPosition.lng,
      name: pointData.name,
      description: pointData.description,
      type: pointData.type
    };

    if (pointData.type === 'control') {
      pointPayload.risk = parseInt(pointData.risk);
    }

    await addNode(pointPayload, apiBaseUrl);
    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    alert(error.message || "Error al guardar el punto");
    return false;
  }
};

/**
 * Maneja la eliminación de un nodo
 * @param {String} nodeName - Nombre del nodo a eliminar
 * @param {String} apiBaseUrl - URL base de la API
 * @param {Function} onSuccess - Callback en caso de éxito
 * @param {Object} selectedNode - Nodo actualmente seleccionado
 * @param {Function} setSelectedNode - Función para actualizar el nodo seleccionado
 */
export const handleDeleteNode = async (nodeName, apiBaseUrl, onSuccess, selectedNode, setSelectedNode) => {
  try {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el punto "${nodeName}"?`)) return;
    
    await deleteNode(nodeName, apiBaseUrl);
    
    if (onSuccess) onSuccess();
    
    if (selectedNode?.name === nodeName && setSelectedNode) {
      setSelectedNode(null);
    }
  } catch (error) {
    alert(error.message || "Error al eliminar el punto");
  }
};