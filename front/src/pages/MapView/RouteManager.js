import L from 'leaflet';
import { createRoutePopupContent } from '../../components/ui/Routes/RouteInfo';
import { deleteRoute, drawRoute, loadRoutes } from '../../services/routeService';

/**
 * Carga y renderiza las rutas en el mapa
 * @param {Object} map - Instancia del mapa
 * @param {Array} routeLayersRef - Referencia a las capas de ruta actuales
 * @param {String} apiBaseUrl - URL base de la API
 * @param {String} apiKey - Clave API de OpenRoute
 * @param {Function} setRoutes - Función para establecer las rutas en el estado
 * @param {Function} onRoutesLoaded - Callback cuando las rutas están cargadas
 * @returns {Promise<Array>} - Rutas cargadas
 */
export const loadMapRoutes = async (map, routeLayersRef, apiBaseUrl, apiKey, setRoutes, onRoutesLoaded) => {
  try {
    if (!map) return [];

    clearRouteLayers(map, routeLayersRef);

    const routesData = await loadRoutes(apiBaseUrl);
    
    if (setRoutes) {
      setRoutes(routesData);
    }
    
    if (onRoutesLoaded) {
      onRoutesLoaded(routesData);
    }

    for (const route of routesData) {
      if (route.points?.length >= 2) {
        await renderRoute(map, route.points, route, apiKey, routeLayersRef);
      }
    }
    
    return routesData;
  } catch (error) {
    console.error("Error al cargar rutas:", error);
    return [];
  }
};

/**
 * Limpia las capas de ruta del mapa
 * @param {Object} map - Instancia del mapa
 * @param {Array} routeLayersRef - Referencia a las capas de ruta
 */
export const clearRouteLayers = (map, routeLayersRef) => {
  if (Array.isArray(routeLayersRef)) {
    routeLayersRef.forEach(layer => {
      if (layer && map) {
        layer.off('click');
        map.removeLayer(layer);
      }
    });
    routeLayersRef.length = 0;
  }
};

/**
 * Renderiza una ruta en el mapa
 * @param {Object} map - Instancia del mapa
 * @param {Array} points - Puntos de la ruta
 * @param {Object} routeData - Datos de la ruta
 * @param {String} apiKey - Clave API de OpenRoute
 * @param {Array} routeLayersRef - Referencia para guardar la capa de ruta
 * @returns {Promise<Object>} - Capa de ruta creada
 */
export const renderRoute = async (map, points, routeData, apiKey, routeLayersRef) => {
  if (!map || points.length < 2) return null;

  try {
    const data = await drawRoute(points, routeData, apiKey);
    const routeGeometry = data.features[0].geometry;
    
    const routeLayer = L.geoJSON(routeGeometry, {
      style: { color: '#0066ff', weight: 5, opacity: 0.8 }
    }).addTo(map);

    routeLayer.highlighted = false;
    routeLayer.routeData = routeData;

    if (routeData) {
      const popupContent = createRoutePopupContent(routeData);
      routeLayer.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'route-popup'
      });
    }

    routeLayer.on('click', (e) => {
      if (map.mode === 'view') {
        L.DomEvent.stopPropagation(e);
        const popup = e.layer.getPopup();
        if (!popup) e.layer.openPopup(e.latlng);
      }
    });

    if (Array.isArray(routeLayersRef)) {
      routeLayersRef.push(routeLayer);
    }
    
    map.fitBounds(routeLayer.getBounds());

    return routeLayer;
  } catch (error) {
    console.error("Error al renderizar ruta:", error);
    return null;
  }
};

/**
 * Maneja la creación de un punto de ruta al hacer clic
 * @param {Object} e - Evento de clic
 * @param {Object} map - Instancia del mapa
 * @param {Array} routePoints - Puntos actuales de la ruta
 * @param {Function} setRoutePoints - Función para actualizar los puntos de ruta
 * @param {Array} markersRef - Referencia a los marcadores
 * @param {String} apiKey - Clave API de OpenRoute
 */
export const handleCreateRouteClick = (e, map, routePoints, setRoutePoints, markersRef, apiKey) => {
  const newPoint = {
    lat: e.latlng.lat,
    lng: e.latlng.lng,
    name: `Punto ${routePoints.length + 1}`
  };

  const updatedPoints = [...routePoints, newPoint];
  setRoutePoints(updatedPoints);

  if (routePoints.length >= 1) {
    renderRoute(map, updatedPoints, null, apiKey, []);
  }

  const marker = L.marker(e.latlng, {
    icon: L.divIcon({
      className: 'route-point-marker',
      html: '<div style="background-color: purple; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
      iconSize: [19, 19],
      iconAnchor: [9, 9]
    })
  }).addTo(map);

  markersRef.push(marker);
};

/**
 * Maneja la eliminación de una ruta
 * @param {String} routeName - Nombre de la ruta a eliminar
 * @param {String} apiBaseUrl - URL base de la API
 * @param {Function} onSuccess - Callback en caso de éxito
 * @param {Object} selectedRoute - Ruta actualmente seleccionada
 * @param {Function} setSelectedRoute - Función para actualizar la ruta seleccionada
 */
export const handleDeleteRoute = async (routeName, apiBaseUrl, onSuccess, selectedRoute, setSelectedRoute) => {
  try {
    await deleteRoute(routeName, apiBaseUrl);
    
    if (onSuccess) onSuccess();
    
    if (selectedRoute?.name === routeName && setSelectedRoute) {
      setSelectedRoute(null);
    }
    
    return true;
  } catch (error) {
    alert(error.message || "Error al eliminar la ruta");
    return false;
  }
};

/**
 * Resalta una ruta en el mapa
 * @param {Array} routeLayers - Capas de ruta
 * @param {Object} route - Datos de la ruta a resaltar
 * @param {Object} map - Instancia del mapa
 */
export const highlightRoute = (routeLayers, route, map) => {
  // Restablece todas las rutas resaltadas
  routeLayers.forEach(layer => {
    if (layer.highlighted) {
      layer.setStyle({ color: '#0066ff', weight: 5, opacity: 0.8 }); // Color normal
      layer.highlighted = false;
    }
  });
  
  // Encuentra y resalta la nueva ruta
  const routeLayer = routeLayers.find(
    layer => layer.routeData?.name === route.name
  );

  if (routeLayer) {
    routeLayer.setStyle({ color: '#ff0000', weight: 7, opacity: 1 }); // Color rojo para resaltar
    routeLayer.highlighted = true;
    routeLayer.openPopup();
    map?.fitBounds(routeLayer.getBounds());
    routeLayer.bringToFront();
  }
};

/**
 * Muestra el popup de una ruta específica
 * @param {Array} routeLayers - Capas de ruta
 * @param {String} routeName - Nombre de la ruta
 * @param {Object} map - Instancia del mapa
 */
export const showRoutePopup = (routeLayers, routeName, map) => {
  if (!map) return;
  
  // 1. Restaurar todas las rutas a estilo normal
  routeLayers.forEach(layer => {
    if (!layer || !map.hasLayer(layer)) return;

    if (layer.highlighted) {
      layer.setStyle({
        color: '#0066ff', // Azul estándar
        weight: 5,        // Grosor normal
        opacity: 0.8
      });
      layer.highlighted = false;
    }

    if (layer.isPopupOpen()) {
      layer.closePopup();
    }
  });

  // 2. Encontrar y resaltar la nueva ruta
  const routeLayer = routeLayers.find(
    layer => layer && layer.routeData?.name === routeName
  );

  if (routeLayer) {
    // Aplicar nuevo estilo resaltado
    routeLayer.setStyle({
      color: '#ff0000',  // Rojo
      weight: 7,         // Más grueso
      opacity: 1         // Más opaco
    });

    // Marcar como resaltada
    routeLayer.highlighted = true;

    // Mostrar popup y ajustar vista
    routeLayer.openPopup();
    map.fitBounds(routeLayer.getBounds(), {
      padding: [50, 50], // Espaciado
      animate: true      // Animación suave
    });

    // Traer al frente
    routeLayer.bringToFront();
  }
};

/**
 * Muestra una ruta con un color específico
 * @param {Array} routeLayers - Capas de ruta
 * @param {String} routeName - Nombre de la ruta
 * @param {String} color - Color en formato hexadecimal
 * @param {Object} map - Instancia del mapa
 */
export const showRouteWithColor = (routeLayers, routeName, color, map) => {
  if (!map) return;
  
  const routeLayer = routeLayers.find(
    layer => layer && layer.routeData?.name === routeName
  );

  if (routeLayer) {
    routeLayer.setStyle({
      color: color,
      weight: 6,
      opacity: 0.9
    });
    routeLayer.highlighted = true;
    routeLayer.openPopup();
    map.fitBounds(routeLayer.getBounds(), {
      padding: [50, 50],
      animate: true
    });
    routeLayer.bringToFront();
  }
};
export const showMultipleRoutes = (routeLayers, routesData, map) => {
  if (!map) return;
  
  // Primero limpiar resaltados anteriores
  routeLayers.forEach(layer => {
    if (layer.highlighted) {
      layer.setStyle({ color: '#0066ff', weight: 5, opacity: 0.8 });
      layer.highlighted = false;
      if (layer.isPopupOpen()) layer.closePopup();
    }
  });

  // Resaltar cada ruta con su color
  routesData.forEach(route => {
    const routeLayer = routeLayers.find(
      l => l && l.routeData?.name === route.name
    );
    
    if (routeLayer) {
      routeLayer.setStyle({
        color: route.color,
        weight: 6,
        opacity: 0.9
      });
      routeLayer.highlighted = true;
    }
  });

  // Ajustar vista para mostrar todas las rutas
  if (routesData.length > 0) {
    const bounds = routesData.reduce((acc, route) => {
      const layer = routeLayers.find(l => l && l.routeData?.name === route.name);
      return layer ? acc.extend(layer.getBounds()) : acc;
    }, L.latLngBounds([]));
    
    if (!bounds.isValid()) return;
    
    map.fitBounds(bounds, {
      padding: [50, 50],
      animate: true
    });
  }
};