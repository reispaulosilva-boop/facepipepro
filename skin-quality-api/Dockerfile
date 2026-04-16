# Usa uma imagem oficial limpa e enxuta de Python
FROM python:3.10-slim

# Define o diretório de trabalho local dentro do contêiner
WORKDIR /app

# Instala ferramentas básicas do sistema caso seja necessário compilar algo como OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Configura repositório para baixar a versão lite (CPU-only) do PyTorch, economizando centenas de MBs
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copia os requisitos
COPY requirements.txt .

# Instala as dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante da API para o contêiner
COPY . .

# Expõe a porta do servidor web
EXPOSE 8000

# Executa o FastAPI via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
