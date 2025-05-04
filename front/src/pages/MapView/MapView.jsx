

import 'leaflet/dist/leaflet.css';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import SimulationController from '../../components/SimulationController';
import Modal from '../../components/ui/Modal';
import PointModal from '../../components/ui/Nodes/NodeModal';
import {
    cleanupMap,
    clearMapDistanceRoutes,
    getApiBaseUrl,
    getOpenRouteApiKey,
    handleSimulateRoute,
    initializeMap,
    setupMapEventHandlers,
    setupTimeEstimationHandlers,
    showMapMinimumDistances
} from './MapLogic';
import {
    handleAddPoint,
    handleDeleteNode,
    loadMapNodes
} from './NodeManager';
import {
    handleCreateRouteClick,
    handleDeleteRoute,
    highlightRoute,
    loadMapRoutes,
    showRoutePopup,
    showRouteWithColor
} from './RouteManager';

const MapView = forwardRef(({onRoutesLoaded = () => { } }, ref) => {
  // Referencias
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const simulationManagerRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayersRef = useRef([]);
  
  // Estado de elementos de distancia
  const distanceElementsRef = useRef({
    routes: [],
    markers: [],
    legend: null
  });
  
  // Estados para UI y datos
  const [routePoints, setRoutePoints] = useState([]);
  const [mode, setMode] = useState('view');
  const [clickedPosition, setClickedPosition] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pointData, setPointData] = useState({
    name: '',
    description: '',
    type: 'control',
    risk: '1'
  });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

  // Constantes
  const API_BASE = getApiBaseUrl();
  const OPENROUTE_API_KEY = getOpenRouteApiKey();

  // Métodos expuestos
  useImperativeHandle(ref, () => ({
    setMode: (newMode) => setMode(newMode),
    getMapInstance: () => mapInstance.current,
    clearRoute: () => {
      setRoutePoints([]);
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    },
    
    clearHighlightedRoutes: () => {
      routeLayersRef.current.forEach(layer => {
        if (layer && mapInstance.current) {
          if (layer.highlighted) {
            // Eliminar completamente la capa del mapa
            mapInstance.current.removeLayer(layer);
          } else {
            // Restablecer estilo si no está resaltada
            layer.setStyle({ 
              color: '#0066ff',
              weight: 5,
              opacity: 0.8
            });
            if (layer.isPopupOpen()) {
              layer.closePopup();
            }
          }
        }
      });
      // Filtrar para mantener solo las capas no resaltadas
      routeLayersRef.current = routeLayersRef.current.filter(layer => !layer?.highlighted);
    },
    
    showRouteWithColor: (routeName, color) => {
      showRouteWithColor(routeLayersRef.current, routeName, color, mapInstance.current);
    },
    
    highlightRoute: (route) => {
      highlightRoute(routeLayersRef.current, route, mapInstance.current);
    },
    
    showRoutePopup: (routeName) => {
      showRoutePopup(routeLayersRef.current, routeName, mapInstance.current);
    },
    
    showMinimumDistances: async (startNodeName) => {
      try {
        const elements = await showMapMinimumDistances(
          mapInstance.current, 
          startNodeName, 
          distanceElementsRef.current
        );
        distanceElementsRef.current = elements;
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    },
    
    clearDistanceRoutes: () => {
      distanceElementsRef.current = clearMapDistanceRoutes(
        mapInstance.current, 
        distanceElementsRef.current
      );
      return { routes: [], markers: [], legend: null };
    },
  }));

  // Inicialización del mapa
  useEffect(() => {

    if (mapRef.current && !mapInstance.current) {
      const { map, simulationManager } = initializeMap(mapRef.current);
      mapInstance.current = map;
      simulationManagerRef.current = simulationManager;

      
      loadMapNodes(map, markersRef.current, API_BASE, setSelectedNode);
      loadMapRoutes(map, routeLayersRef.current, API_BASE, OPENROUTE_API_KEY, setRoutes, onRoutesLoaded);
    }

    return () => {
      cleanupMap(mapInstance.current, simulationManagerRef.current);
      mapInstance.current = null;
      simulationManagerRef.current = null;
    };
  }, []);

  // Manejador de clics en el mapa
  const handleMapClick = (e) => {
    if (mode === 'addPoint') {
      setClickedPosition(e.latlng);
      setModalOpen(true);
    } else if (mode === 'createRoute') {
      handleCreateRouteClick(
        e, 
        mapInstance.current, 
        routePoints, 
        setRoutePoints, 
        markersRef.current, 
        OPENROUTE_API_KEY
      );
    }
  };

  // Configuración de eventos del mapa
  useEffect(() => {
    if (!mapInstance.current) return;
    
    const cleanupMapEvents = setupMapEventHandlers(mapInstance.current, handleMapClick);
    const cleanupTimeEstimation = setupTimeEstimationHandlers(routeLayersRef.current);
    
    return () => {
      cleanupMapEvents();
      cleanupTimeEstimation();
    };
  }, [mode]);

  // Efectos UI
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current.invalidateSize(), 300);
    }
  }, [modalOpen, deleteConfirmOpen]);

  // Manejo de puntos
  const onAddPoint = async () => {
    const success = await handleAddPoint(
      pointData, 
      clickedPosition, 
      API_BASE, 
      () => {
        loadMapNodes(mapInstance.current, markersRef.current, API_BASE, setSelectedNode);
        setMode('view');
      }
    );
    
    if (success) {
      setModalOpen(false);
      setPointData({
        name: '',
        description: '',
        type: 'control',
        risk: '1'
      });
    }
  };

  // Confirmación de eliminación de ruta
  const confirmDeleteRoute = async () => {
    try {
      if (!routeToDelete) return;
      
      const success = await handleDeleteRoute(
        routeToDelete, 
        API_BASE, 
        () => {
          loadMapRoutes(
            mapInstance.current, 
            routeLayersRef.current, 
            API_BASE, 
            OPENROUTE_API_KEY, 
            setRoutes, 
            onRoutesLoaded
          );
        },
        selectedRoute,
        setSelectedRoute
      );
      
      if (success) {
        setDeleteConfirmOpen(false);
        setRouteToDelete(null);
      }
    } catch (error) {
      alert(error.message || "Error al eliminar la ruta");
      setDeleteConfirmOpen(false);
      setRouteToDelete(null);
    }
  };

  // Manejador de simulación de rutas
  const onSimulateRoute = (eventData) => {
    handleSimulateRoute(
      simulationManagerRef.current, 
      routeLayersRef.current, 
      eventData
    );
  };

  // Eventos globales
  useEffect(() => {
    const handleDeleteNodeEvent = (e) => handleDeleteNode(
      e.detail, 
      API_BASE, 
      () => loadMapNodes(mapInstance.current, markersRef.current, API_BASE, setSelectedNode),
      selectedNode, 
      setSelectedNode
    );
    
    const handleDeleteRouteEvent = (e) => {
      setRouteToDelete(e.detail);
      setDeleteConfirmOpen(true);
    };
    
    const handleSimulateRouteEvent = (e) => onSimulateRoute(e.detail);

    window.addEventListener('deleteNode', handleDeleteNodeEvent);
    window.addEventListener('deleteRoute', handleDeleteRouteEvent);
    window.addEventListener('simulateRoute', handleSimulateRouteEvent);

    return () => {
      window.removeEventListener('deleteNode', handleDeleteNodeEvent);
      window.removeEventListener('deleteRoute', handleDeleteRouteEvent);
      window.removeEventListener('simulateRoute', handleSimulateRouteEvent);
    };
  }, [selectedNode]);

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

      <PointModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMode('view');
        }}
        onSubmit={onAddPoint}
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
              onChange={(e) => setPointData({ ...pointData, type: e.target.value, risk: e.target.value === 'control' ? pointData.risk : '' })}
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
              onChange={(e) => setPointData({ ...pointData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              className="w-full p-2 border rounded"
              value={pointData.description}
              onChange={(e) => setPointData({ ...pointData, description: e.target.value })}
              required
            />
          </div>
          {pointData.type === 'control' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Nivel de riesgo (1-5)</label>
              <select
                className="w-full p-2 border rounded"
                value={pointData.risk}
                onChange={(e) => setPointData({ ...pointData, risk: e.target.value })}
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

      <SimulationController simulationManager={simulationManagerRef.current} />
      </>
  );
});

export default MapView;