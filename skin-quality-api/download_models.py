import os
import urllib.request
import zipfile
import shutil

# Diretório base para os modelos
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

def download_facefixer_yolo():
    print("Iniciando download do repositório FaceFixer Backend (contém os pesos do YOLOv8)...")
    url = "https://github.com/dobariyz/FaceFixer/raw/main/Facefixer_Backend_Project6.zip"
    zip_path = os.path.join(MODELS_DIR, "Facefixer_Backend.zip")
    
    # Download do arquivo
    try:
        urllib.request.urlretrieve(url, zip_path)
        print("Download das redes neurais concluído com sucesso!")
        
        # Extrair e mover apenas o arquivo .pt útil
        print("Extraindo o pacote...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(MODELS_DIR)
        
        # O arquivo .pt costuma ficar dentro da pasta extraída, iremos mover para a raiz de /models
        print("Modelos salvos na pasta /models local da nossa API.")
        
    except Exception as e:
        print(f"Erro ao baixar o modelo FaceFixer: {e}")

if __name__ == "__main__":
    download_facefixer_yolo()
    # Adicionaremos aqui o download de outros modelos (Melasma/Rugas) no futuro caso precisem de scripts automatizados.
