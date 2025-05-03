from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
from grafo import Graph
from math import radians, sin, cos, sqrt, atan2
import requests
from functools import lru_cache

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuración de archivos
DATA_DIR = 'data'
NODES_FILE = os.path.join(DATA_DIR, 'nodes.json')
ROUTES_FILE = os.path.join(DATA_DIR, 'routes.json')
OPENROUTE_API_KEY = '5b3ce3597851110001cf6248c910617856ea49d4b76517022e36589d'
# Asegurar que el directorio existe
os.makedirs(DATA_DIR, exist_ok=True)

@lru_cache(maxsize=32)
def load_routes_cached():
    return load_data(ROUTES_FILE)

# Helper functions
def load_data(filename):
    """Cargar datos desde un archivo JSON"""
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_data(data, filename):
    """Guardar datos en un archivo JSON"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)

       

def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convertir grados a radianes
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

    # Fórmula de Haversine
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a)) 
    r = 6371  # Radio de la Tierra en kilómetros
    return c * r

def get_ors_distance(coords1, coords2, api_key):
    """Obtiene la distancia entre dos puntos usando OpenRouteService (devuelve metros)"""
    url = "https://api.openrouteservice.org/v2/directions/foot-walking"
    headers = {
        'Authorization': api_key,
        'Content-Type': 'application/json'
    }
    
    body = {
        "coordinates": [coords1, coords2],
        "instructions": False,
        "geometry": False
    }
    
    try:
        response = requests.post(url, json=body, headers=headers)
        if response.status_code != 200:
            raise ValueError(f"Error de OpenRouteService: {response.text}")
        
        data = response.json()
        distance = data['features'][0]['properties']['segments'][0]['distance']  # en metros
        return int(round(distance))  # Redondear a 3 decimales
    except Exception as e:
        print(f"Error al obtener distancia de ORS: {str(e)}")
        # Fallback a Haversine (convertir a metros y redondear)
        haversine_distance = haversine(coords1[0], coords1[1], coords2[0], coords2[1])  # en km
        return int(round(haversine_distance * 1000))  # Convertir a metros y redondear

@app.route('/')
def home():
    return "Servidor de rutas en bici funcionando!"

@app.route('/nodes', methods=['GET', 'POST', 'OPTIONS'])
def handle_nodes():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'GET':
        try:
            nodes = load_data(NODES_FILE)
            return jsonify(nodes), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'lat' not in data or 'lng' not in data:
                return jsonify({"error": "Datos inválidos"}), 400
            
            # Validar nivel de riesgo
            if 'risk' in data:
                risk = int(data['risk'])
                if risk < 1 or risk > 5:
                    return jsonify({"error": "El nivel de riesgo debe estar entre 1 y 5"}), 400
            if 'description' not in data:
                return jsonify({"error": "La descripción es requerida"}), 400
            
            # Verificar si el nodo ya existe (si tiene nombre)
            if 'name' in data:
                nodes = load_data(NODES_FILE)
                if any(node.get('name') == data['name'] for node in nodes):
                    return jsonify({"error": f"Ya existe un nodo con el nombre '{data['name']}'"}), 400
            
            # Añadir timestamp
            data['created_at'] = datetime.now().isoformat()
            
            nodes = load_data(NODES_FILE)
            nodes.append(data)
            save_data(nodes, NODES_FILE)
            
            return jsonify({"success": True, "data": data}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/nodes/<name>', methods=['DELETE', 'OPTIONS'])
def delete_node(name):
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'DELETE':
        try:
            # Cargar nodos y rutas existentes
            nodes = load_data(NODES_FILE)
            routes = load_data(ROUTES_FILE)
            
            # Verificar si el nodo existe
            node_exists = any(node.get('name') == name for node in nodes)
            if not node_exists:
                return jsonify({"error": f"No se encontró ningún nodo con el nombre '{name}'"}), 404
            
            # Verificar si el nodo está siendo usado en alguna ruta
            node_in_use = False
            for route in routes:
                if any(point.get('nodeName') == name for point in route.get('points', [])):
                    node_in_use = True
                    break
            
            if node_in_use:
                return jsonify({
                    "error": f"No se puede eliminar el nodo '{name}' porque está siendo utilizado en una o más rutas",
                    "in_use": True
                }), 400
            
            # Si no está en uso, proceder con la eliminación
            updated_nodes = [node for node in nodes if node.get('name') != name]
            save_data(updated_nodes, NODES_FILE)
            
            return jsonify({
                "success": True,
                "message": f"Nodo '{name}' eliminado correctamente"
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
@app.route('/routes/<name>', methods=['GET', 'DELETE', 'OPTIONS'])
def handle_route(name):
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'GET':
        try:
            routes = load_data(ROUTES_FILE)
            route = next((r for r in routes if r.get('name') == name), None)
            
            if not route:
                return jsonify({"error": f"No se encontró ninguna ruta con el nombre '{name}'"}), 404
            
            return jsonify(route), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    if request.method == 'DELETE':
        try:
            # Cargar rutas existentes
            routes = load_data(ROUTES_FILE)
            
            # Verificar si la ruta existe
            route_exists = any(route.get('name') == name for route in routes)
            if not route_exists:
                return jsonify({"error": f"No se encontró ninguna ruta con el nombre '{name}'"}), 404
            
            # Proceder con la eliminación
            updated_routes = [route for route in routes if route.get('name') != name]
            save_data(updated_routes, ROUTES_FILE)
            
            return jsonify({
                "success": True,
                "message": f"Ruta '{name}' eliminada correctamente"
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/routes', methods=['GET', 'POST', 'OPTIONS'])
def handle_routes():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'GET':
        try:
            routes = load_data(ROUTES_FILE)
            return jsonify(routes), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'points' not in data or len(data['points']) < 2:
                return jsonify({"error": "Se requieren al menos 2 puntos para crear una ruta"}), 400
            
            # Verificar si la ruta ya existe
            if 'name' in data:
                routes = load_data(ROUTES_FILE)
                if any(route.get('name') == data['name'] for route in routes):
                    return jsonify({"error": f"Ya existe una ruta con el nombre '{data['name']}'"}), 400

             # Sumatoria de riesgo de los nodos
            risk_sum = 0
            cantidad_riesgo = 0
            for point in data['points']:
                if 'risk' in point:
                    risk_sum += int(point['risk'])
                    cantidad_riesgo += 1
            risk_sum = risk_sum / cantidad_riesgo if cantidad_riesgo > 0 else 0


            # Crear el grafo
            route_graph = Graph()
            points = data['points']
            
            # Añadir nodos
            for point in points:
                route_graph.add_node(point['nodeName'])
            
            # Calcular distancias entre nodos consecutivos
            edge_distances = []
            for i in range(len(points)-1):
                node1 = points[i]
                node2 = points[i+1]
                
                # Usar OpenRouteService para distancia real
                coord1 = [node1['lng'], node1['lat']]
                coord2 = [node2['lng'], node2['lat']]
                distance = get_ors_distance(coord1, coord2, OPENROUTE_API_KEY)
                
                edge_distances.append(distance)
                route_graph.add_edge(node1['nodeName'], node2['nodeName'], weight=distance)
            
            # Obtener la distancia total del frontend si está disponible
            frontend_total = data.get('distance')
            
            # Si tenemos la distancia total del frontend y es diferente de la suma,
            # ajustamos proporcionalmente las distancias de los segmentos
            if frontend_total and edge_distances:
                edges_sum = sum(edge_distances)
                
                # Solo ajustamos si hay una diferencia significativa
                if abs(edges_sum - frontend_total) > 1:  # tolerancia de 1 metro
                    # Factor de ajuste
                    adjustment_factor = frontend_total / edges_sum
                    
                    # Ajustar las distancias de las aristas y reconstruir el grafo
                    route_graph = Graph()  # Reiniciar el grafo
                    
                    # Añadir nodos nuevamente
                    for point in points:
                        route_graph.add_node(point['nodeName'])
                    
                    # Añadir aristas con distancias ajustadas
                    for i in range(len(points)-1):
                        node1 = points[i]
                        node2 = points[i+1]
                        
                        # Aplicar el factor de ajuste a cada distancia
                        adjusted_distance = int(round(edge_distances[i] * adjustment_factor))
                        route_graph.add_edge(node1['nodeName'], node2['nodeName'], weight=adjusted_distance)
                        
                        # Actualizar el array de distancias para comprobación
                        edge_distances[i] = adjusted_distance
                
                # Usar la distancia del frontend como valor oficial
                total_distance = int(round(frontend_total))
            else:
                # Si no tenemos la distancia del frontend, usamos la suma
                total_distance = sum(edge_distances)
            
            # Convertir el grafo a metros enteros
            graph_dict = {}
            for node, edges in route_graph.graph.items():
                graph_dict[node] = {neighbor: int(round(weight)) for neighbor, weight in edges.items()}
                
            # Preparar respuesta
            response_data = {
                "name": data.get('name', 'Nueva Ruta'),
                "description": data.get('description', ''),
                "difficulty": data.get('difficulty', 1),
                "popularity": data.get('popularity', 1),
                "points": points,
                "graph": {node: dict(edges) for node, edges in route_graph.graph.items()},
                "distance": total_distance,
                "estimatedTime": data.get('estimatedTime'),
                "duration": data.get('estimatedTime'),
                "risk": risk_sum,
                "created_at": datetime.now().isoformat()
            }
            
            # Guardar en archivo
            routes = load_data(ROUTES_FILE)
            routes.append(response_data)
            save_data(routes, ROUTES_FILE)
            
            return jsonify({"success": True, "data": response_data}), 201
        
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/routes/suggest', methods=['POST', 'OPTIONS'])
def suggest_routes():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    if request.method == 'POST':
        try:
            # Obtener y validar filtros
            filters = request.get_json()
            if not all(key in filters for key in ['duracion', 'dificultad', 'experiencia']):
                return jsonify({"error": "Faltan filtros requeridos"}), 400
            
            try:
                duracion_deseada = float(filters['duracion'])
                dificultad_deseada = int(filters['dificultad'])
                experiencia_usuario = int(filters['experiencia'])
            except ValueError:
                return jsonify({"error": "Los filtros deben ser números válidos"}), 400
            
            # Validar rangos
            if not (1 <= dificultad_deseada <= 5) or not (1 <= experiencia_usuario <= 5):
                return jsonify({"error": "Dificultad y experiencia deben estar entre 1 y 5"}), 400
            
            # Cargar todas las rutas
            all_routes = load_data(ROUTES_FILE)
            if not all_routes:
                return jsonify({"error": "No hay rutas disponibles"}), 404
            
            # Ajustar la dificultad deseada según la experiencia del usuario
            # Si el usuario es principiante (experiencia=1), reducimos la dificultad máxima aceptable
            # Si el usuario es experto (experiencia=5), podemos aumentar la dificultad máxima
            dificultad_ajustada = dificultad_deseada * (experiencia_usuario / 3)  # Factor de ajuste basado en experiencia
            dificultad_ajustada = max(1, min(5, dificultad_ajustada))  # Mantener entre 1 y 5
            
            # Margen de aceptación para la dificultad (±1)
            dificultad_min = max(1, round(dificultad_ajustada) - 1)
            dificultad_max = min(5, round(dificultad_ajustada) + 1)
            
            # Margen de aceptación para la duración (±25% o mínimo 10 minutos)
            margen_duracion = max(10, duracion_deseada * 0.25)
            duracion_min = max(1, duracion_deseada - margen_duracion)
            duracion_max = duracion_deseada + margen_duracion
            
            # Filtrar y puntuar rutas
            rutas_filtradas = []
            for route in all_routes:
                route_duration = route.get('duration', 0)
                route_difficulty = route.get('difficulty', 3)
                
                # Verificar si cumple con los rangos de dificultad y duración
                if (dificultad_min <= route_difficulty <= dificultad_max and
                    duracion_min <= route_duration <= duracion_max):
                    
                    # Calcular puntuación de coincidencia (0-1, donde 1 es mejor)
                    # Ponderación: 60% dificultad, 40% duración
                    diff_score = 1 - (abs(route_difficulty - dificultad_ajustada) / 5)
                    duration_score = 1 - (abs(route_duration - duracion_deseada) / duracion_deseada)
                    
                    total_score = 0.6 * diff_score + 0.4 * duration_score
                    
                    rutas_filtradas.append({
                        'route': route,
                        'score': total_score,
                        'duration_diff': abs(route_duration - duracion_deseada),
                        'difficulty_diff': abs(route_difficulty - dificultad_ajustada)
                    })
            
            # Ordenar rutas por puntuación (mejores primero) y luego por duración más cercana
            rutas_filtradas.sort(key=lambda x: (-x['score'], x['duration_diff']))
            
            # Limitar a las 5 mejores rutas
            best_routes = [x['route'] for x in rutas_filtradas[:5]]
            
            if not best_routes:
                return jsonify({
                    "error": "No se encontraron rutas que cumplan los criterios",
                    "suggestion": "Intenta ampliar el rango de duración o dificultad"
                }), 404
            
            return jsonify(best_routes), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/shortest-distances', methods=['POST', 'OPTIONS'])
def get_shortest_distances():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        
        if not data or 'nodes' not in data or not data['nodes'] or 'startNodeName' not in data:
            return jsonify({"error": "Se requieren los nodos y el nombre del nodo de inicio"}), 400
        
        nodes = data['nodes']
        start_node_name = data['startNodeName']
        
        # Verificar que el nodo de inicio existe
        start_node = next((node for node in nodes if node.get('name') == start_node_name), None)
        if not start_node:
            return jsonify({"error": f"No se encontró el nodo de inicio '{start_node_name}'"}), 404
        
        # Verificar que el nodo de inicio es de tipo interés
        if start_node.get('type') != 'interest':
            return jsonify({"error": "El nodo de inicio debe ser de tipo 'interest'"}), 400
        
        # Construir el grafo intermedio conectando todos los nodos
        graph = Graph()
        
        # Añadir todos los nodos al grafo
        for node in nodes:
            graph.add_node(node['name'])
        
        # Conectar cada nodo con todos los demás nodos (grafo completo)
        for i, node1 in enumerate(nodes):
            for j, node2 in enumerate(nodes):
                if i != j:  # No conectar un nodo consigo mismo
                    coord1 = [node1['lng'], node1['lat']]
                    coord2 = [node2['lng'], node2['lat']]
                    
                    # Calcular distancia entre nodos
                    distance = round(haversine(coord1[0], coord1[1], coord2[0], coord2[1]), 2) * 1000 # en m
                    
                    # Añadir arista con su peso (distancia)
                    graph.add_edge(node1['name'], node2['name'], weight=distance)
        
        # Aplicar Dijkstra para obtener distancias mínimas desde el nodo inicial
        distances = graph.dijkstra(start_node_name)
        
        # Lista de 10 colores vibrantes y distintos
        color_palette = [
            "#FF5733",  # Rojo anaranjado
            "#33FF57",  # Verde brillante
            "#3357FF",  # Azul
            "#F033FF",  # Magenta
            "#33FFF5",  # Cian
            "#FF33A8",  # Rosa
            "#B833FF",  # Púrpura
            "#FFC733",  # Amarillo anaranjado
            "#33FFBD",  # Verde agua
            "#8C33FF"   # Violeta
        ]
        
        # Incluir todos los nodos excepto el inicial en los resultados
        all_distances = {}
        for node in nodes:
            node_name = node['name']
            
            # Incluir todos los nodos excepto el inicial
            if node_name != start_node_name and node_name in distances:
                # Asignar color aleatorio basado en el hash del nombre del nodo para consistencia
                color_index = hash(node_name) % len(color_palette)
                all_distances[node_name] = {
                    'distance': distances[node_name],
                    'lat': node['lat'],
                    'lng': node['lng'],
                    'type': node.get('type', 'control'),  # Incluir el tipo de nodo
                    'color': color_palette[color_index]  # Asignar color de la paleta
                }
        
        # Preparar respuesta
        result = {
            'startNode': start_node_name,
            'distances': all_distances,
            'info': {
                'totalNodes': len(nodes),
                'interestNodes': sum(1 for node in nodes if node.get('type') == 'interest'),
                'controlNodes': sum(1 for node in nodes if node.get('type') == 'control')
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
def _build_cors_preflight_response():
    response = jsonify({"message": "Preflight OK"})
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)