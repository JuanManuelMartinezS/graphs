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

      let customIcon;

      if (node.type === 'interest') {
        // Icono para puntos de interés (usando un ícono de estrella)
        const size = isSelected ? '25px' : '20px';
        const borderStyle = isSelected ? '3px solid purple' : '2px solid white';

        customIcon = L.divIcon({
          className: `custom-marker ${isSelected ? 'selected' : ''}`,
          html: `<div style="background-color: purple; width: ${size}; height: ${size}; border-radius: 50%; border: ${borderStyle}; display: flex; justify-content: center; align-items: center;">
                   <span style="color: white; font-size: 12px;">★</span>
                 </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
      } else {
        // Icono para puntos de control (con número de riesgo)
        let markerColor;
        switch (node.risk) {
          case 1: markerColor = 'green'; break;
          case 2: markerColor = 'blue'; break;
          case 3: markerColor = 'yellow'; break;
          case 4: markerColor = 'orange'; break;
          case 5: markerColor = 'red'; break;
          default: markerColor = 'blue';
        }

        const size = isSelected ? '25px' : '20px';
        const borderStyle = isSelected ? '3px solid purple' : '2px solid white';

        customIcon = L.divIcon({
          className: `custom-marker ${isSelected ? 'selected' : ''}`,
          html: `<div style="background-color: ${markerColor}; width: ${size}; height: ${size}; border-radius: 50%; border: ${borderStyle}; display: flex; justify-content: center; align-items: center;">
                   <span style="color: white; font-size: 10px; font-weight: bold;">${node.risk}</span>
                 </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
      }

      const marker = L.marker([node.lat, node.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0
      })
        .addTo(mapInstance.current)
        .bindPopup(`
        <b>${node.name || 'Sin nombre'}</b><br>
        ${node.description || 'Sin descripción'}<br>
        Tipo: ${node.type === 'control' ? 'Punto de control' : 'Punto de interés'}<br>
        ${node.type === 'control' ? `Riesgo: ${node.risk}<br>` : ''}
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
          nodeName: node.name,
          risk: node.risk,
          type: node.type
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
<div className="flex h-screen w-screen overflow-hidden bg-gray-100">
  {/* Sidebar - Panel de creación de ruta */}
  <div className="w-80 bg-gradient-to-b from-gray-700 to-gray-800 text-white p-6 space-y-6 overflow-y-auto h-full shadow-xl">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-500">
        Crear Nueva Ruta
      </h2>
      <button 
        onClick={() => navigate('/')}
        className="p-2 rounded-full hover:bg-gray-600 transition-colors"
        title="Cancelar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>

    {/* Campos del formulario */}
    <div className="space-y-5">
      {/* Nombre */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Nombre de la ruta *</label>
        <div className="relative">
          <input
            type="text"
            className={`w-full p-3 rounded-lg text-gray-800 bg-gray-100 border-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            value={routeData.name}
            onChange={(e) => {
              setRouteData({ ...routeData, name: e.target.value });
              setErrors({ ...errors, name: false });
            }}
            required
          />
          {errors.name && (
            <div className="absolute right-3 top-3 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {errors.name && <p className="text-red-300 text-xs">Este campo es requerido</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Descripción *</label>
        <div className="relative">
          <textarea
            className={`w-full p-3 rounded-lg text-gray-800 bg-gray-100 border-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px] ${
              errors.description ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            value={routeData.description}
            onChange={(e) => {
              setRouteData({ ...routeData, description: e.target.value });
              setErrors({ ...errors, description: false });
            }}
            required
          />
          {errors.description && (
            <div className="absolute right-3 top-3 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {errors.description && <p className="text-red-300 text-xs">Este campo es requerido</p>}
      </div>

      {/* Dificultad */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Dificultad</label>
        <div className="relative">
          <select
            className="w-full p-3 rounded-lg text-gray-800 bg-gray-100 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all"
            value={routeData.difficulty}
            onChange={(e) => setRouteData({ ...routeData, difficulty: e.target.value })}
          >
            <option value="1">1 - Muy fácil</option>
            <option value="2">2 - Fácil</option>
            <option value="3">3 - Moderada</option>
            <option value="4">4 - Difícil</option>
            <option value="5">5 - Muy difícil</option>
          </select>
          <div className="absolute right-3 top-3 text-gray-500 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Fácil</span>
          <span>Difícil</span>
        </div>
      </div>

      {/* Popularidad */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Popularidad</label>
        <div className="relative">
          <select
            className="w-full p-3 rounded-lg text-gray-800 bg-gray-100 border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all"
            value={routeData.popularity}
            onChange={(e) => setRouteData({ ...routeData, popularity: e.target.value })}
          >
            <option value="1">1 - Muy baja</option>
            <option value="2">2 - Baja</option>
            <option value="3">3 - Media</option>
            <option value="4">4 - Alta</option>
            <option value="5">5 - Muy alta</option>
          </select>
          <div className="absolute right-3 top-3 text-gray-500 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Baja</span>
          <span>Alta</span>
        </div>
      </div>

      {/* Sección de nodos y acciones */}
      <div className="pt-4 border-t border-gray-600 space-y-4">
        <div className={`text-sm p-2 rounded-lg ${
          errors.selectedNodes ? 'bg-red-900/30 text-red-300' : 'bg-gray-800/50 text-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <span>Nodos seleccionados:</span>
            <span className="font-bold">{selectedNodes.length}</span>
          </div>
          {selectedNodes.length < 2 && (
            <p className="mt-1 text-xs">(Se requieren al menos 2 nodos)</p>
          )}
          {errors.selectedNodes && (
            <p className="mt-1 text-xs">¡Selecciona al menos 2 nodos!</p>
          )}
        </div>

        {routeDistance && (
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Distancia:</span>
              <span className="font-medium">{routeDistance.distance} m</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Tiempo estimado:</span>
              <span className="font-medium">{routeDistance.time} min</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={createRoute}
            disabled={selectedNodes.length < 2}
            className={`w-full p-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
              selectedNodes.length < 2
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <span>Visualizar Ruta</span>
          </button>

          <button
            onClick={saveRoute}
            disabled={!routeData.name || !routeData.description || selectedNodes.length < 2}
            className={`w-full p-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
              !routeData.name || !routeData.description || selectedNodes.length < 2
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Guardar Ruta</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* Mapa */}
  <div className="flex-1 relative">
    <div ref={mapRef} className="absolute inset-0" />

    {selectedNodes.length > 0 && (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[500] bg-white p-3 rounded-lg shadow-lg flex items-center space-x-2">
        <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
        <span className="font-medium">Nodos seleccionados: {selectedNodes.length}</span>
      </div>
    )}
  </div>
</div>
  );
}

export default AddRoutePage;