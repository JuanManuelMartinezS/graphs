from datetime import datetime
import os
import json
from grafo import Graph
from grafo import reconstruct_path
from math import radians, sin, cos, sqrt, atan2
import requests


class Helpers:
    """
    Clase de utilidades para operaciones comunes en el sistema de gestión de rutas
    Proporciona métodos para:
    - Manejo de archivos JSON
    - Cálculos geográficos
    - Integración con OpenRouteService
    - Generación de rutas óptimas
    """

    @staticmethod
    def load_data(filename):
        """
        Carga datos desde un archivo JSON
        @param filename: Ruta del archivo a cargar
        @return: Datos cargados como diccionario/lista, o lista vacía si hay error
        @example:
            data = Helpers.load_data('data.json')
        """
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                try:
                    return json.load(f)
                except json.JSONDecodeError:
                    return []
        return []

    @staticmethod
    def save_data(data, filename):
        """
        Guarda datos en un archivo JSON con formato
        @param data: Datos a guardar (debe ser serializable a JSON)
        @param filename: Ruta del archivo destino
        @example:
            Helpers.save_data(my_data, 'output.json')
        """
        with open(filename, 'w') as f:
            json.dump(data, f, indent=4)

    @staticmethod
    def haversine(lon1, lat1, lon2, lat2):
        """
        Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
        @param lon1: Longitud punto 1 (grados decimales)
        @param lat1: Latitud punto 1 (grados decimales)
        @param lon2: Longitud punto 2 (grados decimales)
        @param lat2: Latitud punto 2 (grados decimales)
        @return: Distancia en kilómetros entre los puntos
        @example:
            distance = Helpers.haversine(-74.0060, 40.7128, -118.2437, 34.0522)
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

    @staticmethod
    def get_ors_distance(coords1, coords2, api_key):
        """
        Obtiene la distancia entre dos puntos usando OpenRouteService API
        @param coords1: Lista/tupla con [longitud, latitud] del punto 1
        @param coords2: Lista/tupla con [longitud, latitud] del punto 2
        @param api_key: Clave API para OpenRouteService
        @return: Distancia en metros (entero) o fallback a Haversine si hay error
        @raises ValueError: Si la API devuelve un error
        @example:
            distance = Helpers.get_ors_distance([-74.0060, 40.7128], [-118.2437, 34.0522], 'my-api-key')
        """
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
            return int(round(distance))
        except Exception as e:
            print(f"Error al obtener distancia de ORS: {str(e)}")
            # Fallback a Haversine (convertir a metros y redondear)
            haversine_distance = Helpers.haversine(coords1[0], coords1[1], coords2[0], coords2[1])  # en km
            return int(round(haversine_distance * 1000))  # Convertir a metros y redondear
        
    @staticmethod
    def generar_rutas_optimas(nodos, duracion_objetivo, velocidad_kmh, dificultad, experiencia, alpha=1, beta=1, tolerancia=6):
        """
        Genera rutas óptimas usando el algoritmo Floyd-Warshall con ponderación personalizada
        
        @param nodos: Lista de nodos/diccionarios con propiedades (name, lat, lng, type, risk)
        @param duracion_objetivo: Duración deseada en minutos
        @param velocidad_kmh: Velocidad promedio de caminata en km/h
        @param dificultad: Nivel de dificultad (1-5)
        @param experiencia: Nivel de experiencia del usuario (1-5)
        @param alpha: Peso para la duración en el cálculo (default 1)
        @param beta: Peso para la dificultad en el cálculo (default 1)
        @param tolerancia: Margen aceptable en minutos respecto al objetivo (default 6)
        
        @return: Lista de hasta 10 rutas ordenadas por mejor ajuste al objetivo
        
        @example:
            rutas = Helpers.generar_rutas_optimas(
                nodos=nodos_data,
                duracion_objetivo=60,
                velocidad_kmh=5,
                dificultad=3,
                experiencia=2
            )
        """
        try:
            # Validación básica
            if not nodos or len(nodos) < 2:
                print("Error: Se necesitan al menos 2 nodos")
                return []

            g = Graph()
          
            # Crear nodos y conexiones
            for nodo in nodos:
                if not nodo.get('name'):
                    continue
                g.add_node(nodo['name'])

            # Crear grafo completo con distancias
            for i in range(len(nodos)):
                for j in range(i+1, len(nodos)):
                    n1, n2 = nodos[i], nodos[j]
                    try:
                        distancia_km = Helpers.haversine(n1['lng'], n1['lat'], n2['lng'], n2['lat'])
                        g.add_edge(n1['name'], n2['name'], distancia_km * 1000, True)  # Convertir a metros
                    except KeyError as e:
                        print(f"Error en nodos {n1.get('name')} y {n2.get('name')}: {e}")
                        continue

            # Calcular todas las rutas posibles
            distancias, next_node = g.floyd_warshall_with_paths()
            
            # Parámetros para cálculo de peso
            peso_objetivo = alpha * (duracion_objetivo/60) + beta * (dificultad/experiencia)
            
            rutas_posibles = []
            
            # Generar rutas entre todos los pares de nodos
            for origen in g.graph:
                for destino in g.graph:
                    if origen == destino or distancias[origen][destino] == float('inf'):
                        continue
                    
                    distancia_km = distancias[origen][destino] / 1000  # Convertir a km
                    duracion_horas = distancia_km / velocidad_kmh
                    peso = alpha * duracion_horas + beta * dificultad/experiencia
                    
                    # Filtrar por tolerancia (convertida a unidades de peso)
                    if abs(peso - peso_objetivo) > (tolerancia/60 * alpha):  # Ajuste por alpha
                        continue

                    # Reconstruir ruta
                    ruta_nombres = reconstruct_path(origen, destino, next_node)
                    if not ruta_nombres or len(ruta_nombres) < 2:
                        continue

                    # Obtener detalles de los nodos en la ruta
                    puntos_ruta = []
                    riesgo_total = 0
                    body = {}
                    for name in ruta_nombres:
                        nodo = next(n for n in nodos if n['name'] == name)
                        if nodo.get('type') == 'control': 
                            body = {
                                'nodeName': name,
                                'lat': nodo['lat'],
                                'lng': nodo['lng'],
                                'type': 'control',
                                'risk': nodo['risk']
                            }
                            riesgo_total += nodo['risk']
                        else:
                            body = {
                                'nodeName': name,
                                'lat': nodo['lat'],
                                'lng': nodo['lng'],
                                'type': 'interest'
                            }
                        puntos_ruta.append(body)
                        

                    # Crear objeto ruta en el formato esperado
                    rutas_posibles.append({
                        'name': f"Ruta {origen}-{destino}",
                        'description': f"De {origen} a {destino} - Duración: {round(duracion_horas*60,1)} min",
                        'difficulty': dificultad,
                        'popularity': 3,
                        'points': puntos_ruta,
                        'distance': int(distancias[origen][destino]),  # en metros
                        'risk': round(riesgo_total/len(ruta_nombres), 1),
                        'duration': round(duracion_horas * 60, 1),  # en minutos
                        'created_at': datetime.now().isoformat(),
                        '_score': abs(peso - peso_objetivo)  # Para ordenamiento
                    })

            # Ordenar por mejor ajuste al peso objetivo
            rutas_posibles.sort(key=lambda x: x['_score'])
            
            # Limitar y formatear resultado final
            return [{
                'name': r['name'],
                'description': r['description'],
                'difficulty': r['difficulty'],
                'popularity': r['popularity'],
                'points': r['points'],
                'distance': r['distance'],
                'risk': r['risk'],
                'duration': r['duration'],
                'created_at': r['created_at']
            } for r in rutas_posibles[:10]]

        except Exception as e:
            print(f"Error en generar_rutas_optimas: {str(e)}", flush=True)
            return []