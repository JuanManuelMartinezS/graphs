import React, { useRef, useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';

function AddRoutePage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const routingControlRef = useRef(null);
  const markersRef = useRef([]);
  const [routeData, setRouteData] = useState({
    name: '',
    description: '',
    difficulty: '1',
    popularity: '1'
  });
  const [nodes, setNodes] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      // Inicializar el mapa
      const map = L.map(mapRef.current).setView([5.0703, -75.5138], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Cargar nodos
      loadNodes();

      // Asegurar que el mapa se redimensiona correctamente
      setTimeout(() => {
        map.invalidateSize();
      }, 0);
    }

    return () => {
      // Limpieza al desmontar el componente
      if (mapInstance.current) {
        mapInstance.current.off();
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const loadNodes = async () => {
    try {
      const response = await fetch(`${API_BASE}/nodes`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const nodesData = await response.json();
      // Ya no necesitamos asignar IDs porque usaremos name como identificador único
      setNodes(nodesData);
    } catch (error) {
      console.error("Error al cargar nodos:", error);
    }
  };

  // Renderizar nodos cuando se cargan o cuando cambia la selección
  useEffect(() => {
    if (nodes.length > 0) {
      renderNodes();
    }
  }, [nodes, selectedNodes]);

  const renderNodes = () => {
    if (!mapInstance.current) return;

    // Limpiar los marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker && mapInstance.current) {
        marker.off('click'); // Eliminar eventos anteriores primero
        marker.remove();
      }
    });
    markersRef.current = [];

    nodes.forEach(node => {
      // Verificar si este nodo específico está seleccionado usando name
      const isSelected = selectedNodes.some(selectedNode => selectedNode.name === node.name);
      
      let markerColor;
      switch(node.risk) {
        case 1: markerColor = 'green'; break;
        case 2: markerColor = 'blue'; break;
        case 3: markerColor = 'yellow'; break;
        case 4: markerColor = 'orange'; break;
        case 5: markerColor = 'red'; break;
        default: markerColor = 'blue';
      }

      // Estilo diferente para nodos seleccionados
      const borderStyle = isSelected ? '3px solid purple' : '2px solid white';
      const size = isSelected ? '25px' : '20px';

      const customIcon = L.divIcon({
        className: `custom-marker ${isSelected ? 'selected' : ''}`,
        html: `<div style="background-color: ${markerColor}; width: ${size}; height: ${size}; border-radius: 50%; border: ${borderStyle}; cursor: pointer;"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([node.lat, node.lng], { 
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0 // Para que los seleccionados aparezcan arriba
      })
      .addTo(mapInstance.current)
      .bindPopup(`
        <b>${node.name || 'Sin nombre'}</b><br>
        ${node.description || 'Sin descripción'}<br>
        Riesgo: ${node.risk}<br>
        <small>${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</small>
      `);

      // Manejar el evento de click
      marker.on('click', () => toggleNodeSelection(node));

      markersRef.current.push(marker);
    });
  };

  const toggleNodeSelection = (node) => {
    setSelectedNodes(prev => {
      // Comprobar si este nodo específico ya está seleccionado usando name
      const nodeIndex = prev.findIndex(n => n.name === node.name);
      
      if (nodeIndex >= 0) {
        // Si está seleccionado, lo eliminamos de la selección
        return prev.filter(n => n.name !== node.name);
      } else {
        // Si no está seleccionado, lo añadimos a la selección
        return [...prev, node];
      }
    });
  };

  const createRoute = () => {
    if (selectedNodes.length < 2) {
      alert('Se necesitan al menos 2 nodos para crear una ruta');
      return;
    }
  
    if (!mapInstance.current) return;
  
    // Eliminar control de ruta anterior si existe
    if (routingControlRef.current) {
      mapInstance.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
  
    // Crear waypoints a partir de los nodos seleccionados
    const waypoints = selectedNodes.map(node => L.latLng(node.lat, node.lng));
  
    // Configurar el control de routing con más opciones
    routingControlRef.current = L.Routing.control({
      waypoints: waypoints,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving', // Cambiado a 'driving' para más flexibilidad en rutas
        timeout: 30000,
      }),
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      optimizeWaypoints: true,
      show: false, // Esto oculta el panel de instrucciones
      lineOptions: {
        styles: [
          {color: '#0066ff', opacity: 0.8, weight: 5}
        ],
        missingRouteTolerance: 0,
        extendToWaypoints: true, // Permite rutas más flexibles
        addWaypoints: false // Evita añadir waypoints intermedios
      },
      createMarker: function() { return null; }, // No crear marcadores por defecto
      addWaypoints: false, // No mostrar waypoints
      routeDragInterval: 0,
      collapsible: false,
      // Deshabilitar completamente el panel de instrucciones
      plan: L.Routing.plan(waypoints, {
        createMarker: function() { return null; },
        dragStyles: []
      })
    }).addTo(mapInstance.current);
  
    // Configuración adicional para evitar que se muestren instrucciones
    if (routingControlRef.current._container) {
      routingControlRef.current._container.style.display = 'none';
    }
  
    // Capturar eventos del routing para obtener información de la ruta
    routingControlRef.current.on('routesfound', function(e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      // Guardar distancia y tiempo
      setRouteDistance({
        distance: (summary.totalDistance / 1000).toFixed(2), // convertir a km
        time: Math.round(summary.totalTime / 60) // convertir a minutos
      });
      
      // Opcional: puedes forzar una ruta más directa aquí si es necesario
      // Esto es un ejemplo de cómo podrías modificar la ruta
      if (routes[0].coordinates.length > 50) { // Si la ruta tiene muchos puntos (compleja)
        // Podrías implementar lógica para simplificar la ruta
      }
    });
  
    // Agregar manejo de errores
    routingControlRef.current.on('routingerror', function(e) {
      console.error("Error de enrutamiento:", e.error);
      alert(`Error al calcular la ruta: ${e.error.message || 'Error desconocido'}. Intente con menos puntos o más cercanos entre sí.`);
    });
  };
  

  const saveRoute = async () => {
    if (selectedNodes.length < 2) {
      alert('Se necesitan al menos 2 nodos para guardar una ruta');
      return;
    }

    // Si aún no se ha visualizado la ruta, hacerlo primero
    if (!routingControlRef.current) {
      createRoute();
      // Esperar a que se calcule la ruta antes de guardar
      setTimeout(() => saveRouteData(), 1000);
    } else {
      saveRouteData();
    }
  };

  const saveRouteData = async () => {
    try {
      const routeDataToSend = {
        ...routeData,
        points: selectedNodes.map(node => ({ 
          lat: node.lat, 
          lng: node.lng,
          nodeName: node.name // Usar name en lugar de nodeId
        })),
        difficulty: parseInt(routeData.difficulty),
        popularity: parseInt(routeData.popularity),
        distance: routeDistance ? parseFloat(routeDistance.distance) : null,
        estimatedTime: routeDistance ? routeDistance.time : null
      };

      const response = await fetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeDataToSend)
      });

      if (!response.ok) throw new Error("Error al guardar la ruta");

      const result = await response.json();
      if (result.success) {
        alert('¡Ruta guardada con éxito!');
        navigate('/'); // Volver a la página principal
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar la ruta: " + error.message);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-64 bg-gray-700 text-white p-4 space-y-4 overflow-y-auto h-full">
        <h2 className="text-xl font-bold">Crear Nueva Ruta</h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Nombre de la ruta</label>
          <input
            type="text"
            className="w-full p-2 rounded text-black"
            value={routeData.name}
            onChange={(e) => setRouteData({...routeData, name: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            className="w-full p-2 rounded text-black"
            value={routeData.description}
            onChange={(e) => setRouteData({...routeData, description: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Dificultad (1-5)</label>
          <select
            className="w-full p-2 rounded text-black"
            value={routeData.difficulty}
            onChange={(e) => setRouteData({...routeData, difficulty: e.target.value})}
          >
            <option value="1">1 - Muy fácil</option>
            <option value="2">2 - Fácil</option>
            <option value="3">3 - Moderada</option>
            <option value="4">4 - Difícil</option>
            <option value="5">5 - Muy difícil</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Popularidad (1-5)</label>
          <select
            className="w-full p-2 rounded text-black"
            value={routeData.popularity}
            onChange={(e) => setRouteData({...routeData, popularity: e.target.value})}
          >
            <option value="1">1 - Muy baja</option>
            <option value="2">2 - Baja</option>
            <option value="3">3 - Media</option>
            <option value="4">4 - Alta</option>
            <option value="5">5 - Muy alta</option>
          </select>
        </div>
        
        <div className="pt-2">
          <p className="text-sm">Nodos seleccionados: {selectedNodes.length}</p>
          {routeDistance && (
            <div className="my-2 p-2 bg-gray-800 rounded">
              <p className="text-sm">Distancia: {routeDistance.distance} km</p>
              <p className="text-sm">Tiempo est.: {routeDistance.time} min</p>
            </div>
          )}
          <button
            onClick={createRoute}
            className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded mt-2"
          >
            Visualizar Ruta
          </button>
          <button
            onClick={saveRoute}
            className="w-full bg-green-500 hover:bg-green-600 p-2 rounded mt-2"
          >
            Guardar Ruta
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-500 hover:bg-gray-600 p-2 rounded mt-2"
          >
            Cancelar
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />
        
        {/* Indicador de nodos seleccionados */}
        {selectedNodes.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[500] bg-white p-2 rounded shadow-lg">
            Nodos seleccionados: {selectedNodes.length}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddRoutePage;