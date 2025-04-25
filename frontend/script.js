const API_BASE = 'http://localhost:5000';  // Cambia si es necesario

let routePoints = [];
let routingControl = null;

// Configuración del mapa
const map = L.map('map').setView([5.0703, -75.5138], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Función para cargar nodos
async function loadNodes() {
    try {
        const response = await fetch(`${API_BASE}/get_nodes`);
        if (!response.ok) throw new Error("Error en la respuesta del servidor");
        
        const nodes = await response.json();
        nodes.forEach(node => {
            L.marker([node.lat, node.lng])
                .addTo(map)
                .bindPopup(`<b>${node.name}</b><br>${node.description}<br>Riesgo: ${node.risk}`);
        });
    } catch (error) {
        console.error("Error al cargar nodos:", error);
        alert("No se pudo conectar con el servidor. ¿Está corriendo?");
    }
}

// Manejador de clics
map.on('click', async function(e) {

    if (routePoints.length < 2) {
        // Guardar el punto para la ruta
        routePoints.push(e.latlng);
        L.marker(e.latlng).addTo(map).bindPopup(`Punto ${routePoints.length}`).openPopup();

        if (routePoints.length === 2) {
            // Si ya hay dos puntos, crear la ruta
            if (routingControl) {
                map.removeControl(routingControl);
            }

            routingControl = L.Routing.control({
                waypoints: routePoints,
                routeWhileDragging: false,
                show: true
            }).addTo(map);

            // Reiniciar los puntos para permitir otra ruta
            routingControl.on('routesfound', function(e) {
                const route = e.routes[0];
                const distanciaKm = (route.summary.totalDistance / 1000).toFixed(2);
                const duracionMin = (route.summary.totalTime / 60).toFixed(1);
                alert(`Ruta creada:\nDistancia: ${distanciaKm} km\nDuración: ${duracionMin} min`);
            });

            routePoints = [];
        }
    }

    const name = prompt("Nombre del punto:");
    if (!name) return;
    
    const description = prompt("Descripción:");
    const risk = prompt("Nivel de riesgo (1-5):");
    
    try {
        const response = await fetch(`${API_BASE}/add_node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                name: name,
                description: description,
                risk: parseInt(risk)
            })
        });
        
        if (!response.ok) throw new Error("Error al guardar");
        
        const result = await response.json();
        if (result.success) {
            alert("Punto guardado!");
            loadNodes();  // Recargar puntos
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar el punto");
    }
});

// Cargar nodos al iniciar
document.addEventListener('DOMContentLoaded', loadNodes);