import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import Modal from './PointModal';

const API_BASE = 'http://localhost:5000';

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
      loadRoutes(); // ¡Ahora vamos a implementar esta función!

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

  // Implementar la función loadRoutes
  const loadRoutes = async () => {
    try {
      if (!mapInstance.current) return;
      
      const response = await fetch(`${API_BASE}/routes`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const routes = await response.json();
      routes.forEach(route => {
        if (route.points && route.points.length >= 2) {
          // Crear waypoints a partir de los puntos de la ruta
          const waypoints = route.points.map(point => L.latLng(point.lat, point.lng));
          
          // Crear una línea para la ruta
          L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
              serviceUrl: 'https://router.project-osrm.org/route/v1',
              profile: 'walking'
            }),
            fitSelectedRoutes: false,
            show: false,
            lineOptions: {
              styles: [
                {color: '#0066ff', opacity: 0.8, weight: 5}
              ],
              missingRouteTolerance: 0
            },
            createMarker: function() { return null; },
            addWaypoints: false,
            routeDragInterval: 0,
            collapsible: false
          }).addTo(mapInstance.current);
        }
      });
    } catch (error) {
      console.error("Error al cargar rutas:", error);
    }
  };

  // Implementar la función handleCreateRouteClick que falta
  const handleCreateRouteClick = (e, map) => {
    // Esta función debería manejar lo que sucede cuando se hace clic en el mapa en modo createRoute
    console.log("Click para crear ruta en:", e.latlng);
    // Aquí iría la lógica para añadir puntos a la ruta en creación
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

      // Limpiar marcadores existentes
      markersRef.current.forEach(marker => {
        if (marker && mapInstance.current) {
          marker.remove();
        }
      });
      markersRef.current = markersRef.current.filter(m => m?.options?.isRouteMarker);

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

        // Verificar que mapInstance.current exista antes de añadir el marcador
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
          
          <button 
            onClick={() => {
              setMode('view');
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