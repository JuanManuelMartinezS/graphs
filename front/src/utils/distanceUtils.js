import L from 'leaflet';
import 'leaflet-routing-machine';

/**
 * Formatea una distancia en metros a un string legible (metros o kilómetros)
 * @function formatDistance
 * @param {number} meters - Distancia en metros
 * @returns {string} Distancia formateada (ej. "150 m" o "1.50 km")
 * @example
 * const distText = formatDistance(1500); // "1.50 km"
 */
export const formatDistance = (meters) => {
    if (meters < 1000) {
        return `${meters} m`;
    } else {
        return `${(meters / 1000).toFixed(2)} km`;
    }
};

/**
 * Crea una ruta coloreada entre dos nodos usando OpenRouteService API
 * @async
 * @function createColoredRoute
 * @param {Object} mapInstance - Instancia del mapa Leaflet
 * @param {Object} startNode - Nodo de inicio
 * @param {number} startNode.lat - Latitud del nodo inicial
 * @param {number} startNode.lng - Longitud del nodo inicial
 * @param {Object} endNode - Nodo final
 * @param {number} endNode.lat - Latitud del nodo final
 * @param {number} endNode.lng - Longitud del nodo final
 * @param {string} color - Color hexadecimal para la ruta
 * @param {number} distance - Distancia entre nodos en metros
 * @param {string} OPENROUTE_API_KEY - Clave API para OpenRouteService
 * @returns {Promise<Object>} Objeto con elementos creados
 * @property {L.Layer} route - Capa Leaflet con la ruta
 * @property {L.Marker} label - Marcador con la etiqueta de distancia
 * @throws {Error} Cuando falla la comunicación con OpenRouteService
 * @example
 * const route = await createColoredRoute(map, start, end, '#FF0000', 1500, 'api-key');
 */
export const createColoredRoute = async (mapInstance, startNode, endNode, color, distance, OPENROUTE_API_KEY) => {
    if (!mapInstance) return null;

    try {
        // 1. Obtener ruta desde OpenRouteService
        const response = await fetch(
            `https://api.openrouteservice.org/v2/directions/foot-walking/geojson`,
            {
                method: 'POST',
                headers: {
                    'Authorization': OPENROUTE_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coordinates: [
                        [startNode.lng, startNode.lat],
                        [endNode.lng, endNode.lat]
                    ],
                    elevation: false,
                    instructions: false,
                    preference: 'shortest',
                })
            }
        );

        if (!response.ok) {
            throw new Error('Error al obtener la ruta');
        }

        const routeData = await response.json();

        // 2. Crear capa GeoJSON con estilo personalizado
        const routeLayer = L.geoJSON(routeData, {
            style: { 
                color: color,
                weight: 5,
                opacity: 0.8
            }
        }).addTo(mapInstance);

        // 3. Añadir etiqueta de distancia en el punto medio
        const coordinates = routeData.features[0].geometry.coordinates;
        const midPointIndex = Math.floor(coordinates.length / 2);
        const midPoint = coordinates[midPointIndex];
        
        const distanceLabel = L.marker([midPoint[1], midPoint[0]], {
            icon: L.divIcon({
                className: 'distance-label',
                html: `<div style="background-color: ${color}; padding: 3px; border-radius: 3px; color: white;">${formatDistance(distance)}</div>`,
                iconSize: [100, 20],
                iconAnchor: [50, 10]
            })
        }).addTo(mapInstance);

        return { 
            route: routeLayer, 
            label: distanceLabel 
        };

    } catch (error) {
        console.error('Error al crear ruta:', error);
        // Fallback: línea recta cuando falla la API
        const fallbackRoute = L.polyline(
            [
                [startNode.lat, startNode.lng],
                [endNode.lat, endNode.lng]
            ],
            { color: color, weight: 5, opacity: 0.8 }
        ).addTo(mapInstance);

        const midPoint = L.latLng(
            (startNode.lat + endNode.lat) / 2,
            (startNode.lng + endNode.lng) / 2
        );

        const distanceLabel = L.marker(midPoint, {
            icon: L.divIcon({
                className: 'distance-label',
                html: `<div style="background-color: ${color}; padding: 3px; border-radius: 3px; color: white;">${formatDistance(distance)}</div>`,
                iconSize: [100, 20],
                iconAnchor: [50, 10]
            })
        }).addTo(mapInstance);

        return {
            route: fallbackRoute,
            label: distanceLabel
        };
    }
};

/**
 * Crea un marcador especial para resaltar el nodo de inicio
 * @function highlightStartNode
 * @param {Object} mapInstance - Instancia del mapa Leaflet
 * @param {Object} node - Nodo a resaltar
 * @param {string} node.name - Nombre del nodo
 * @param {number} node.lat - Latitud del nodo
 * @param {number} node.lng - Longitud del nodo
 * @returns {L.Marker} Marcador Leaflet para el nodo inicial
 * @example
 * const marker = highlightStartNode(map, startNode);
 */
export const highlightStartNode = (mapInstance, node) => {
    if (!mapInstance) return null;

    // Crear marcador con icono personalizado
    const startMarker = L.marker([node.lat, node.lng], {
        icon: L.divIcon({
            className: 'start-node-marker',
            html: `<div style="background-color: #0000FF; color: white; padding: 5px; border-radius: 50%; width: 30px; height: 30px; text-align: center; line-height: 20px;">
                     <i class="fas fa-flag"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        zIndexOffset: 1000 // Asegurar que aparece sobre otros marcadores
    }).addTo(mapInstance);
    
    // Añadir popup con información del nodo
    startMarker.bindPopup(`
        <div style="font-weight: bold; font-size: 14px;">
            ${node.name}
        </div>
        <div>Punto de inicio</div>
        <div>${node.lat.toFixed(6)}, ${node.lng.toFixed(6)}</div>
    `);

    return startMarker;
};

/**
 * Muestra una leyenda de distancias en el mapa
 * @function showDistanceLegend
 * @param {Object} distances - Objeto con información de distancias
 * @param {string} distances[].color - Color asociado a cada ruta
 * @param {number} distances[].distance - Distancia en metros
 * @returns {HTMLElement} Elemento HTML de la leyenda
 * @example
 * const legend = showDistanceLegend({
 *   'Node1': { color: '#FF0000', distance: 1500 },
 *   'Node2': { color: '#00FF00', distance: 2000 }
 * });
 */
export const showDistanceLegend = (distances) => {
    // Crear contenedor principal de la leyenda
    const legend = document.createElement('div');
    legend.id = 'distance-legend';
    legend.className = 'distance-legend';
    legend.style.cssText = `
        position: absolute;
        bottom: 30px;
        right: 30px;
        background: white;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
        z-index: 1000;
    `;
    
    // Añadir título
    const title = document.createElement('h4');
    title.textContent = 'Distancias Mínimas';
    title.style.marginTop = '0';
    legend.appendChild(title);
    
    // Agrupar nodos por color
    const colorToNodes = {};
    Object.entries(distances).forEach(([nodeName, info]) => {
        if (!colorToNodes[info.color]) {
            colorToNodes[info.color] = [];
        }
        colorToNodes[info.color].push({ name: nodeName, distance: info.distance });
    });
    
    // Ordenar colores por distancia promedio (de menor a mayor)
    const sortedColors = Object.entries(colorToNodes).sort((a, b) => {
        const avgDistA = a[1].reduce((sum, node) => sum + node.distance, 0) / a[1].length;
        const avgDistB = b[1].reduce((sum, node) => sum + node.distance, 0) / b[1].length;
        return avgDistA - avgDistB;
    });
    
    // Crear elementos para cada rango de distancia
    sortedColors.forEach(([color, nodes]) => {
        const minDist = Math.min(...nodes.map(n => n.distance));
        const maxDist = Math.max(...nodes.map(n => n.distance));
        
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; margin: 5px 0;';
        
        // Cuadro de color
        const colorBox = document.createElement('div');
        colorBox.style.cssText = `
            width: 20px;
            height: 20px;
            background-color: ${color};
            margin-right: 10px;
        `;
        
        // Etiqueta de distancia
        const label = document.createElement('span');
        if (minDist === maxDist) {
            label.textContent = `${formatDistance(minDist)}`;
        } else {
            label.textContent = `${formatDistance(minDist)} - ${formatDistance(maxDist)}`;
        }
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legend.appendChild(item);
    });
    
    // Añadir leyenda al DOM
    document.body.appendChild(legend);
    return legend;
};