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
            
            # Añadir timestamp
            data['created_at'] = datetime.now().isoformat()
            
            nodes = load_data(NODES_FILE)
            nodes.append(data)
            save_data(nodes, NODES_FILE)
            
            return jsonify({"success": True, "data": data}), 201
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
            
            # Añadir metadatos
            route_data = {
                'points': data['points'],
                'created_at': datetime.now().isoformat(),
                'name': data.get('name', 'Nueva Ruta'),
                'description': data.get('description', ''),
                'distance': data.get('distance', 0),
                'duration': data.get('duration', 0)
            }
            
            routes = load_data(ROUTES_FILE)
            routes.append(route_data)
            save_data(routes, ROUTES_FILE)
            
            return jsonify({"success": True, "data": route_data}), 201
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