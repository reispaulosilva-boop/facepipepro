import React from 'react';
import styles from './page.module.css';

export const metadata = {
  title: 'Qualidade da Pele - FacePipe Pro',
  description: 'Análise Clínica Aprofundada em Acnes, Melasma, Rugas, Oleosidade e Rosácea.',
};

export default function SkinQualityPage() {
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
          <div className={styles.uploadPrompt}>
            <p>Arraste uma fotografia clínica para iniciar análise dermatológica.</p>
            <span className={styles.uploadBtn}>Upload Imagem</span>
          </div>
        </section>

        {/* Lado Direito: Resultados e Controle Dimensional */}
        <aside className={styles.resultsArea}>
          <div className={styles.panelHeader}>
            <h2>Diagnóstico Integrado</h2>
            <p>Aguardando processamento na nuvem...</p>
          </div>
          
          <div className={styles.parametersList}>
            <div className={styles.parameterItem}>
              <span>1. Mapa de Rugas</span>
              <div className={styles.pendingBadge}>Pendente</div>
            </div>
            <div className={styles.parameterItem}>
              <span>2. Segmentação Acneica</span>
              <div className={styles.pendingBadge}>Pendente</div>
            </div>
            <div className={styles.parameterItem}>
              <span>3. Concentração Melasma (Grad-CAM)</span>
              <div className={styles.pendingBadge}>Pendente</div>
            </div>
            <div className={styles.parameterItem}>
              <span>4. Índice Sépico (Oleosidade)</span>
              <div className={styles.pendingBadge}>Pendente</div>
            </div>
            <div className={styles.parameterItem}>
              <span>5. Eritema Ativo (Rosácea)</span>
              <div className={styles.pendingBadge}>Pendente</div>
            </div>
          </div>
          
          <button className={styles.analyzeButton} disabled>
            Analisar Paciente
          </button>
        </aside>
      </main>
    </div>
  );
}
