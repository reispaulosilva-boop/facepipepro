/**
 * FaceMetric Pro - Skin Quality API Client
 * Responsável por conectar o Next.js Frontend ao Microsserviço Python no Render.
 */

// A URL oficial do Render será inserida através do arquivo .env.local
// Exemplo: NEXT_PUBLIC_SKIN_API_URL=https://facepipe-brain.onrender.com
const API_BASE_URL = process.env.NEXT_PUBLIC_SKIN_API_URL || 'http://localhost:8000';

export interface SkinQualityResponse {
  status: string;
  global_score: number;
  results: {
    wrinkles: any;
    acne: any;
    melasma: any;
    oiliness: any;
    rosacea: any;
  };
}

/**
 * Envia a imagem do rosto do paciente para a Controller Principal (/analyze/all) 
 * que dispara a árvore completa de diagnóstico dermatológico.
 */
export async function analyzeSkinQuality(file: File): Promise<SkinQualityResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${API_BASE_URL}/analyze/all`, {
      method: 'POST',
      body: formData,
      // Não adicionamos "Content-Type: multipart/form-data",
      // pois o fetch e o FormData fazem a inclusão correta dos boundaries sozinhos.
    });
    
    if (!response.ok) {
        throw new Error(`Erro na API do Render: ${response.status} - ${response.statusText}`);
    }
    
    const result: SkinQualityResponse = await response.json();
    return result;
    
  } catch (error) {
    console.error('Falha de Comunicação com a IA Base:', error);
    throw error;
  }
}
