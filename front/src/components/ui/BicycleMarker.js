import L from 'leaflet';

// Create a custom bicycle icon for the simulation
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

// Create and manage the bicycle marker on the map
export const createBicycleMarker = (map, initialPosition) => {
  const bicycleIcon = createBicycleIcon();
  
  // Create marker at the initial position
  const marker = L.marker([initialPosition.lat, initialPosition.lng], {
    icon: bicycleIcon,
    zIndexOffset: 1000 // Make sure it's above other markers
  }).addTo(map);
  
  // Return an object with methods to update the marker
  return {
    marker,
    
    // Update marker position
    updatePosition: (newPosition) => {
      if (!newPosition || typeof newPosition.lat !== 'number' || typeof newPosition.lng !== 'number') {
        console.error('Invalid position data:', newPosition);
        return;
      }
      marker.setLatLng([newPosition.lat, newPosition.lng]);
    },
    
    // Remove marker from map
    remove: () => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  };
};