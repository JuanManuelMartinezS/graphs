import L from 'leaflet';

/**
 * Crea un icono personalizado para representar una bicicleta en el mapa.
 * 
 * @returns {L.DivIcon} Objeto de icono Leaflet personalizado para bicicletas
 * 
 * @example
 * const bikeIcon = createBicycleIcon();
 * L.marker([lat, lng], {icon: bikeIcon}).addTo(map);
 */
export const createBicycleIcon = () => {
  return L.divIcon({
    className: 'bicycle-marker',
    html: `
      <div style="
        width: 30px; 
        height: 30px; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        border: 2px solid #3b82f6;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

/**
 * Crea y gestiona un marcador de bicicleta en el mapa con métodos para actualización y eliminación.
 * 
 * @param {L.Map} map - Instancia del mapa Leaflet donde se añadirá el marcador
 * @param {Object} initialPosition - Posición inicial del marcador
 * @param {number} initialPosition.lat - Latitud inicial
 * @param {number} initialPosition.lng - Longitud inicial
 * @returns {Object} Objeto con el marcador y métodos de control
 * 
 * @property {L.Marker} marker - Instancia del marcador Leaflet
 * @property {Function} updatePosition - Actualiza la posición del marcador
 * @property {Function} remove - Elimina el marcador del mapa
 * 
 * @example
 * const bikeMarker = createBicycleMarker(map, {lat: 40.7128, lng: -74.0060});
 * bikeMarker.updatePosition({lat: 40.7138, lng: -74.0070});
 * bikeMarker.remove();
 */
export const createBicycleMarker = (map, initialPosition) => {
  // Validar parámetros de entrada
  if (!map || !(map instanceof L.Map)) {
    throw new Error('Se requiere una instancia válida de mapa Leaflet');
  }

  if (!initialPosition || typeof initialPosition.lat !== 'number' || typeof initialPosition.lng !== 'number') {
    throw new Error('Se requiere una posición inicial válida con lat y lng');
  }

  const bicycleIcon = createBicycleIcon();
  
  // Crear marcador con configuración específica
  const marker = L.marker([initialPosition.lat, initialPosition.lng], {
    icon: bicycleIcon,
    zIndexOffset: 1000, // Asegura que el marcador esté por encima de otros elementos
    bubblingMouseEvents: false // Evita que los eventos del marcador se propaguen al mapa
  }).addTo(map);
  
  return {
    marker,
    
    /**
     * Actualiza la posición del marcador de bicicleta.
     * @param {Object} newPosition - Nueva posición del marcador
     * @param {number} newPosition.lat - Nueva latitud
     * @param {number} newPosition.lng - Nueva longitud
     */
    updatePosition: (newPosition) => {
      if (!newPosition || typeof newPosition.lat !== 'number' || typeof newPosition.lng !== 'number') {
        console.error('Invalid position data:', newPosition);
        return;
      }
      marker.setLatLng([newPosition.lat, newPosition.lng]);
    },
    
    /**
     * Elimina el marcador del mapa y limpia los recursos.
     */
    remove: () => {
      if (map && marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    },
    
    /**
     * Obtiene la posición actual del marcador.
     * @returns {L.LatLng} Objeto LatLng con la posición actual
     */
    getPosition: () => {
      return marker.getLatLng();
    }
  };
};