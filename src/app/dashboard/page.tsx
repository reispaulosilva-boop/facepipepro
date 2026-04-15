'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          FACEPIPE <span className={styles.pro}>PRO</span>
        </div>
        <div className={styles.userInfo}>
          <span>{user?.email}</span>
          <button className={styles.signOutBtn} onClick={signOut}>Sair</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.welcome}>
          <h1>Bem-vindo à sua Estação Clínica</h1>
          <p>Selecione o módulo de análise para iniciar uma nova avaliação.</p>
        </div>

        <div className={styles.grid}>
          <Link href="/evaluation/facial-structure" className={styles.card}>
            <div className={styles.cardIcon}>📐</div>
            <div className={styles.cardContent}>
              <h2>Estrutura Facial</h2>
              <p>Mapeamento de landmarks, análise de proporções e planejamento estrutural.</p>
            </div>
            <div className={styles.cardFooter}>Iniciar Módulo →</div>
          </Link>

          <div className={`${styles.card} ${styles.cardDisabled}`}>
            <div className={styles.cardIcon}>🔬</div>
            <div className={styles.cardContent}>
              <h2>Qualidade da Pele</h2>
              <p>Análise de textura, poros, manchas e saúde do tecido dermatológico.</p>
            </div>
            <div className={styles.cardFooter}>Em breve (IA)</div>
          </div>
        </div>
      </main>
    </div>
  );
}
