import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import { default as React, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

function App() {
  const mapViewRef = useRef();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);

  const handleAddPoint = () => {
    mapViewRef.current?.setMode('addPoint');
  };

  const handleCreateRoute = () => {
    mapViewRef.current?.setMode('createRoute');
  };

  const handleClearRoute = () => {
    mapViewRef.current?.clearRoute();
  };

  const handleRouteSelected = (routeName) => {
    if (mapViewRef.current) {
      mapViewRef.current.showRoutePopup(routeName);
    }
  };

  const handleRoutesLoaded = (loadedRoutes) => {
    setRoutes(loadedRoutes);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        onAddPoint={handleAddPoint}
        onCreateRoute={handleCreateRoute}
        routes={routes}
        onRouteSelected={handleRouteSelected}
      />
      <div className="flex flex-col flex-1">
        <Topbar onClearRoute={handleClearRoute} />
        <div className="flex-1 relative">
          <MapView 
            ref={mapViewRef} 
            onRoutesLoaded={handleRoutesLoaded}
          />
        </div>
      </div>
    </div>
  );
}

export default App;