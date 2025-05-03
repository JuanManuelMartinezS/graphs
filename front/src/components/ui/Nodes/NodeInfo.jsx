export const createNodeIcon = (node) => {
    if (node.type === 'interest') {
      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: purple; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                 <span style="color: white; font-size: 12px;">★</span>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    }

    const markerColor = {
      1: 'green',
      2: 'blue',
      3: 'yellow',
      4: 'orange',
      5: 'red'
    }[node.risk] || 'blue';

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
               <span style="color: white; font-size: 10px; font-weight: bold;">${node.risk}</span>
             </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

export const createNodePopupContent = (node) => {
    return `
<div style="min-width: 240px; font-family: 'Segoe UI', Arial, sans-serif; 
            border-radius: 8px; padding: 15px; box-shadow: 0 3px 10px rgba(0,0,0,0.15);
            background: ${node.type === 'control' ? '#fff8f8' : '#f8faff'}; 
            border-left: 4px solid ${node.type === 'control' ? '#ef4444' : '#6366f1'};">

    <!-- Encabezado con icono según tipo -->
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; 
                    background: ${node.type === 'control' ? '#ef4444' : '#6366f1'}; 
                    color: white; display: flex; align-items: center; justify-content: center;
                    margin-right: 10px; font-size: 14px;">
            ${node.type === 'control' ? '🛡️' : '⭐'}
        </div>
        <div>
            <h3 style="margin: 0; color: #1f2937; font-size: 18px;">${node.name}</h3>
            <small style="color: #6b7280;">${node.type === 'control' ? 'Punto de control' : 'Punto de interés'}</small>
        </div>
    </div>

    <!-- Descripción -->
    <div style="background: white; padding: 10px; border-radius: 6px; margin-bottom: 12px;
                border: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #4b5563; font-size: 14px;">${node.description || 'Sin descripción'}</p>
    </div>

    <!-- Detalles específicos -->
    <div style="margin-bottom: 12px;">
        ${node.type === 'control' ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #6b7280; font-weight: 500;">Nivel de riesgo:</span>
            <span style="font-weight: bold; color: ${
                node.risk < 2 ? '#10b981' : 
                node.risk < 3 ? '#f59e0b' : 
                node.risk >= 4 ? '#ef4444' : '#f97316'
            };">
                ${node.risk} ${'⚠️'.repeat(Math.min(Math.floor(node.risk), 3))}
            </span>
        </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280; font-weight: 500;">Coordenadas:</span>
            <span style="font-family: monospace; color: #4b5563;">${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}</span>
        </div>
    </div>

    <!-- Pie con fecha y botón -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; 
                justify-content: space-between; align-items: center;">
        <small style="color: #9ca3af;">Creado: ${new Date(node.created_at).toLocaleDateString()}</small>
        <button 
            onclick="window.dispatchEvent(new CustomEvent('deleteNode', { detail: '${node.name}' }))"
            style="padding: 6px 12px; background-color: #ef4444; color: white; 
                   border-radius: 6px; border: none; cursor: pointer; font-size: 13px;
                   display: flex; align-items: center; gap: 5px; transition: all 0.2s;"
            onmouseover="this.style.backgroundColor='#dc2626'" 
            onmouseout="this.style.backgroundColor='#ef4444'"
        >
            🗑️ Eliminar
        </button>
    </div>
</div>
    `;
  };