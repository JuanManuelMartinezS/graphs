/**
 * Componente Sidebar - Barra lateral que proporciona funcionalidades para:
 * - Selección y gestión de rutas
 * - Creación de puntos y rutas
 * - Visualización de rutas personalizadas
 * - Cálculo de distancias mínimas
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.mapViewRef - Referencia al componente MapView
 * @param {Function} props.onAddPoint - Manejador para añadir puntos
 * @param {Function} props.onCreateRoute - Manejador para crear rutas
 * @param {Array} props.routes - Lista de rutas disponibles
 * @param {Function} props.onRouteSelected - Manejador para selección de rutas
 */
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
  // Estados del componente
  const [showRutaPersonalizada, setShowRutaPersonalizada] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showExperienciaSelect, setShowExperienciaSelect] = useState(false);
  const [selectedExperiencia, setSelectedExperiencia] = useState(null);
  const [showModalPersonalizada2, setShowModalPersonalizada2] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const [showClearRoutesButton, setShowClearRoutesButton] = useState(false);

  /**
<<<<<<< HEAD
   * Maneja la selección de distancias mínimas mostrando un modal para seleccionar punto de interés
=======
   * Maneja el cálculo de distancias mínimas desde un punto de interés
   * @async
   * @description
   * - Obtiene nodos de interés desde el backend
   * - Muestra modal personalizado para selección
   * - Calcula y muestra distancias mínimas al seleccionar
   * - Habilita botón de limpieza
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleMinimumDistances = async () => {
    try {
      // Obtener nodos de interés desde el backend
      const response = await fetch('http://localhost:5000/nodes');
      if (!response.ok) throw new Error("Error al obtener nodos");
      const allNodes = await response.json();
      const interestNodes = allNodes.filter(node => node.type === 'interest');
      
      if (interestNodes.length === 0) {
        alert('No hay puntos de interés en el mapa');
        return;
      }
      
      // Crear modal dinámico para selección
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background-color: rgba(0,0,0,0.5); 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        z-index: 1000;
      `;
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white; 
        padding: 20px; 
        border-radius: 8px; 
        width: 300px;
      `;
      
      // Configuración del modal
      const title = document.createElement('h3');
      title.textContent = 'Seleccionar Punto de Interés';
      title.style.marginTop = '0';
      modalContent.appendChild(title);
      
      const select = document.createElement('select');
      select.style.cssText = 'width: 100%; padding: 8px; margin: 10px 0;';
      
      // Llenar select con nodos de interés
      interestNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.name;
        option.textContent = node.name;
        select.appendChild(option);
      });
      
      modalContent.appendChild(select);
      
      // Botones del modal
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; justify-content: space-between; margin-top: 15px;';
      
      const okButton = document.createElement('button');
      okButton.textContent = 'Aceptar';
      okButton.style.cssText = `
        padding: 8px 15px; 
        background: #4CAF50; 
        color: white; 
        border: none; 
        border-radius: 4px; 
        cursor: pointer;
      `;
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancelar';
      cancelButton.style.cssText = `
        padding: 8px 15px; 
        background: #f44336; 
        color: white; 
        border: none; 
        border-radius: 4px; 
        cursor: pointer;
      `;
      
      buttonContainer.appendChild(okButton);
      buttonContainer.appendChild(cancelButton);
      modalContent.appendChild(buttonContainer);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Manejadores de eventos
      okButton.addEventListener('click', () => {
        const selectedNode = select.value;
        if (mapViewRef.current) {
          mapViewRef.current.showMinimumDistances(selectedNode);
          setShowClearButton(true);
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

  /**
   * Limpia las distancias mostradas en el mapa
<<<<<<< HEAD
=======
   * @description
   * - Llama al método clearDistanceRoutes del MapView
   * - Oculta el botón de limpieza
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleClearDistances = () => {
    if (mapViewRef.current) {
      mapViewRef.current.clearDistanceRoutes();
      setShowClearButton(false);
    }
  };

  /**
<<<<<<< HEAD
   * Maneja el envío de rutas personalizadas con colores específicos
   * @param {Array} rutasConColores - Array de rutas con sus colores asignados
=======
   * Maneja el envío de rutas personalizadas con colores
   * @async
   * @param {Array} rutasConColores - Rutas con sus colores asignados
   * @description
   * - Limpia rutas resaltadas anteriores
   * - Muestra cada ruta con su color correspondiente
   * - Habilita botón de limpieza
   * - Muestra popup de la primera ruta
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleSubmitRutaPersonalizada2 = async (rutasConColores) => {
    try {
      if (!mapViewRef.current) return;
      
      // Limpiar rutas anteriores
      mapViewRef.current.clearHighlightedRoutes();
      
      if (!rutasConColores || rutasConColores.length === 0){
        setShowClearRoutesButton(false);
        return;
      } 
  
      // Mostrar rutas con colores personalizados
      rutasConColores.forEach(ruta => {
        mapViewRef.current.showRouteWithColor(ruta.name, ruta.color);
      });
  
      setShowClearRoutesButton(true);
      
      // Mostrar popup de la primera ruta
      if (rutasConColores.length > 0) {
        mapViewRef.current.showRoutePopup(rutasConColores[0].name);
      }
    } catch (error) {
      console.error("Error al mostrar rutas personalizadas:", error);
    }
  };

  /**
<<<<<<< HEAD
   * Limpia las rutas personalizadas del mapa
=======
   * Limpia las rutas personalizadas resaltadas
   * @description
   * - Llama al método clearHighlightedRoutes del MapView
   * - Oculta el botón de limpieza
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleClearCustomRoutes = () => {
    if (mapViewRef.current) {
      mapViewRef.current.clearHighlightedRoutes();
      setShowClearRoutesButton(false);
    }
  };

  /**
   * Maneja la selección de una ruta
   * @param {string} routeName - Nombre de la ruta seleccionada
<<<<<<< HEAD
=======
   * @description
   * - Busca la ruta en la lista de rutas disponibles
   * - Actualiza el estado de ruta seleccionada
   * - Llama al callback onRouteSelected
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleRouteSelected = (routeName) => {
    const route = routes.find(r => r.name === routeName);
    if (route) {
      setSelectedRoute(route);
      onRouteSelected(routeName);
    }
  };

  /**
<<<<<<< HEAD
   * Maneja la selección de nivel de experiencia para recomendación de rutas
   * @param {number} nivel - Nivel de experiencia (1-5)
=======
   * Maneja la selección de nivel de experiencia
   * @param {number} nivel - Nivel de experiencia seleccionado (1-5)
   * @description
   * - Calcula la diferencia de dificultad con las rutas disponibles
   * - Selecciona la ruta con menor diferencia
   * - Llama a handleRouteSelected con la ruta recomendada
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleExperienciaSelect = (nivel) => {
    setSelectedExperiencia(nivel);
    setShowExperienciaSelect(false);

    // Calcular diferencia de dificultad
    const rutasConDiferencia = routes.map(route => ({
      ...route,
      diferencia: Math.abs(route.difficulty - nivel)
    }));

    // Obtener ruta más cercana al nivel seleccionado
    const rutaRecomendada = [...rutasConDiferencia].sort((a, b) => a.diferencia - b.diferencia)[0];

    if (rutaRecomendada) {
      handleRouteSelected(rutaRecomendada.name);
    } else {
      alert("No se encontraron rutas con el nivel de dificultad seleccionado");
    }
  };

  /**
<<<<<<< HEAD
   * Selecciona la ruta con menor nivel de riesgo
=======
   * Selecciona la ruta menos peligrosa
   * @description
   * - Ordena rutas por nivel de riesgo
   * - Selecciona la primera ruta (menor riesgo)
   * - Muestra alerta con información de la ruta
   * - Llama a handleRouteSelected con la ruta seleccionada
>>>>>>> be3b3059f34caeed6116eaf1ffac425e8e5f40ba
   */
  const handleRutaMenosPeligrosa = () => {
    if (routes.length === 0) {
      alert("No hay rutas disponibles");
      return;
    }

    // Ordenar rutas por nivel de riesgo
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
      {/* Contenedor principal para los botones superiores */}
      <div className="space-y-4 mb-4 overflow-y-auto">
        {/* Selector de rutas por experiencia */}
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

        {/* Botón para ruta menos peligrosa */}
        <button
          className="w-full bg-blue-500 hover:bg-blue-600 p-2 rounded transition"
          onClick={handleRutaMenosPeligrosa}
        >
          Ruta menos peligrosa
        </button>

        {/* Botones para rutas personalizadas */}
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

      {/* Botón "Añadir punto" fijo en la parte inferior */}
      <div className="mt-auto pt-4 border-t border-gray-600">
        <button
          className="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded transition"
          onClick={onAddPoint}
        >
          Añadir punto
        </button>
      </div>

      {/* Componentes modales */}
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
        mapViewRef={mapViewRef}
      />
      
      {/* Botón de limpiar rutas personalizadas (condicional) */}
      {showClearRoutesButton && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <button
            className="w-full bg-red-500 hover:bg-red-600 p-2 rounded transition"
            onClick={handleClearCustomRoutes}
          >
            Limpiar rutas personalizadas
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;