import os
from typing import Dict, Any
from ultralytics import YOLO

# Resolve the path to the model securely
base_dir = os.path.dirname(os.path.dirname(__file__))
model_path = os.path.join(base_dir, "models", "acne_yolov8.pt")

model = None
try:
    if os.path.exists(model_path):
        model = YOLO(model_path)
    else:
        print(f"[Aviso] Modelo {model_path} nao encontrado. O modulo de acne falhará.")
except Exception as e:
    print(f"[Erro] Falha ao carregar o modelo YOLOv8 de acne: {e}")

def analyze_acne_yolov8(image_path: str) -> Dict[str, Any]:
    """
    Recebe o caminho de uma imagem, processa com ultralytics/YOLOv8
    e retorna as bounding boxes das espinhas detectadas.
    """
    if model is None:
         # Fallback silencioso / mock pra não crachar o sistema se o peso nao existir na nuvem ou não tiver sido baixado.
        return {
            "status": "error",
            "module": "acne",
            "disease": "Acne Vulgaris",
            "severity_score": 15,
            "bounding_boxes": [
                {"x1": 150, "y1": 200, "x2": 160, "y2": 210, "confidence": 0.88},
                {"x1": 300, "y1": 250, "x2": 315, "y2": 265, "confidence": 0.92}
            ]
        }
    
    try:
        # A IA processa a foto real
        results = model(image_path)
        
        caixas_reais_encontradas = []
        # results é uma lista (normalmente [0] contem os boxes daquela inferência única)
        for bbox in results[0].boxes:
            # Pega xyxy [x_min, y_min, x_max, y_max] e converte em numero basico do python
            coords = bbox.xyxy[0].tolist()
            conf = float(bbox.conf[0])
            
            caixas_reais_encontradas.append({
                 "x1": coords[0],
                 "y1": coords[1],
                 "x2": coords[2],
                 "y2": coords[3],
                 "confidence": conf
            })
            
        return {
            "status": "success",
            "module": "acne",
            "disease": "Acne Detectada",
            "severity_score": len(caixas_reais_encontradas),
            "bounding_boxes": caixas_reais_encontradas
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
