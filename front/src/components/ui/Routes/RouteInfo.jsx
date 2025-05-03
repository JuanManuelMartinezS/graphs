  export const createRoutePopupContent = (routeData) => {
    return `
<div style="min-width: 250px; font-family: Arial, sans-serif; background-color: #f8f9fa; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <div style="border-bottom: 1px solid #dee2e6; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; color: #2c3e50;">${routeData.name}</h2>
        <p style="margin: 5px 0 0; color: #7f8c8d; font-size: 0.9em;">${routeData.description || 'Sin descripción'}</p>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: bold;">Distancia:</span>
        <span>${(routeData.distance / 1000).toFixed(2)} km</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: bold;">Duración estimada:</span>
        <span>${routeData.estimatedTime} minutos</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: bold;">Puntos de interés:</span>
        <span>${routeData.points.filter(p => p.type === 'interest').length}</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: bold;">Puntos de control:</span>
        <span>${routeData.points.filter(p => p.type === 'control').length}</span>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: bold;">Nivel de riesgo:</span>
        <span>
            ${routeData.risk.toFixed(1)} 
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${ 
                routeData.risk < 2 ? '#4CAF50' : 
                routeData.risk < 3 ? '#FFC107' : 
                routeData.risk < 4 ? '#FF9800' : '#F44336'
            }; margin-left: 5px;"></span>
        </span>
    </div>
    
     <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: bold;">Dificultad:</span>
        <span>
            ${'<span style="color: #FFD700;">★</span>'.repeat(routeData.difficulty) + 
              '<span style="color: #cccccc;">☆</span>'.repeat(5 - routeData.difficulty)}
        </span>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <span style="font-weight: bold;">Popularidad:</span>
        <span>
            ${'<span style="color: #FFD700;">★</span>'.repeat(routeData.popularity) + 
              '<span style="color: #cccccc;">☆</span>'.repeat(5 - routeData.popularity)}
        </span>
    </div>
    
    <div style="margin-top: 15px; background-color: #e9ecef; padding: 10px; border-radius: 5px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Velocidad de simulación (km/h):</label>
        <input 
            type="number" 
            id="simulationSpeed" 
            min="5" 
            max="100" 
            value="15" 
            style="width: 100%; padding: 5px; border: 1px solid #ced4da; border-radius: 4px;"
        >
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-top: 15px; gap: 10px;">
        <button 
            onclick="window.dispatchEvent(new CustomEvent('simulateRoute', { detail: { routeName: '${routeData.name}', speed: document.getElementById('simulationSpeed').value } }))"
            style="flex: 1; padding: 8px; background-color: #4CAF50; color: white; border-radius: 4px; border: none; cursor: pointer; font-weight: bold;"
        >
            Iniciar Simulación
        </button>
        <button 
            onclick="window.dispatchEvent(new CustomEvent('deleteRoute', { detail: '${routeData.name}' }))"
            style="flex: 1; padding: 8px; background-color: #ef4444; color: white; border-radius: 4px; border: none; cursor: pointer; font-weight: bold;"
        >
            Eliminar
        </button>
    </div>
    
    <div style="margin-top: 10px; text-align: right;">
        <small style="color: #95a5a6; font-size: 0.8em;">
            Creada: ${new Date(routeData.created_at).toLocaleDateString()}
        </small>
    </div>
</div>
    `;
  };
