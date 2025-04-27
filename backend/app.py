from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuración de archivos
DATA_DIR = 'data'
NODES_FILE = os.path.join(DATA_DIR, 'nodes.json')
ROUTES_FILE = os.path.join(DATA_DIR, 'routes.json')

# Asegurar que el directorio existe
os.makedirs(DATA_DIR, exist_ok=True)

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
        
@app.route('/routes/<name>', methods=['DELETE', 'OPTIONS'])
def delete_route(name):
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
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
            
            # Verificar si la ruta ya existe (si tiene nombre)
            if 'name' in data:
                routes = load_data(ROUTES_FILE)
                if any(route.get('name') == data['name'] for route in routes):
                    return jsonify({"error": f"Ya existe una ruta con el nombre '{data['name']}'"}), 400
            
            # Asignar valores por defecto si no están presentes
            if 'created_at' not in data:
                data['created_at'] = datetime.now().isoformat()
            if 'name' not in data:
                data['name'] = 'Nueva Ruta'
                
            if 'estimatedTime' in data and 'duration' not in data:
                data['duration'] = data['estimatedTime']
                
            routes = load_data(ROUTES_FILE)
            routes.append(data)
            save_data(routes, ROUTES_FILE)
            
            return jsonify({"success": True, "data": data}), 201
        
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