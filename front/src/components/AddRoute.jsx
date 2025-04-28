import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';
const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d'; // Reemplaza con tu API key

function AddRoutePage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const routeLineRef = useRef(null);
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

  const [errors, setErrors] = useState({
    name: false,
    description: false,
    selectedNodes: false
  });

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
      setNodes(nodesData);
    } catch (error) {
      console.error("Error al cargar nodos:", error);
    }
  };

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
        marker.off('click');
        marker.remove();
      }
    });
    markersRef.current = [];

    nodes.forEach(node => {
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
        zIndexOffset: isSelected ? 1000 : 0
      })
      .addTo(mapInstance.current)
      .bindPopup(`
        <b>${node.name || 'Sin nombre'}</b><br>
        ${node.description || 'Sin descripción'}<br>
        Riesgo: ${node.risk}<br>
        <small>${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</small>
      `);

      marker.on('click', () => toggleNodeSelection(node));

      markersRef.current.push(marker);
    });
  };

  const toggleNodeSelection = (node) => {
    setSelectedNodes(prev => {
      const nodeIndex = prev.findIndex(n => n.name === node.name);
      
      if (nodeIndex >= 0) {
        return prev.filter(n => n.name !== node.name);
      } else {
        return [...prev, node];
      }
    });
  };

  const validateForm = () => {
    const newErrors = {
      name: !routeData.name.trim(),
      description: !routeData.description.trim(),
      selectedNodes: selectedNodes.length < 2
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const createRoute = async () => {
    if (selectedNodes.length < 2) {
      alert('Se necesitan al menos 2 nodos para crear una ruta');
      return;
    }
  
    if (!mapInstance.current) return;
  
    // Eliminar ruta anterior si existe
    if (routeLineRef.current) {
      mapInstance.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
  
    // Crear array de coordenadas para OpenRouteService
    const coordinates = selectedNodes.map(node => [node.lng, node.lat]);
  
    try {
      const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
        method: 'POST',
        headers: {
          'Authorization': OPENROUTE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: coordinates,
          elevation: false,
          instructions: true,  // ← Cambiado a true para obtener los segmentos
          geometry: true,
          units: 'm'
        })
      });

  
      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
  
      const data = await response.json();
  
      // Extraer la geometría de la ruta
      const routeGeometry = data.features[0].geometry;
  
      // Dibujar la ruta en el mapa
      const routeLine = L.geoJSON(routeGeometry, {
        style: {
          color: '#0066ff',
          weight: 5,
          opacity: 0.8
        }
      }).addTo(mapInstance.current);
  
      routeLineRef.current = routeLine;
  
      // Extraer información de la ruta (ya viene en metros desde el backend)
      const distance = data.features[0].properties.summary.distance; // en metros
      console.log(distance);
      
      const duration = data.features[0].properties.summary.duration; // en segundos

      // Guardar distancia y tiempo
      setRouteDistance({
        distance: Math.round(distance), // Redondear a entero
        time: Math.round(duration / 60) // convertir a minutos
      });
  
      // Ajustar el mapa para mostrar toda la ruta
      mapInstance.current.fitBounds(routeLine.getBounds());
  
    } catch (error) {
      console.error("Error al calcular la ruta:", error);
      alert(`Error al calcular la ruta: ${error.message}. Intente con menos puntos o más cercanos entre sí.`);
    }
  };

  const saveRoute = async () => {

    if (!validateForm()) {
      return; // Detiene la ejecución si hay errores
    }
  
    if (selectedNodes.length < 2) {
      alert('Se necesitan al menos 2 nodos para guardar una ruta');
      return;
    }

    // Si aún no se ha visualizado la ruta, hacerlo primero
    if (!routeLineRef.current) {
      await createRoute();
    }
    
    saveRouteData();
  };


const saveRouteData = async () => {
  try {
    if (selectedNodes.length < 2) {
      alert('Se necesitan al menos 2 nodos para guardar una ruta');
      return;
    }

    // Si no hemos calculado la ruta aún, hacerlo primero
    if (!routeDistance) {
      await createRoute();
    }

    console.log(routeDistance.distance);
    
    // Preparar datos para enviar al backend
    const routeDataToSend = {
      ...routeData,
      points: selectedNodes.map(node => ({
        lat: node.lat,
        lng: node.lng,
        nodeName: node.name
      })),
      difficulty: parseInt(routeData.difficulty),
      popularity: parseInt(routeData.popularity),
      distance: routeDistance ? parseFloat(routeDistance.distance) : null,
      estimatedTime: routeDistance ? routeDistance.time : null
    };

    // Enviar al backend para que calcule el grafo
    const response = await fetch(`${API_BASE}/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routeDataToSend)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al guardar la ruta");
    }

    const result = await response.json();
    if (result.success) {
      alert('¡Ruta guardada con éxito!');
      navigate('/');
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar la ruta: " + error.message);
  }
};

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-64 bg-gray-500 text-white p-4 space-y-4 overflow-y-auto h-full">
        <h2 className="text-xl font-bold">Crear Nueva Ruta</h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Nombre de la ruta *</label>
          <input
            type="text"
            className={`w-full p-2 rounded text-black border-2${errors.name ? 'border-2 border-red-500' : ''}`}
            value={routeData.name}
            onChange={(e) => {
              setRouteData({...routeData, name: e.target.value});
              setErrors({...errors, name: false});
            }}
            required
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">Este campo es requerido</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Descripción *</label>
          <textarea
            className={`w-full p-2 rounded text-black border-2${errors.description ? 'border-2 border-red-500' : ''}`}
            value={routeData.description}
            onChange={(e) => {
              setRouteData({...routeData, description: e.target.value});
              setErrors({...errors, description: false});
            }}
            required
          />
          {errors.description && <p className="text-red-400 text-xs mt-1">Este campo es requerido</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Dificultad (1-5)</label>
          <select
            className="w-full p-2 rounded text-black border-2"
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
            className="w-full p-2 rounded text-black border-2"
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
          <p className={`text-sm ${errors.selectedNodes ? 'text-red-400' : ''}`}>
            Nodos seleccionados: {selectedNodes.length} {selectedNodes.length < 2 && '(Se requieren al menos 2)'}
          </p>
          {errors.selectedNodes && <p className="text-red-400 text-xs">Selecciona al menos 2 nodos</p>}
          
          {routeDistance && (
            <div className="my-2 p-2 bg-gray-800 rounded">
              <p className="text-sm">Distancia: {routeDistance.distance} m</p>
              <p className="text-sm">Tiempo est.: {routeDistance.time} min</p>
            </div>
          )}
          
          <button
            onClick={createRoute}
            disabled={selectedNodes.length < 2}
            className={`w-full p-2 rounded mt-2 ${
              selectedNodes.length < 2
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Visualizar Ruta
          </button>
          
          <button
            onClick={saveRoute}
            disabled={!routeData.name || !routeData.description || selectedNodes.length < 2}
            className={`w-full p-2 rounded mt-2 ${
              !routeData.name || !routeData.description || selectedNodes.length < 2
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
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