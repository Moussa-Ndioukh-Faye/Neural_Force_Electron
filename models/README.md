# NeuralForge Custom Model Training

## Overview

Ce projet permet de fine-tuner un modèle de language pour en faire un assistant de coding personnalisé.

## Architecture

- **Base Model**: Qwen2.5-Coder ou CodeLlama (modèle open-source spécialisé code)
- **Framework**: LoRA via Hugging Face Transformers + PEFT
- **Hardware**:GPU (CUDA) ou CPU (plus lent)

## Structure

```
models/
├── data/
│   └── training.jsonl      # Données de training
├── scripts/
│   ├── prepare_data.py     # Préparation des données
│   ├── train.py           # Script d'entraînement
│   └── inference.py       # Inference locale
└── outputs/               # Modèles entraînés
```

## Utilisation

### 1. Préparer les données

Crée un fichier `data/training.jsonl` avec des exemples:
```json
{"prompt": "Écris une fonction Python qui calcule la factorielle", "completion": "def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n-1)"}
```

### 2. Lancer l'entraînement

```bash
python scripts/train.py
```

### 3. Inference

```bash
python scripts/inference.py "Écris une fonction qui trie une liste"
```

## Configuration

Édite `config.yaml` pour ajuster:
- Model base
- Learning rate
- Nombre d'époques
- Taille du batch