import L from 'leaflet';
import 'leaflet-routing-machine';

export const formatDistance = (meters) => {
    if (meters < 1000) {
        return `${meters} m`;
    } else {
        return `${(meters / 1000).toFixed(2)} km`;
    }
};

export const createColoredRoute = async (mapInstance, startNode, endNode, color, distance, OPENROUTE_API_KEY) => {
    if (!mapInstance) return null;

    try {
        // Solicitar ruta completa a OpenRouteService
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

        // Crear capa GeoJSON con la ruta
        const routeLayer = L.geoJSON(routeData, {
            style: { 
                color: color,
                weight: 5,
                opacity: 0.8
            }
        }).addTo(mapInstance);

        // Añadir etiqueta de distancia
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
        // Fallback: crear línea recta si falla la API
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

export const highlightStartNode = (mapInstance, node) => {
    if (!mapInstance) return null;

    const startMarker = L.marker([node.lat, node.lng], {
        icon: L.divIcon({
            className: 'start-node-marker',
            html: `<div style="background-color: #0000FF; color: white; padding: 5px; border-radius: 50%; width: 30px; height: 30px; text-align: center; line-height: 20px;">
                     <i class="fas fa-flag"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        }),
        zIndexOffset: 1000
    }).addTo(mapInstance);
    
    startMarker.bindPopup(`
        <div style="font-weight: bold; font-size: 14px;">
            ${node.name}
        </div>
        <div>Punto de inicio</div>
        <div>${node.lat.toFixed(6)}, ${node.lng.toFixed(6)}</div>
    `);

    return startMarker;
};

export const showDistanceLegend = (distances) => {
    // Crear elemento para la leyenda
    const legend = document.createElement('div');
    legend.id = 'distance-legend';
    legend.className = 'distance-legend';
    legend.style.cssText = 'position: absolute; bottom: 30px; right: 30px; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.2); z-index: 1000;';
    
    // Título de la leyenda
    const title = document.createElement('h4');
    title.textContent = 'Distancias Mínimas';
    title.style.marginTop = '0';
    legend.appendChild(title);
    
    // Recopilar colores únicos y sus rangos
    const colorToNodes = {};
    Object.entries(distances).forEach(([nodeName, info]) => {
        if (!colorToNodes[info.color]) {
            colorToNodes[info.color] = [];
        }
        colorToNodes[info.color].push({ name: nodeName, distance: info.distance });
    });
    
    // Ordenar colores por distancia promedio
    const sortedColors = Object.entries(colorToNodes).sort((a, b) => {
        const avgDistA = a[1].reduce((sum, node) => sum + node.distance, 0) / a[1].length;
        const avgDistB = b[1].reduce((sum, node) => sum + node.distance, 0) / b[1].length;
        return avgDistA - avgDistB;
    });
    
    // Crear elementos de la leyenda
    sortedColors.forEach(([color, nodes]) => {
        const minDist = Math.min(...nodes.map(n => n.distance));
        const maxDist = Math.max(...nodes.map(n => n.distance));
        
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; margin: 5px 0;';
        
        const colorBox = document.createElement('div');
        colorBox.style.cssText = `width: 20px; height: 20px; background-color: ${color}; margin-right: 10px;`;
        
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
    
    // Añadir la leyenda al mapa
    document.body.appendChild(legend);
    return legend;
};