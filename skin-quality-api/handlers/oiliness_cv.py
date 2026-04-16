import cv2
import numpy as np
from typing import Dict, Any

def analyze_oiliness_cv(image_path: str) -> Dict[str, Any]:
    """
    Recebe uma imagem, realiza análise de brilho (glare) e reflexão por OpenCV,
    idealmente usando máscara na Zona T para análise demográfica.
    """
    # TODO: Ler imagem utilizando OpenCV
    # img = cv2.imread(image_path)
    # hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    # v_channel = hsv[:, :, 2]
    # threshold e count de pixels brilhantes
    
    # Mock return
    return {
        "status": "success",
        "module": "oiliness",
        "severity": "Moderada",
        "score": 60,  # Grau de oleosidade 0-100
        "affected_areas": ["Zona T", "Testa"],
        "heatmap_base64": "data:image/png;base64,....mocked..." # Highlight em canal Alpha
    }
