import React, { useState } from 'react';
import RutaPersonalizada from '../sugerenciasRutas/RutaPersonalizada';
import ModalRutasPersonalizadas from '../sugerenciasRutas/RutasPersonalizadas';

function Sidebar({ 
  mapViewRef, 
  onAddPoint, 
  onCreateRoute,

  routes, 
  onRouteSelected 
}) {
  const [showRutaPersonalizada, setShowRutaPersonalizada] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showExperienciaSelect, setShowExperienciaSelect] = useState(false);
  const [selectedExperiencia, setSelectedExperiencia] = useState(null);
  const [showModalPersonalizada, setShowModalPersonalizada] = useState(false);
  const [showModalPersonalizada2, setShowModalPersonalizada2] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);


  const handleMinimumDistances = async () => {
    try {
      // Obtener nodos de interés
      const response = await fetch('http://localhost:5000/nodes');
      if (!response.ok) throw new Error("Error al obtener nodos");
      const allNodes = await response.json();
      const interestNodes = allNodes.filter(node => node.type === 'interest');
      
      if (interestNodes.length === 0) {
        alert('No hay puntos de interés en el mapa');
        return;
      }
      
      // Crear modal para seleccionar el punto de interés
      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; width: 300px;';
      
      const title = document.createElement('h3');
      title.textContent = 'Seleccionar Punto de Interés';
      title.style.marginTop = '0';
      modalContent.appendChild(title);
      
      const select = document.createElement('select');
      select.style.cssText = 'width: 100%; padding: 8px; margin: 10px 0;';
      
      interestNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.name;
        option.textContent = node.name;
        select.appendChild(option);
      });
      
      modalContent.appendChild(select);
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 15px;';
      
      const okButton = document.createElement('button');
      okButton.textContent = 'Aceptar';
      okButton.style.cssText = 'padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancelar';
      cancelButton.style.cssText = 'padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';
      
      buttonContainer.appendChild(okButton);
      buttonContainer.appendChild(cancelButton);
      modalContent.appendChild(buttonContainer);
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Manejar eventos
      okButton.addEventListener('click', () => {
        const selectedNode = select.value;
        if (mapViewRef.current) {
          mapViewRef.current.showMinimumDistances(selectedNode);
          setShowClearButton(true); // <-- Mostrar botón al activar
        }
        modal.remove();
      });
      
      cancelButton.addEventListener('click', () => {
        modal.remove();
      });
      
    } catch (error) {
      console.error("Error al seleccionar punto de interés:", error);
      alert(`Error: ${error.message}`);
    }
  };

  
  const handleClearDistances = () => {
    if (mapViewRef.current) {
      mapViewRef.current.clearDistanceRoutes();
      setShowClearButton(false); // <-- Ocultar botón al limpiar
    }
  };

  const handleSubmitRutaPersonalizada2 = async (filtros) => {
    try {
      const response = await fetch('http://localhost:5000/routes/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filtros)
      });

      const rutasSugeridas = await response.json();
      console.log("Rutas sugeridas:", rutasSugeridas);
      
      if (rutasSugeridas && rutasSugeridas.length > 0) {
        handleRouteSelected(rutasSugeridas[0].name);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleRouteSelected = (routeName) => {
    const route = routes.find(r => r.name === routeName);
    if (route) {
      setSelectedRoute(route);
      onRouteSelected(routeName);
    }
  };

  const handleExperienciaSelect = (nivel) => {
    setSelectedExperiencia(nivel);
    setShowExperienciaSelect(false);

    const rutasConDiferencia = routes.map(route => ({
      ...route,
      diferencia: Math.abs(route.difficulty - nivel)
    }));

    const rutaRecomendada = [...rutasConDiferencia].sort((a, b) => a.diferencia - b.diferencia)[0];

    if (rutaRecomendada) {
      handleRouteSelected(rutaRecomendada.name);
    } else {
      alert("No se encontraron rutas con el nivel de dificultad seleccionado");
    }
  };

  const handleRutaMenosPeligrosa = () => {
    if (routes.length === 0) {
      alert("No hay rutas disponibles");
      return;
    }

    const rutasOrdenadasPorRiesgo = [...routes].sort((a, b) => a.risk - b.risk);
    const rutaMenosPeligrosa = rutasOrdenadasPorRiesgo[0];

    if (rutaMenosPeligrosa) {
      handleRouteSelected(rutaMenosPeligrosa.name);
      alert(`Ruta menos peligrosa seleccionada: ${rutaMenosPeligrosa.name} (Riesgo: ${rutaMenosPeligrosa.risk})`);
    } else {
      alert("No se pudo determinar la ruta menos peligrosa");
    }
  };

  return (
<div className="w-64 bg-gray-700 text-white p-4 flex flex-col h-full">
  {/* Contenedor principal para los botones superiores con espacio aumentado */}
  <div className="space-y-4 mb-4 overflow-y-auto">
    <div className="relative">
      <button
        className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
        onClick={() => setShowExperienciaSelect(!showExperienciaSelect)}
      >
        Ruta según experiencia
      </button>

      {showExperienciaSelect && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded shadow-lg">
          <select
            className="w-full p-2 text-gray-800 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => handleExperienciaSelect(parseInt(e.target.value))}
            value={selectedExperiencia || ''}
          >
            <option value="" disabled>Selecciona tu nivel</option>
            <option value="1">1 - Principiante</option>
            <option value="2">2 - Básico</option>
            <option value="3">3 - Intermedio</option>
            <option value="4">4 - Avanzado</option>
            <option value="5">5 - Experto</option>
          </select>
        </div>
      )}
    </div>

    <button
      className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
      onClick={handleRutaMenosPeligrosa}
    >
      Ruta menos peligrosa
    </button>

    <button
      className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
      onClick={() => setShowRutaPersonalizada(true)}
    >
      Ruta personalizada
    </button>

    <button 
      className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
      onClick={() => setShowModalPersonalizada2(true)}
    >
      Rutas personalizadas
    </button>

    <button 
        className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
        onClick={handleMinimumDistances}
      >
        Recomendar distancias mínimas
    </button>

    {/* Botón de limpiar distancias (condicional) */}
    {/* Botón de limpiar (condicional) */}
      {showClearButton && (
        <div className="mt-auto pt-4 border-t border-gray-600">
          <button
            className="w-full bg-yellow-500 hover:bg-yellow-600 p-2 rounded transition"
            onClick={handleClearDistances}
          >
            Limpiar distancias
          </button>
        </div>
      )}
  </div>

  {/* Botón "Añadir punto" fijo en la parte inferior con color morado */}
  <div className="mt-auto pt-4 border-t border-gray-600">
    <button
      className="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded transition"
      onClick={onAddPoint}
    >
      Añadir punto
    </button>
  </div>

  <RutaPersonalizada
    isOpen={showRutaPersonalizada}
    onClose={() => setShowRutaPersonalizada(false)}
    routes={routes}
    onRouteSelected={handleRouteSelected}
  />
  
  <ModalRutasPersonalizadas
    isOpen={showModalPersonalizada2}
    onClose={() => setShowModalPersonalizada2(false)}
    onSubmit={handleSubmitRutaPersonalizada2}
    routes={routes}
  />
</div>
  );
}

export default Sidebar;