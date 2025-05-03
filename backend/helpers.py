import os
import json
from grafo import Graph
from grafo import reconstruct_path
from math import radians, sin, cos, sqrt, atan2
import requests


class Helpers:

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
            haversine_distance = Helpers.haversine(coords1[0], coords1[1], coords2[0], coords2[1])  # en km
            return int(round(haversine_distance * 1000))  # Convertir a metros y redondear
        
    def generar_rutas_optimas(nodos, duracion_objetivo, dificultad, experiencia, alpha=1, beta=1, tolerancia=5):
        g = Graph()
        
        # Crear nodos y añadirlos al grafo
        for nodo in nodos:
            g.add_node(nodo["name"])
        
        # Crear grafo completo con pesos como distancia
        for i in range(len(nodos)):
            for j in range(i + 1, len(nodos)):
                n1, n2 = nodos[i], nodos[j]
                distancia = Helpers.haversine(n1["lat"], n1["lng"], n2["lat"], n2["lng"])
                g.add_edge(n1["name"], n2["name"], weight=distancia, directed=False)

        # Calcular duración esperada a partir de distancia (velocidad 20 km/h)
        velocidad = 20  # km/h
        duracion_en_horas = duracion_objetivo / 60

        # Calcular peso objetivo
        peso_objetivo = alpha * duracion_en_horas + beta * dificultad / experiencia

        # Obtener distancias y caminos
        distancias, next_node = g.floyd_warshall_with_paths()

        rutas_aproximadas = []
        for origen in g.graph:
            for destino in g.graph:
                if origen != destino:
                    distancia = distancias[origen][destino]
                    if distancia == float('inf'):
                        continue
                    duracion = distancia / velocidad
                    peso = alpha * duracion + beta * dificultad / experiencia
                    if abs(peso - peso_objetivo) <= (tolerancia / 60):  # tolerancia en minutos
                        ruta = reconstruct_path(origen, destino, next_node)
                        rutas_aproximadas.append({
                            "origen": origen,
                            "destino": destino,
                            "ruta": ruta,
                            "peso": round(peso, 2),
                            "duracion": round(duracion * 60, 2),  # en minutos
                            "distancia": round(distancia, 2)
                        })

        return rutas_aproximadas