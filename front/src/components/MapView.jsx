import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import Modal from './PointModal';

const API_BASE = 'http://localhost:5000';

const MapView = forwardRef((props, ref) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [routePoints, setRoutePoints] = useState([]);
  const routingControlRef = useRef(null);
  const [mode, setMode] = useState('view'); // 'view', 'addPoint', 'createRoute'
  const [clickedPosition, setClickedPosition] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pointData, setPointData] = useState({
    name: '',
    description: '',
    risk: '1'
  });
  const markersRef = useRef([]);
  const [routes, setRoutes] = useState([]);

  // Exponer funciones al componente padre
  useImperativeHandle(ref, () => ({
    setMode: (newMode) => {
      if (newMode === 'addPoint') {
       
      }
      setMode(newMode);
    },
  
    saveCurrentRoute: saveRoute
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

  const handleCreateRouteClick = (e, map) => {
    const newRoutePoints = [...routePoints, e.latlng];
    setRoutePoints(newRoutePoints);

    // Añadir marcador temporal
    const marker = L.marker(e.latlng, {
      icon: L.divIcon({
        className: 'route-point-marker',
        html: `<div style="background-color: #0066ff; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    })
      .addTo(map)
      .bindPopup(`Punto ${newRoutePoints.length}`)
      .openPopup();
    
    markersRef.current.push(marker);

    if (newRoutePoints.length >= 2) {
      createRoute(map, newRoutePoints);
    }
  };

  const createRoute = (map, points) => {
    // Eliminar control de ruta anterior si existe
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    // Crear nueva ruta
    routingControlRef.current = L.Routing.control({
      waypoints: points.map(p => L.latLng(p.lat, p.lng)),
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{color: '#0066ff', opacity: 0.7, weight: 5}]
      }
    }).addTo(map);

    routingControlRef.current.on('routesfound', function(e) {
      const route = e.routes[0];
      const distanceKm = (route.summary.totalDistance / 1000).toFixed(2);
      const durationMin = (route.summary.totalTime / 60).toFixed(1);
      
      const lastMarker = markersRef.current[markersRef.current.length - 1];
      if (lastMarker) {
        lastMarker.setPopupContent(`
          <b>Ruta creada</b><br>
          Distancia: ${distanceKm} km<br>
          Duración: ${durationMin} min
        `).openPopup();
      }
    });
  };

  const saveRoute = async (name = 'Nueva Ruta', description = '') => {
    if (routePoints.length < 2) {
      alert('Se necesitan al menos 2 puntos para guardar una ruta');
      return;
    }

    try {
      const routeData = {
        points: routePoints.map(p => ({ lat: p.lat, lng: p.lng })),
        name,
        description,
        distance: 0, // Se actualizará después
        duration: 0  // Se actualizará después
      };

      // Si hay un control de ruta, obtenemos la distancia y duración real
      if (routingControlRef.current) {
        const routes = routingControlRef.current.getPlan().routes;
        if (routes && routes.length > 0) {
          routeData.distance = (routes[0].summary.totalDistance / 1000).toFixed(2);
          routeData.duration = (routes[0].summary.totalTime / 60).toFixed(1);
        }
      }

      const response = await fetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData)
      });

      if (!response.ok) throw new Error("Error al guardar la ruta");

      const result = await response.json();
      if (result.success) {
        loadRoutes();
        return true;
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar la ruta");
      return false;
    }
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

        const marker = L.marker([node.lat, node.lng], {icon: customIcon})
          .addTo(mapInstance.current)
          .bindPopup(`
            <b>${node.name}</b><br>
            ${node.description}<br>
            Riesgo: ${node.risk}<br>
            <small>${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</small>
          `);
        
        markersRef.current.push(marker);
      });
    } catch (error) {
      console.error("Error al cargar nodos:", error);
      alert("No se pudo conectar con el servidor. ¿Está corriendo?");
    }
  };

  const loadRoutes = async () => {
    try {
      const response = await fetch(`${API_BASE}/routes`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const routesData = await response.json();
      setRoutes(routesData);

      // Opcional: Visualizar las rutas en el mapa
      // (Implementar según necesidad)
    } catch (error) {
      console.error("Error al cargar rutas:", error);
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
            <button 
              onClick={() => saveRoute()}
              className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Guardar Ruta
            </button>
          )}
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