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

/**
 * Componente principal que renderiza y gestiona el mapa interactivo
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Function} [props.onRoutesLoaded] - Callback cuando se cargan las rutas
 * @param {React.Ref} ref - Referencia para acceder a métodos públicos
 * @returns {React.Element} Componente del mapa
 * 
 * @example
 * // Uso básico
 * const mapRef = useRef();
 * <MapView ref={mapRef} onRoutesLoaded={() => console.log('Rutas cargadas')} />
 */
const MapView = forwardRef(({ onRoutesLoaded = () => {} }, ref) => {
  // Referencias del componente
  const mapRef = useRef(null); // Referencia al contenedor del mapa DOM
  
  /**
   * Referencia a la instancia del mapa Leaflet
   * @type {React.MutableRefObject<L.Map|null>}
   * @description
   * - Se inicializa en el useEffect con initializeMap(mapRef.current)
   * - Permite acceder y manipular el mapa desde cualquier parte del componente
   * - Se usa para añadir/remover capas, manejar eventos, etc.
   * - Es expuesta a componentes padre mediante useImperativeHandle
   */
  const mapInstance = useRef(null);
  
  const simulationManagerRef = useRef(null); // Referencia al controlador de simulación
  
  /**
   * Referencia a los marcadores (nodos) del mapa
   * @type {React.MutableRefObject<L.Marker[]>}
   * @description
   * Propósito: Almacena un array de todos los marcadores (nodos) mostrados en el mapa.
   * Características:
   * - Cada marcador es una instancia de L.Marker de Leaflet
   * - Se actualiza con loadMapNodes() cuando se cargan los nodos
   * Permite:
   * - Limpiar marcadores existentes (markersRef.current.forEach(marker => marker.remove()))
   * - Acceder a marcadores específicos
   * - Mantener un registro de todos los marcadores para su gestión
   */
  const markersRef = useRef([]);
  
  /**
   * Referencia a las capas de ruta del mapa
   * @type {React.MutableRefObject<L.Layer[]>}
   * @description
   * Propósito: Almacena un array de todas las capas de ruta (líneas) mostradas en el mapa.
   * Características:
   * - Cada capa es una instancia de L.GeoJSON o similar de Leaflet
   * - Se actualiza con loadMapRoutes() cuando se cargan las rutas
   * Permite:
   * - Manipular rutas específicas (resaltar, cambiar color, etc.)
   * - Limpiar rutas cuando es necesario
   * - Mantener un registro de todas las rutas para su gestión
   */
  const routeLayersRef = useRef([]);
  
  // Estado de elementos de distancia
  const distanceElementsRef = useRef({
    routes: [],    // Rutas de distancia calculadas
    markers: [],   // Marcadores de distancia
    legend: null   // Leyenda de distancias
  });
  
  // Estados para UI y datos
  const [routePoints, setRoutePoints] = useState([]);        // Puntos seleccionados para crear ruta
  const [mode, setMode] = useState('view');                 // Modo actual (view, addPoint, createRoute)
  const [clickedPosition, setClickedPosition] = useState(null); // Posición clickeada en el mapa
  const [modalOpen, setModalOpen] = useState(false);        // Estado del modal de punto
  const [pointData, setPointData] = useState({              // Datos del punto a crear
    name: '',
    description: '',
    type: 'control',
    risk: '1'
  });
  const [selectedRoute, setSelectedRoute] = useState(null);  // Ruta seleccionada
  const [selectedNode, setSelectedNode] = useState(null);    // Nodo seleccionado
  const [routes, setRoutes] = useState([]);                 // Lista de rutas cargadas
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // Confirmación de eliminación
  const [routeToDelete, setRouteToDelete] = useState(null);  // Ruta a eliminar

  // Constantes de configuración
  const API_BASE = getApiBaseUrl();
  const OPENROUTE_API_KEY = getOpenRouteApiKey();

  /**
   * Expone métodos públicos al componente padre
   * @type {Object}
   * @property {Function} setMode - Cambia el modo de interacción
   * @property {Function} getMapInstance - Obtiene la instancia del mapa
   * @property {Function} clearRoute - Limpia la ruta en creación
   * @property {Function} clearHighlightedRoutes - Limpia rutas resaltadas
   * @property {Function} showRouteWithColor - Muestra ruta con color específico
   * @property {Function} highlightRoute - Resalta una ruta específica
   * @property {Function} showRoutePopup - Muestra popup de ruta
   * @property {Function} showMinimumDistances - Calcula y muestra distancias mínimas
   * @property {Function} clearDistanceRoutes - Limpia rutas de distancia
   */
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
            mapInstance.current.removeLayer(layer);
          } else {
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

  /**
   * Efecto de inicialización del mapa
   * @description
   * - Crea el mapa en el contenedor referenciado por mapRef
   * - Almacena la instancia del mapa en mapInstance
   * - Carga nodos y rutas iniciales, actualizando markersRef y routeLayersRef
   * - Realiza limpieza al desmontar el componente
   */
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

  /**
   * Manejador de clics en el mapa
   * @param {L.LeafletMouseEvent} e - Evento de click de Leaflet
   * @description
   * Según el modo actual:
   * - 'addPoint': Abre modal para añadir nuevo punto
   * - 'createRoute': Añade punto a la ruta en creación
   */
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

  /**
   * Configuración de eventos del mapa
   * @description
   * - Establece manejadores de eventos según el modo actual
   * - Configura estimación de tiempo para rutas
   * - Limpia eventos al desmontar o cambiar modo
   */
  useEffect(() => {
    if (!mapInstance.current) return;
    
    const cleanupMapEvents = setupMapEventHandlers(mapInstance.current, handleMapClick);
    const cleanupTimeEstimation = setupTimeEstimationHandlers(routeLayersRef.current);
    
    return () => {
      cleanupMapEvents();
      cleanupTimeEstimation();
    };
  }, [mode]);

  // Efecto para redimensionar el mapa cuando cambian modales
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current.invalidateSize(), 300);
    }
  }, [modalOpen, deleteConfirmOpen]);

  /**
   * Maneja la adición de un nuevo punto
   * @async
   * @description
   * - Envía datos del punto al servidor
   * - Recarga nodos si es exitoso
   * - Cierra modal y restablece estado
   */
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

  /**
   * Confirma la eliminación de una ruta
   * @async
   * @description
   * - Elimina la ruta del servidor
   * - Recarga rutas si es exitoso
   * - Cierra modal de confirmación
   */
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

  /**
   * Maneja la simulación de rutas
   * @param {Object} eventData - Datos de simulación
   */
  const onSimulateRoute = (eventData) => {
    handleSimulateRoute(
      simulationManagerRef.current, 
      routeLayersRef.current, 
      eventData
    );
  };

  /**
   * Configuración de eventos globales
   * @description
   * - Escucha eventos personalizados para eliminar nodos/rutas
   * - Escucha eventos de simulación
   */
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
      {/* Barra de estado del modo actual */}
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

      {/* Contenedor del mapa */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Modal para añadir punto */}
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

      {/* Controlador de simulación */}
      <SimulationController simulationManager={simulationManagerRef.current} />
    </>
  );
});

export default MapView;