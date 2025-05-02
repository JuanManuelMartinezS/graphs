import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Modal from './Modal';
import PointModal from './PointModal';

const API_BASE = 'http://localhost:5000';
const OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d';

const MapView = forwardRef(({ onRoutesLoaded = () => {} }, ref)=> {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [mode, setMode] = useState('view');
  const [clickedPosition, setClickedPosition] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pointData, setPointData] = useState({
    name: '',
    description: '',
    type: 'control', // 'control' o 'interest'
    risk: '1'
  });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

// En el useImperativeHandle de MapView
useImperativeHandle(ref, () => ({
  setMode: (newMode) => {
    setMode(newMode);
  },
  clearRoute: () => {
    setRoutePoints([]);
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  },
  highlightRoute: (route) => {
    // Limpiar cualquier ruta resaltada anteriormente
    routeLayersRef.current.forEach(layer => {
      if (layer.highlighted) {
        layer.setStyle({ color: '#0066ff' });
        layer.highlighted = false;
      }
    });

    // Encontrar y resaltar la nueva ruta
    const routeLayer = routeLayersRef.current.find(
      layer => layer.routeData?.name === route.name
    );

    if (routeLayer) {
      routeLayer.setStyle({ color: '#ff0000', weight: 7 });
      routeLayer.highlighted = true;
      routeLayer.openPopup();
      mapInstance.current?.fitBounds(routeLayer.getBounds());
    }
  },
  showRoutePopup: (routeName) => {
    const routeLayer = routeLayersRef.current.find(
      layer => layer.routeData?.name === routeName
    );
    
    if (routeLayer) {
      // Cerrar otros popups primero
      routeLayersRef.current.forEach(layer => {
        if (layer !== routeLayer && layer.isPopupOpen()) {
          layer.closePopup();
        }
      });
      
      // Abrir popup de la ruta seleccionada
      routeLayer.openPopup();
      
      // Centrar el mapa en la ruta
      mapInstance.current?.fitBounds(routeLayer.getBounds(), {
        padding: [50, 50],
        animate: true
      });
      
      // Resaltar la ruta
      routeLayer.setStyle({
        color: '#ff0000',
        weight: 6
      });
      
      // Restaurar estilo después de 5 segundos
      setTimeout(() => {
        routeLayer.setStyle({
          color: '#0066ff',
          weight: 5
        });
      }, 5000);
    }
  }
}));

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const map = L.map(mapRef.current).setView([5.0703, -75.5138], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      loadNodes();
      loadRoutes();

      setTimeout(() => {
        map.invalidateSize();
      }, 0);
    }

    return () => {
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
  }, [modalOpen, deleteConfirmOpen]);

  const drawRoute = async (points, routeData) => {
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
          units: 'm'
        })
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();
      
      const routeGeometry = data.features[0].geometry;

      const routeLayer = L.geoJSON(routeGeometry, {
        style: {
          color: '#0066ff',
          weight: 5,
          opacity: 0.8
        }
      }).addTo(mapInstance.current);

      routeLayer.routeData = routeData;

      // Changed: Create popup content for the route
      if (routeData) {
        const popupContent = `
          <div style="min-width: 250px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${routeData.name || 'Ruta sin nombre'}</h3>
            <p style="margin-bottom: 8px;">${routeData.description || 'Sin descripción'}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
                <p style="font-size: 12px; font-weight: 500; color: #4b5563; margin: 0;">Distancia</p>
                <p style="font-size: 16px; font-weight: bold; margin: 0;">${routeData.distance} m</p>
              </div>
              <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
                <p style="font-size: 12px; font-weight: 500; color: #4b5563; margin: 0;">Tiempo estimado</p>
                <p style="font-size: 16px; font-weight: bold; margin: 0;">${routeData.duration || '0'} min</p>
              </div>
              <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
                <p style="font-size: 12px; font-weight: 500; color: #4b5563; margin: 0;">Dificultad</p>
                <p style="font-size: 16px; font-weight: bold; margin: 0;">${routeData.difficulty || 'N/A'}/5</p>
              </div>
              <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
                <p style="font-size: 12px; font-weight: 500; color: #4b5563; margin: 0;">Popularidad</p>
                <p style="font-size: 16px; font-weight: bold; margin: 0;">${routeData.popularity || 'N/A'}/5</p>
              </div>
              <div style="background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
                <p style="font-size: 12px; font-weight: 500; color: #4b5563; margin: 0;">Riesgo</p>
                <p style="font-size: 16px; font-weight: bold; margin: 0;">${routeData.risk || 'N/A'}/5</p>
              </div>
            </div>
            
            <p style="font-size: 13px; font-weight: 500; color: #4b5563; margin-bottom: 4px;">Puntos de la ruta:</p>
            <ul style="padding-left: 20px; margin-top: 0; margin-bottom: 12px;">
              ${routeData.points?.map((point, index) => `
                <li style="font-size: 13px;">${point.nodeName || `Punto ${index + 1}`} (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})</li>
              `).join('')}
            </ul>
            
            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
              <button 
                onclick="window.dispatchEvent(new CustomEvent('deleteRoute', { detail: '${routeData.name}' }))"
                style="padding: 6px 12px; background-color: #ef4444; color: white; border-radius: 4px; border: none; cursor: pointer;"
              >
                Eliminar Ruta
              </button>
              <button 
                onclick="window.dispatchEvent(new CustomEvent('simulateRoute', { detail: '${routeData.name}' }))"
                style="padding: 6px 12px; background-color: #3b82f6; color: white; border-radius: 4px; border: none; cursor: pointer;"
              >
                Iniciar Simulación
              </button>
            </div>
          </div>
        `;
        
        routeLayer.bindPopup(popupContent, { 
          maxWidth: 300,
          className: 'route-popup'
        });
      }

      routeLayer.on('click', (e) => {
        if (mode === 'view') {
          L.DomEvent.stopPropagation(e);
          // Open popup instead of modal
          const popup = e.layer.getPopup();
          if (!popup) {
            e.layer.openPopup(e.latlng);
          }
        }
      });

      routeLayersRef.current.push(routeLayer);
      mapInstance.current.fitBounds(routeLayer.getBounds());

      return routeLayer;
    } catch (error) {
      console.error("Error al calcular la ruta:", error);
    }
  };

  const loadRoutes = async () => {
    try {
      if (!mapInstance.current) return;
      
      routeLayersRef.current.forEach(layer => {
        if (layer && mapInstance.current) {
          layer.off('click');
          mapInstance.current.removeLayer(layer);
        }
      });
      routeLayersRef.current = [];
      
      const response = await fetch(`${API_BASE}/routes`);
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      
      const routesData = await response.json();
      setRoutes(routesData);
      if (onRoutesLoaded) {
        onRoutesLoaded(routesData);
      }
      
      for (const route of routesData) {
        if (route.points && route.points.length >= 2) {
          await drawRoute(route.points, route);
        }
      }
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
    
    if (routePoints.length >= 1) {
      drawRoute([...routePoints, newPoint]);
    }
    
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
      if (!pointData.name || !pointData.description || !clickedPosition) {
        alert("Por favor complete todos los campos requeridos");
        return;
      }
      
      // Validar que los puntos de control tengan nivel de riesgo
      if (pointData.type === 'control' && !pointData.risk) {
        alert("Los puntos de control deben tener un nivel de riesgo");
        return;
      }
      
      const pointPayload = {
        lat: clickedPosition.lat,
        lng: clickedPosition.lng,
        name: pointData.name,
        description: pointData.description,
        type: pointData.type
      };
      
      // Solo agregar riesgo si es punto de control
      if (pointData.type === 'control') {
        pointPayload.risk = parseInt(pointData.risk);
      }
      
      const response = await fetch(`${API_BASE}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pointPayload)
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
        type: 'control',
        risk: '1'
      });
    }
  };


  const handleDeleteNode = async (nodeName) => {
    try {
      if (!window.confirm(`¿Estás seguro de que quieres eliminar el punto "${nodeName}"?`)) {
        return;
      }
  
      const response = await fetch(`${API_BASE}/nodes/${nodeName}`, {
        method: 'DELETE',
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        if (data.in_use) {
          alert(`No se puede eliminar el punto "${nodeName}" porque está siendo utilizado en una o más rutas.`);
        } else {
          throw new Error(data.error || "Error al eliminar");
        }
        return;
      }
  
      if (data.success) {
        loadNodes();
        if (selectedNode && selectedNode.name === nodeName) {
          setSelectedNode(null);
        }
      }
    } catch (error) {
      console.error("Error al eliminar nodo:", error);
      alert(error.message || "Error al eliminar el punto");
    }
  };

  const handleDeleteRoute = async (routeName) => {
    setRouteToDelete(routeName);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRoute = async () => {
    try {
      if (!routeToDelete) return;
      
      const response = await fetch(`${API_BASE}/routes/${routeToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar");
      }

      const data = await response.json();
      if (data.success) {
        loadRoutes();
        setSelectedRoute(null);
      }
    } catch (error) {
      console.error("Error al eliminar ruta:", error);
      alert(error.message || "Error al eliminar la ruta");
    } finally {
      setDeleteConfirmOpen(false);
      setRouteToDelete(null);
    }
  };

  const startSimulation = (routeName) => {
    alert(`La simulación para la ruta "${routeName}" aún no está implementada.`);
  };

  const loadNodes = async () => {
    try {
      if (!mapInstance.current) return;
  
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
        let customIcon;
        
        if (node.type === 'interest') {
          // Icono para puntos de interés (usando un ícono de estrella)
          customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: purple; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                     <span style="color: white; font-size: 12px;">★</span>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
        } else {
          // Icono para puntos de control (con número de riesgo)
          let markerColor;
          switch(node.risk) {
            case 1: markerColor = 'green'; break;
            case 2: markerColor = 'blue'; break;
            case 3: markerColor = 'yellow'; break;
            case 4: markerColor = 'orange'; break;
            case 5: markerColor = 'red'; break;
            default: markerColor = 'blue';
          }
          
          customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                     <span style="color: white; font-size: 10px; font-weight: bold;">${node.risk}</span>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
        }
  
        if (mapInstance.current) {
          const popupContent = `
            <div style="min-width: 200px;">
              <b>${node.name}</b><br>
              ${node.description}<br>
              Tipo: ${node.type === 'control' ? 'Punto de control' : 'Punto de interés'}<br>
              ${node.type === 'control' ? `Riesgo: ${node.risk}<br>` : ''}
              <small>${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</small>
              <div style="margin-top: 10px; text-align: center;">
                <button 
                  onclick="window.dispatchEvent(new CustomEvent('deleteNode', { detail: '${node.name}' }))"
                  style="padding: 5px 10px; background-color: #ef4444; color: white; border-radius: 4px; border: none; cursor: pointer;"
                >
                  Eliminar Punto
                </button>
              </div>
            </div>
          `;
  
          const marker = L.marker([node.lat, node.lng], {icon: customIcon})
            .addTo(mapInstance.current)
            .bindPopup(popupContent);
          
          marker.on('popupopen', () => {
            setSelectedNode(node);
          });
          
          marker.on('popupclose', () => {
            setSelectedNode(null);
          });
          
          markersRef.current.push(marker);
        }
      });
    } catch (error) {
      console.error("Error al cargar nodos:", error);
      alert("No se pudo conectar con el servidor. ¿Está corriendo?");
    }
  };

  // Add event listeners for custom events from popups
  useEffect(() => {
    const handleDeleteNodeEvent = (e) => {
      handleDeleteNode(e.detail);
    };

    const handleDeleteRouteEvent = (e) => {
      handleDeleteRoute(e.detail);
    };

    const handleSimulateRouteEvent = (e) => {
      startSimulation(e.detail);
    };

    window.addEventListener('deleteNode', handleDeleteNodeEvent);
    window.addEventListener('deleteRoute', handleDeleteRouteEvent);
    window.addEventListener('simulateRoute', handleSimulateRouteEvent);
    
    return () => {
      window.removeEventListener('deleteNode', handleDeleteNodeEvent);
      window.removeEventListener('deleteRoute', handleDeleteRouteEvent);
      window.removeEventListener('simulateRoute', handleSimulateRouteEvent);
    };
  }, []);

  return (
    <>
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
      
      {/* Modal para agregar punto */}
      <PointModal 
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMode('view');
        }}
        onSubmit={handleAddPoint}
        disableSubmit={!pointData.name || !pointData.description || !clickedPosition || 
                      (pointData.type === 'control' && !pointData.risk)}
      >
        <h2 className="text-xl font-bold mb-4">Añadir nuevo punto</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de punto</label>
            <select
              className="w-full p-2 border rounded"
              value={pointData.type}
              onChange={(e) => setPointData({...pointData, type: e.target.value, risk: e.target.value === 'control' ? pointData.risk : ''})}
              required
            >
              <option value="control">Punto de control</option>
              <option value="interest">Punto de interés</option>
            </select>
          </div>
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
          {pointData.type === 'control' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Nivel de riesgo (1-5)</label>
              <select
                className="w-full p-2 border rounded"
                value={pointData.risk}
                onChange={(e) => setPointData({...pointData, risk: e.target.value})}
                required={pointData.type === 'control'}
              >
                <option value="1">1 - Muy bajo</option>
                <option value="2">2 - Bajo</option>
                <option value="3">3 - Medio</option>
                <option value="4">4 - Alto</option>
                <option value="5">5 - Muy alto</option>
              </select>
            </div>
          )}
          <div className="text-sm text-gray-500">
            <p>Coordenadas:</p>
            <p>Latitud: {clickedPosition?.lat.toFixed(6)}</p>
            <p>Longitud: {clickedPosition?.lng.toFixed(6)}</p>
          </div>
        </div>
      </PointModal>

      {/* Modal de confirmación para eliminar ruta */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRouteToDelete(null);
        }}
        onSubmit={confirmDeleteRoute}
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Confirmar eliminación</h2>
          <p>¿Estás seguro de que quieres eliminar la ruta "{routeToDelete}"?</p>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteRoute}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default MapView;