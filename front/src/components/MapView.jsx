import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './PointModal';

const API_BASE = 'http://localhost:5000';
const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d'; // Reemplaza con tu API key

const MapView = forwardRef((props, ref) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [mode, setMode] = useState('view'); // 'view', 'addPoint', 'createRoute'
  const [clickedPosition, setClickedPosition] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pointData, setPointData] = useState({
    name: '',
    description: '',
    risk: '1'
  });
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]); // Para almacenar las capas de ruta

  // Exponer funciones al componente padre
  useImperativeHandle(ref, () => ({
    setMode: (newMode) => {
      setMode(newMode);
    },
  }));

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      // Inicializar el mapa
      const map = L.map(mapRef.current).setView([5.0703, -75.5138], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Cargar datos iniciales
      loadNodes();
      loadRoutes();

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

  useEffect(() => {
    if (!mapInstance.current) return;

    const handleMapClick = (e) => {
      if (mode === 'addPoint') {
        setClickedPosition(e.latlng);
        setModalOpen(true);
      } else if (mode === 'createRoute') {
        handleCreateRouteClick(e, mapInstance.current);
      }
    };

    mapInstance.current.on('click', handleMapClick);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('click', handleMapClick);
      }
    };
  }, [mode]);

  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
      }, 300);
    }
  }, [modalOpen]);

  // Función para dibujar una ruta usando OpenRouteService
  const drawRoute = async (points) => {
    if (!mapInstance.current || points.length < 2) return;

    try {
      const coordinates = points.map(point => [point.lng, point.lat]);
      
      const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
        method: 'POST',
        headers: {
          'Authorization': OPENROUTE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: coordinates,
          elevation: false,
          instructions: false,
          preference: 'recommended',
          units: 'km'
        })
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();
      const routeGeometry = data.features[0].geometry;

      // Dibujar la ruta en el mapa
      const routeLayer = L.geoJSON(routeGeometry, {
        style: {
          color: '#0066ff',
          weight: 5,
          opacity: 0.8
        }
      }).addTo(mapInstance.current);

      // Almacenar referencia a la capa para poder eliminarla después
      routeLayersRef.current.push(routeLayer);

      // Ajustar el mapa para mostrar toda la ruta
      mapInstance.current.fitBounds(routeLayer.getBounds());

    } catch (error) {
      console.error("Error al calcular la ruta:", error);
    }
  };

  // Cargar rutas desde el backend y dibujarlas
  const loadRoutes = async () => {
    try {
      if (!mapInstance.current) return;
      
      // Limpiar rutas existentes
      routeLayersRef.current.forEach(layer => {
        if (layer && mapInstance.current) {
          mapInstance.current.removeLayer(layer);
        }
      });
      routeLayersRef.current = [];
      
      const response = await fetch(`${API_BASE}/routes`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const routes = await response.json();
      routes.forEach(route => {
        if (route.points && route.points.length >= 2) {
          drawRoute(route.points);
        }
      });
    } catch (error) {
      console.error("Error al cargar rutas:", error);
    }
  };

  const handleCreateRouteClick = (e, map) => {
    const newPoint = {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      name: `Punto ${routePoints.length + 1}`
    };
    
    setRoutePoints([...routePoints, newPoint]);
    
    // Si hay al menos 2 puntos, dibujar la ruta
    if (routePoints.length >= 1) {
      drawRoute([...routePoints, newPoint]);
    }
    
    // Crear un marcador temporal para el punto
    const marker = L.marker(e.latlng, {
      icon: L.divIcon({
        className: 'route-point-marker',
        html: '<div style="background-color: purple; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
        iconSize: [19, 19],
        iconAnchor: [9, 9]
      })
    }).addTo(map);
    
    markersRef.current.push(marker);
  };

  const handleAddPoint = async () => {
    try {
      if (!clickedPosition) return;
      
      const response = await fetch(`${API_BASE}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: clickedPosition.lat,
          lng: clickedPosition.lng,
          name: pointData.name,
          description: pointData.description,
          risk: parseInt(pointData.risk)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar");
      }

      const result = await response.json();
      if (result.success) {
        loadNodes();
        setMode('view');
        setModalOpen(false);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "Error al guardar el punto");
    } finally {
      setPointData({
        name: '',
        description: '',
        risk: '1'
      });
    }
  };

  const loadNodes = async () => {
    try {
      if (!mapInstance.current) return;

      // Limpiar marcadores existentes (excepto los de ruta si los hay)
      markersRef.current.forEach(marker => {
        if (marker && mapInstance.current) {
          marker.remove();
        }
      });
      markersRef.current = [];

      const response = await fetch(`${API_BASE}/nodes`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const nodes = await response.json();
      nodes.forEach(node => {
        let markerColor;
        switch(node.risk) {
          case 1: markerColor = 'green'; break;
          case 2: markerColor = 'blue'; break;
          case 3: markerColor = 'yellow'; break;
          case 4: markerColor = 'orange'; break;
          case 5: markerColor = 'red'; break;
          default: markerColor = 'blue';
        }

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        if (mapInstance.current) {
          const marker = L.marker([node.lat, node.lng], {icon: customIcon})
            .addTo(mapInstance.current)
            .bindPopup(`
              <b>${node.name}</b><br>
              ${node.description}<br>
              Riesgo: ${node.risk}<br>
              <small>${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</small>
            `);
          
          markersRef.current.push(marker);
        }
      });
    } catch (error) {
      console.error("Error al cargar nodos:", error);
      alert("No se pudo conectar con el servidor. ¿Está corriendo?");
    }
  };

  return (
    <>
      {/* Indicador de modo actual */}
      {mode !== 'view' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[500] bg-white p-2 rounded shadow-lg">
          Modo actual: 
          <span className="font-bold ml-1">
            {mode === 'addPoint' ? 'Añadir Punto' : 'Crear Ruta'}
          </span>
          
          {mode === 'createRoute' && routePoints.length > 0 && (
            <span className="ml-2 text-sm">
              Puntos seleccionados: {routePoints.length}
            </span>
          )}
          
          <button 
            onClick={() => {
              setMode('view');
              setRoutePoints([]);
            }}
            className="ml-4 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      <div ref={mapRef} className="absolute inset-0 z-0" />
      
      <Modal 
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMode('view');
        }}
        onSubmit={handleAddPoint}
      >
        <h2 className="text-xl font-bold mb-4">Añadir nuevo punto</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={pointData.name}
              onChange={(e) => setPointData({...pointData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              className="w-full p-2 border rounded"
              value={pointData.description}
              onChange={(e) => setPointData({...pointData, description: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nivel de riesgo (1-5)</label>
            <select
              className="w-full p-2 border rounded"
              value={pointData.risk}
              onChange={(e) => setPointData({...pointData, risk: e.target.value})}
              required
            >
              <option value="1">1 - Muy bajo</option>
              <option value="2">2 - Bajo</option>
              <option value="3">3 - Medio</option>
              <option value="4">4 - Alto</option>
              <option value="5">5 - Muy alto</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            <p>Coordenadas:</p>
            <p>Latitud: {clickedPosition?.lat.toFixed(6)}</p>
            <p>Longitud: {clickedPosition?.lng.toFixed(6)}</p>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default MapView;