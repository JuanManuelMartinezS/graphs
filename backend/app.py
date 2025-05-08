from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from grafo import Graph
from functools import lru_cache
from helpers import Helpers

app = Flask(__name__)
CORS(app)

# Configuración de archivos
DATA_DIR = 'data'  # Directorio para almacenar datos
NODES_FILE = os.path.join(DATA_DIR, 'nodes.json')  # Archivo de nodos
ROUTES_FILE = os.path.join(DATA_DIR, 'routes.json')  # Archivo de rutas
OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d'  # API Key para OpenRouteService

# Asegurar que el directorio existe
os.makedirs(DATA_DIR, exist_ok=True)

@lru_cache(maxsize=32)
def load_routes_cached():
    """Carga en caché las rutas desde el archivo para mejorar rendimiento"""
    return Helpers.load_data(ROUTES_FILE)

@app.route('/')
def home():
    """Endpoint raíz que verifica que el servidor está funcionando"""
    return "Servidor de rutas en bici funcionando!"

@app.route('/nodes', methods=['GET', 'POST', 'OPTIONS'])
def handle_nodes():
    """
    Maneja operaciones CRUD para nodos
    GET: Retorna todos los nodos
    POST: Crea un nuevo nodo
    """
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'GET':
        try:
            nodes = Helpers.load_data(NODES_FILE)
            return jsonify(nodes), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            # Validaciones de datos requeridos
            if not data or 'lat' not in data or 'lng' not in data:
                return jsonify({"error": "Datos inválidos"}), 400
            
            # Validar nivel de riesgo si es punto de control
            if 'risk' in data:
                risk = int(data['risk'])
                if risk < 1 or risk > 5:
                    return jsonify({"error": "El nivel de riesgo debe estar entre 1 y 5"}), 400
            if 'description' not in data:
                return jsonify({"error": "La descripción es requerida"}), 400
            
            # Verificar unicidad del nombre
            if 'name' in data:
                nodes = Helpers.load_data(NODES_FILE)
                if any(node.get('name') == data['name'] for node in nodes):
                    return jsonify({"error": f"Ya existe un nodo con el nombre '{data['name']}'"}), 400
            
            # Añadir metadatos
            data['created_at'] = datetime.now().isoformat()
            
            # Guardar nodo
            nodes = Helpers.load_data(NODES_FILE)
            nodes.append(data)
            Helpers.save_data(nodes, NODES_FILE)
            
            return jsonify({"success": True, "data": data}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/nodes/<name>', methods=['DELETE', 'OPTIONS'])
def delete_node(name):
    """
    Elimina un nodo por nombre
    Verifica que no esté siendo usado en rutas antes de eliminar
    """
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'DELETE':
        try:
            nodes = Helpers.load_data(NODES_FILE)
            routes = Helpers.load_data(ROUTES_FILE)
            
            # Verificar existencia del nodo
            node_exists = any(node.get('name') == name for node in nodes)
            if not node_exists:
                return jsonify({"error": f"No se encontró ningún nodo con el nombre '{name}'"}), 404
            
            # Verificar uso en rutas
            node_in_use = any(
                any(point.get('nodeName') == name for point in route.get('points', []))
                for route in routes
            )
            
            if node_in_use:
                return jsonify({
                    "error": f"Nodo en uso en rutas",
                    "in_use": True
                }), 400
            
            # Eliminar nodo
            updated_nodes = [node for node in nodes if node.get('name') != name]
            Helpers.save_data(updated_nodes, NODES_FILE)
            
            return jsonify({
                "success": True,
                "message": f"Nodo '{name}' eliminado"
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
@app.route('/routes/<name>', methods=['GET', 'DELETE', 'OPTIONS'])
def handle_route(name):
    """
    Maneja rutas individuales
    GET: Obtiene una ruta por nombre
    DELETE: Elimina una ruta por nombre
    """
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'GET':
        try:
            routes = Helpers.load_data(ROUTES_FILE)
            route = next((r for r in routes if r.get('name') == name), None)
            
            if not route:
                return jsonify({"error": f"Ruta '{name}' no encontrada"}), 404
            
            return jsonify(route), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'DELETE':
        try:
            routes = Helpers.load_data(ROUTES_FILE)
            
            # Verificar existencia
            route_exists = any(route.get('name') == name for route in routes)
            if not route_exists:
                return jsonify({"error": f"Ruta '{name}' no encontrada"}), 404
            
            # Eliminar ruta
            updated_routes = [route for route in routes if route.get('name') != name]
            Helpers.save_data(updated_routes, ROUTES_FILE)
            
            return jsonify({
                "success": True,
                "message": f"Ruta '{name}' eliminada"
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/routes', methods=['GET', 'POST', 'OPTIONS'])
def handle_routes():
    """
    Maneja colección de rutas
    GET: Lista todas las rutas
    POST: Crea una nueva ruta
    """
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'GET':
        try:
            routes = Helpers.load_data(ROUTES_FILE)
            return jsonify(routes), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    elif request.method == 'POST':
        try:
            data = request.get_json()
            # Validar puntos mínimos
            if not data or 'points' not in data or len(data['points']) < 2:
                return jsonify({"error": "Se requieren al menos 2 puntos"}), 400
            
            # Verificar nombre único
            if 'name' in data:
                routes = Helpers.load_data(ROUTES_FILE)
                if any(route.get('name') == data['name'] for route in routes):
                    return jsonify({"error": f"Ruta '{data['name']}' ya existe"}), 400

            # Calcular riesgo promedio
            risk_sum = sum(
                int(point['risk']) for point in data['points'] 
                if 'risk' in point
            )
            risk_count = sum(1 for point in data['points'] if 'risk' in point)
            risk_avg = risk_sum / risk_count if risk_count > 0 else 0

            # Construir grafo de la ruta
            route_graph = Graph()
            points = data['points']
            
            # Añadir nodos y calcular distancias
            for point in points:
                route_graph.add_node(point['nodeName'])
            
            edge_distances = []
            for i in range(len(points)-1):
                node1 = points[i]
                node2 = points[i+1]
                
                # Calcular distancia entre nodos
                coord1 = [node1['lng'], node1['lat']]
                coord2 = [node2['lng'], node2['lat']]
                distance = Helpers.get_ors_distance(coord1, coord2, OPENROUTE_API_KEY)
                
                edge_distances.append(distance)
                route_graph.add_edge(node1['nodeName'], node2['nodeName'], weight=distance)
            
            # Manejar ajuste de distancia si es necesario
            frontend_total = data.get('distance')
            if frontend_total and edge_distances:
                edges_sum = sum(edge_distances)
                
                if abs(edges_sum - frontend_total) > 1:  # Tolerancia 1m
                    adjustment_factor = frontend_total / edges_sum
                    
                    route_graph = Graph()  # Reconstruir grafo
                    for point in points:
                        route_graph.add_node(point['nodeName'])
                    
                    for i in range(len(points)-1):
                        adjusted_distance = int(round(edge_distances[i] * adjustment_factor))
                        route_graph.add_edge(
                            points[i]['nodeName'], 
                            points[i+1]['nodeName'], 
                            weight=adjusted_distance
                        )
                        edge_distances[i] = adjusted_distance
                
                total_distance = int(round(frontend_total))
            else:
                total_distance = sum(edge_distances)
            
            # Preparar respuesta
            response_data = {
                "name": data.get('name', 'Nueva Ruta'),
                "description": data.get('description', ''),
                "difficulty": data.get('difficulty', 1),
                "popularity": data.get('popularity', 1),
                "points": points,
                "graph": {node: dict(edges) for node, edges in route_graph.graph.items()},
                "distance": total_distance,
                "risk": risk_avg,
                "created_at": datetime.now().isoformat()
            }
            
            # Guardar ruta
            routes = Helpers.load_data(ROUTES_FILE)
            routes.append(response_data)
            Helpers.save_data(routes, ROUTES_FILE)
            
            return jsonify({"success": True, "data": response_data}), 201
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route('/shortest-distances', methods=['POST', 'OPTIONS'])
def get_shortest_distances():
    """
    Calcula distancias mínimas desde un nodo de inicio a todos los demás
    Usa Dijkstra sobre un grafo completo de nodos
    """
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        
        # Validar datos de entrada
        if not data or 'nodes' not in data or not data['nodes'] or 'startNodeName' not in data:
            return jsonify({"error": "Se requieren nodos y nodo de inicio"}), 400
        
        nodes = data['nodes']
        start_node_name = data['startNodeName']
        
        # Verificar nodo de inicio
        start_node = next((node for node in nodes if node.get('name') == start_node_name), None)
        if not start_node:
            return jsonify({"error": f"Nodo '{start_node_name}' no encontrado"}), 404
        
        if start_node.get('type') != 'interest':
            return jsonify({"error": "El nodo de inicio debe ser de interés"}), 400
        
        # Construir grafo completo
        graph = Graph()
        for node in nodes:
            graph.add_node(node['name'])
        
        # Conectar todos los nodos entre sí
        for i, node1 in enumerate(nodes):
            for j, node2 in enumerate(nodes):
                if i != j:
                    coord1 = [node1['lng'], node1['lat']]
                    coord2 = [node2['lng'], node2['lat']]
                    distance = round(Helpers.haversine(*coord1, *coord2), 2) * 1000 # en m
                    graph.add_edge(node1['name'], node2['name'], weight=distance)
        
        # Calcular distancias mínimas
        distances = graph.dijkstra(start_node_name)
        
        # Paleta de colores para visualización
        color_palette = [
            "#FF5733", "#33FF57", "#3357FF", "#F033FF", "#33FFF5",
            "#FF33A8", "#B833FF", "#FFC733", "#33FFBD", "#8C33FF"
        ]
        
        # Preparar resultados
        all_distances = {}
        for node in nodes:
            node_name = node['name']
            if node_name != start_node_name and node_name in distances:
                color_index = hash(node_name) % len(color_palette)
                all_distances[node_name] = {
                    'distance': distances[node_name],
                    'lat': node['lat'],
                    'lng': node['lng'],
                    'type': node.get('type', 'control'),
                    'color': color_palette[color_index]
                }
        
        return jsonify({
            'startNode': start_node_name,
            'distances': all_distances,
            'info': {
                'totalNodes': len(nodes),
                'interestNodes': sum(1 for node in nodes if node.get('type') == 'interest'),
                'controlNodes': sum(1 for node in nodes if node.get('type') == 'control')
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/generar_rutas', methods=['POST', 'OPTIONS'])
def generar_rutas_personalizadas():
    """
    Genera rutas óptimas personalizadas según parámetros:
    - Duración objetivo
    - Dificultad
    - Experiencia del usuario
    """
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Datos requeridos"}), 400
        
        # Validar parámetros
        required_params = ['duracion_objetivo', 'dificultad', 'experiencia']
        if not all(param in data for param in required_params):
            return jsonify({
                "status": "error", 
                "message": "Faltan parámetros",
                "required": required_params
            }), 400
        
        # Procesar parámetros
        nodos = data.get("nodos", [])
        duracion_objetivo = float(data.get("duracion_objetivo", 60))  # minutos
        velocidad = float(data.get("velocidad", 15))  # km/h
        dificultad = int(data.get("dificultad", 1))
        experiencia = int(data.get("experiencia", 1))
        
        # Generar rutas óptimas
        rutas = Helpers.generar_rutas_optimas(
            nodos, duracion_objetivo, velocidad, dificultad, experiencia
        )
        
        return jsonify({
            "status": "success",
            "rutas": rutas
        }), 200
        
    except Exception as e:
        print(f"Error en generar_rutas: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
        
def _build_cors_preflight_response():
    """Construye respuesta CORS para peticiones OPTIONS"""
    response = jsonify({"message": "Preflight OK"})
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)