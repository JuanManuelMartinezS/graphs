from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configuración más permisiva

DATA_FILE = os.path.join('data', 'nodes.json')

# Asegurar que el directorio existe
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

@app.route('/')
def home():
    return "Servidor de rutas en bici funcionando!"

@app.route('/add_node', methods=['POST', 'OPTIONS'])
def add_node():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    try:
        data = request.get_json()
        print("Datos recibidos:", data)
        
        # Leer nodos existentes
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                nodes = json.load(f)
        else:
            nodes = []
        
        nodes.append(data)
        
        # Guardar
        with open(DATA_FILE, 'w') as f:
            json.dump(nodes, f, indent=4)
            
        return jsonify({"success": True}), 200
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/get_nodes', methods=['GET'])
def get_nodes():
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                return jsonify(json.load(f)), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def _build_cors_preflight_response():
    response = jsonify({"message": "Preflight OK"})
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)