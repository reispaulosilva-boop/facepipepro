"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import { analyzeSkinQuality, SkinQualityResponse } from '@/services/skinQualityApi';

export default function SkinQualityPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<SkinQualityResponse | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Renderiza a imagem e as marcações quando elas mudam
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Ajusta o canvas ao container
      const container = canvas.parentElement;
      const maxWidth = container?.clientWidth ? container.clientWidth - 40 : 800; // padding
      const scale = Math.min(1, maxWidth / img.width);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Desenha imagem base
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Se houver resultados, desenha por cima
      if (results?.results) {
        const { acne } = results.results;
        
        // Desenha Caixas de Acne
        if (acne?.bounding_boxes && Array.isArray(acne.bounding_boxes)) {
          ctx.strokeStyle = '#ff3366'; // Vermelho/Rosa clínico
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ff3366';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          
          acne.bounding_boxes.forEach((box: any) => {
            // Ampliando artificialmente a caixa pra ficar bem visível no mock
            const padding = 30;
            const x = (box.x1 - padding);
            const y = (box.y1 - padding);
            const w = (box.x2 - box.x1) + (padding * 2);
            const h = (box.y2 - box.y1) + (padding * 2);
            
            // Escala as coordenadas do back-end para o visual
            ctx.rect(x * scale, y * scale, w * scale, h * scale);
          });
          ctx.stroke();
          
          // Efeito de "HUD"
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ff3366';
          ctx.font = 'bold 16px Arial';
          acne.bounding_boxes.forEach((box: any, index: number) => {
               ctx.fillText(`Acne #${index + 1}`, (box.x1 - 30) * scale, (box.y1 - 35) * scale);
          });
        }
      }
    };
    img.src = imageUrl;
  }, [imageUrl, results]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setResults(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setResults(null);
    }
  };

  const triggerAnalysis = async () => {
    if (!imageFile) return;
    
    setIsAnalyzing(true);
    setResults(null);
    
    try {
      const data = await analyzeSkinQuality(imageFile);
      setResults(data);
    } catch (error) {
      console.error(error);
      alert('Erro de comunicação com FaceMetric IA. Verifique os logs.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>FaceMetric</h1>
          <span className={styles.subtitle}>Módulo de Qualidade da Pele</span>
        </div>
      </header>

      <main className={styles.workspace}>
        {/* Lado Esquerdo: Área do Canvas Clínico para Foto do Paciente */}
        <section className={styles.canvasArea}>
          {!imageUrl ? (
            <div 
              className={styles.uploadPrompt}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <p>Arraste uma fotografia clínica para iniciar análise dermatológica.</p>
              <span className={styles.uploadBtn}>Upload Imagem</span>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className={styles.hiddenInput} 
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className={styles.renderContainer}>
              <canvas ref={canvasRef} className={styles.clinicalCanvas} />
              <button 
                className={styles.resetBtn} 
                onClick={() => { setImageUrl(null); setImageFile(null); setResults(null); }}
              >
                Trocar Imagem
              </button>
            </div>
          )}
        </section>

        {/* Lado Direito: Resultados e Controle Dimensional */}
        <aside className={styles.resultsArea}>
          <div className={styles.panelHeader}>
            <h2>Diagnóstico Integrado</h2>
            <p>
              {isAnalyzing ? 'Processando Redes Neurais...' : 
               results ? `Score Global: ${results.global_score}` : 'Aguardando processamento na nuvem...'}
            </p>
          </div>
          
          <div className={styles.parametersList}>
            <div className={styles.parameterItem}>
              <span>1. Mapa de Rugas</span>
              <div className={`${styles.badge} ${results?.results?.wrinkles ? styles.badgeSuccess : styles.badgePending}`}>
                {results?.results?.wrinkles ? 'Pronto' : 'Pendente'}
              </div>
            </div>
            <div className={styles.parameterItem}>
              <span>2. Segmentação Acneica</span>
              <div className={`${styles.badge} ${results?.results?.acne ? styles.badgeSuccess : styles.badgePending}`}>
                {results?.results?.acne ? `${results.results.acne.bounding_boxes.length} Lesões` : 'Pendente'}
              </div>
            </div>
            <div className={styles.parameterItem}>
              <span>3. Concentração Melasma</span>
              <div className={`${styles.badge} ${results?.results?.melasma ? styles.badgeSuccess : styles.badgePending}`}>
                {results?.results?.melasma ? 'Pronto' : 'Pendente'}
              </div>
            </div>
            <div className={styles.parameterItem}>
              <span>4. Índice Oleosidade</span>
              <div className={`${styles.badge} ${results?.results?.oiliness ? styles.badgeSuccess : styles.badgePending}`}>
                {results?.results?.oiliness ? `${results.results.oiliness.glare_percentage}%` : 'Pendente'}
              </div>
            </div>
            <div className={styles.parameterItem}>
              <span>5. Eritema Ativo (Rosácea)</span>
              <div className={`${styles.badge} ${results?.results?.rosacea ? styles.badgeSuccess : styles.badgePending}`}>
                {results?.results?.rosacea ? results.results.rosacea.severity : 'Pendente'}
              </div>
            </div>
          </div>
          
          <button 
            className={`${styles.analyzeButton} ${imageFile && !isAnalyzing ? styles.analyzeButtonActive : ''}`} 
            disabled={!imageFile || isAnalyzing}
            onClick={triggerAnalysis}
          >
            {isAnalyzing ? 'Analisando Diag...' : 'Analisar Paciente'}
          </button>
        </aside>
      </main>
    </div>
  );
}
