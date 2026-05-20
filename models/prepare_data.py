import json
import os
from pathlib import Path

TRAINING_DATA = [
    {
        "prompt": "Écris une fonction Python qui calcule la factorielle d'un nombre",
        "completion": """def factorial(n):
    \"\"\"Calcule la factorielle de n.
    
    Args:
        n: Nombre entier positif
        
    Returns:
        Factorielle de n
    \"\"\"
    if n < 0:
        raise ValueError("Factorielle undefined pour nombres négatifs")
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

# Exemple d'utilisation
print(factorial(5))  # 120"""
    },
    {
        "prompt": "Crée une classe Python pour gérer une liste de tâches (TodoList)",
        "completion": """class TodoList:
    def __init__(self):
        self.tasks = []
    
    def add(self, task):
        self.tasks.append({"text": task, "done": False})
    
    def complete(self, index):
        if 0 <= index < len(self.tasks):
            self.tasks[index]["done"] = True
    
    def remove(self, index):
        if 0 <= index < len(self.tasks):
            self.tasks.pop(index)
    
    def show(self):
        for i, task in enumerate(self.tasks):
            status = "✓" if task["done"] else " "
            print(f"[{status}] {i+1}. {task['text']}")

# Utilisation
todo = TodoList()
todo.add("Apprendre Python")
todo.add("Créer une AI")
todo.complete(0)
todo.show()"""
    },
    {
        "prompt": "Implémente un algorithme de tri rapide (quicksort) en Python",
        "completion": """def quicksort(arr):
    \"\"\"Trie un tableau avec l'algorithme quicksort.
    
    Args:
        arr: Liste à trier
        
    Returns:
        Liste triée
    \"\"\"
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)

# Test
print(quicksort([3, 6, 8, 10, 1, 2, 1]))"""
    },
    {
        "prompt": "Crée un décorateur Python qui mesure le temps d'exécution d'une fonction",
        "completion": """import time
from functools import wraps

def timer(func):
    \"\"\"Décorateur qui mesure le temps d'exécution.\"\"\"
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} a pris {end - start:.4f} secondes")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "Terminé"

slow_function()"""
    },
    {
        "prompt": "Écris un script Python qui scrape une page web avec requests et BeautifulSoup",
        "completion": """import requests
from bs4 import BeautifulSoup

def scrape(url):
    \"\"\"Récupère le titre d'une page web.
    
    Args:
        url: URL de la page
        
    Returns:
        Titre de la page
    \"\"\"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    return soup.title.string if soup.title else "Pas de titre"

# Utilisation
title = scrape("https://example.com")
print(f"Titre: {title}")"""
    },
    {
        "prompt": "Implémente un générateur de mots de passe aléatoires en Python",
        "completion": """import random
import string

def generate_password(length=16, use_special=True):
    \"\"\"Génère un mot de passe aléatoire.
    
    Args:
        length: Longueur du mot de passe
        use_special: Inclure les caractères spéciaux
        
    Returns:
        Mot de passe généré
    \"\"\"
    chars = string.ascii_letters + string.digits
    if use_special:
        chars += string.punctuation
    
    return ''.join(random.choice(chars) for _ in range(length))

# Générer un mot de passe
password = generate_password(20)
print(f"Mot de passe: {password}")"""
    },
    {
        "prompt": "Crée un context manager Python pour mesurer le temps d'exécution",
        "completion": """import time

class Timer:
    \"\"\"Context manager pour mesurer le temps.\"\"\"
    def __init__(self, name="Bloc"):
        self.name = name
        self.start = None
        
    def __enter__(self):
        self.start = time.perf_counter()
        return self
        
    def __exit__(self, *args):
        elapsed = time.perf_counter() - self.start
        print(f"{self.name}: {elapsed:.4f}s")

# Utilisation
with Timer("Calcul intensif"):
    sum(range(1000000))"""
    },
    {
        "prompt": "Implémente un décorateur retry qui réessaie une fonction en cas d'erreur",
        "completion": """import time
from functools import wraps

def retry(max_attempts=3, delay=1):
    \"\"\"Décorateur qui réessaie la fonction en cas d'erreur.
    
    Args:
        max_attempts: Nombre d'essais maximum
        delay: Délai entre les tentatives (secondes)
    \"\"\"
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry(max_attempts=3)
def unstable_function():
    import random
    if random.random() > 0.7:
        return "Succès!"
    raise Exception("Erreur")"""
    },
    {
        "prompt": "Écris une fonction qui utilise l'API asyncio pour exécuter des tâches en parallèle",
        "completion": """import asyncio

async def fetch_data(url):
    \"\"\"Simule une requête HTTP asynchrone.\"\"\"
    await asyncio.sleep(1)  # Simule le réseau
    return f"Données de {url}"

async def main():
    urls = ["site1.com", "site2.com", "site3.com"]
    
    # Exécution parallèle
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks)
    
    for r in results:
        print(r)

asyncio.run(main())"""
    },
    {
        "prompt": "Crée un décorateur Python qui met en cache les résultats d'une fonction",
        "completion": """from functools import wraps

def memoize(func):
    \"\"\"Décorateur de cache (memoization).\"\"\"
    cache = {}
    
    @wraps(func)
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    
    wrapper.cache = cache
    return wrapper

@memoize
def fibonacci(n):
    \"\"\"Calcule le nième nombre de Fibonacci.\"\"\"
    if n < 2:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Much faster with memoization!
print(fibonacci(100))"""
    }
]

def prepare_training_data():
    output_path = Path(__file__).parent / "data" / "training.jsonl"
    output_path.parent.mkdir(exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        for item in TRAINING_DATA:
            json.dump(item, f, ensure_ascii=False)
            f.write("\n")
    
    print(f"✓ Données créées: {output_path}")
    print(f"  {len(TRAINING_DATA)} exemples")

if __name__ == "__main__":
    prepare_training_data()