// URL base del backend Flask (puede cambiarse si el puerto o la IP cambian)
const API_BASE = 'http://localhost:5000';

let routePoints = [];         // Arreglo para almacenar los dos puntos seleccionados para crear la ruta
let routingControl = null;    // Variable para guardar la instancia de Leaflet Routing Machine

// Inicialización del mapa centrado en una ubicación específica (por ejemplo, Manizales)
const map = L.map('map').setView([5.0703, -75.5138], 13);

// Capa base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Función asíncrona para cargar los nodos almacenados en el backend
async function loadNodes() {
    try {
        // Solicita los nodos al backend
        const response = await fetch(`${API_BASE}/get_nodes`);
        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        // Convierte la respuesta en JSON y los muestra como marcadores en el mapa
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

// Manejador del evento de clic en el mapa
map.on('click', async function(e) {
    // Si no hay más de dos puntos seleccionados para la ruta
    if (routePoints.length < 2) {
        // Guarda el punto en el array y lo muestra como marcador
        routePoints.push(e.latlng);
        L.marker(e.latlng).addTo(map).bindPopup(`Punto ${routePoints.length}`).openPopup();

        // Cuando ya hay dos puntos, se genera la ruta
        if (routePoints.length === 2) {
            // Si ya hay una ruta anterior, se elimina del mapa
            if (routingControl) {
                map.removeControl(routingControl);
            }

            // Crea y muestra una nueva ruta entre los dos puntos usando Leaflet Routing Machine
            routingControl = L.Routing.control({
                waypoints: routePoints,           // Los puntos seleccionados
                routeWhileDragging: false,        // No permite modificar la ruta arrastrando
                show: false                        // Muestra el panel de ruta (puedes poner false si no lo quieres)
            }).addTo(map);

            // Evento que se activa cuando la ruta ha sido calculada
            routingControl.on('routesfound', function(e) {
               /* const route = e.routes[0];
                const distanciaKm = (route.summary.totalDistance / 1000).toFixed(2);
                const duracionMin = (route.summary.totalTime / 60).toFixed(1);
                alert(`Ruta creada:\nDistancia: ${distanciaKm} km\nDuración: ${duracionMin} min`);*/
            });

            // Limpia el array para poder seleccionar nuevos puntos
            routePoints = [];
        }
    }

    // Se pide información para crear un nuevo nodo en el mapa y guardarlo en el backend
    const name = prompt("Nombre del punto:");
    if (!name) return;

    const description = prompt("Descripción:");
    const risk = prompt("Nivel de riesgo (1-5):");

    try {
        // Se envía al backend para guardar el nodo
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
            loadNodes(); // Recarga todos los nodos del backend en el mapa
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar el punto");
    }
});

// Cuando el documento HTML termina de cargar, se ejecuta loadNodes() para mostrar los nodos existentes
document.addEventListener('DOMContentLoaded', loadNodes);
