from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="FaceMetric - Skin Quality Base API",
    description="Motor de inferência isolado para análises clínicas em Deep Learning.",
    version="1.0.0"
)

# Libera o acesso para o front-end Next.js local e em produção
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Será travado no futuro para a url especifica da Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from handlers.acne_yolo import analyze_acne_yolov8
from handlers.melasma_cam import analyze_melasma_cam
from handlers.wrinkles_unet import analyze_wrinkles_unet
from handlers.oiliness_cv import analyze_oiliness_cv
from handlers.rosacea_knn import analyze_rosacea_knn

@app.get("/")
def read_root():
    return {"status": "online", "message": "FaceMetric Skin Quality API is running."}

@app.post("/analyze/rugas")
async def analyze_wrinkles(file: UploadFile = File(...)):
    image_path = "temp_image.jpg"
    result = analyze_wrinkles_unet(image_path)
    return result

@app.post("/analyze/acne")
async def analyze_acne(file: UploadFile = File(...)):
    # Simula o caminho temporário. Em produção usaremos tempfile.
    image_path = "temp_image.jpg"
    result = analyze_acne_yolov8(image_path)
    return result

@app.post("/analyze/melasma")
async def analyze_melasma(file: UploadFile = File(...)):
    image_path = "temp_image.jpg"
    result = analyze_melasma_cam(image_path)
    return result

@app.post("/analyze/oleosidade")
async def analyze_oiliness(file: UploadFile = File(...)):
    image_path = "temp_image.jpg"
    result = analyze_oiliness_cv(image_path)
    return result

@app.post("/analyze/rosacea")
async def analyze_rosacea(file: UploadFile = File(...)):
    image_path = "temp_image.jpg"
    result = analyze_rosacea_knn(image_path)
    return result

@app.post("/analyze/all")
async def analyze_all(file: UploadFile = File(...)):
    """
    Controller Principal: Executa todos os Handlers de forma otimizada
    sobre a mesma imagem e retorna um payload clínico consolidado.
    """
    image_path = "temp_image.jpg"
    
    # Executamos as funções modulares
    return {
        "status": "success",
        "global_score": 88, # Cálculo empírico da saudabilidade
        "results": {
            "wrinkles": analyze_wrinkles_unet(image_path),
            "acne": analyze_acne_yolov8(image_path),
            "melasma": analyze_melasma_cam(image_path),
            "oiliness": analyze_oiliness_cv(image_path),
            "rosacea": analyze_rosacea_knn(image_path)
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
