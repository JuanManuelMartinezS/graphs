import React, { useRef } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

function App() {
  const mapViewRef = useRef();

  const handleAddPoint = () => {
    mapViewRef.current?.setMode('addPoint');
  };

  const handleCreateRoute = () => {
    mapViewRef.current?.setMode('createRoute');
  };

  const handleClearRoute = () => {
    mapViewRef.current?.clearRoute();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        onAddPoint={handleAddPoint}
        onCreateRoute={handleCreateRoute}
      />
      <div className="flex flex-col flex-1">
        <Topbar onClearRoute={handleClearRoute} />
        <div className="flex-1 relative">
          <MapView ref={mapViewRef} />
        </div>
      </div>
    </div>
  );
}

export default App;