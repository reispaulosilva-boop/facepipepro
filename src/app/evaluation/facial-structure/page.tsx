'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CanvasEditor } from '@/components/clinical/CanvasEditor';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function FacialStructurePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Link href="/dashboard" className={styles.backBtn}>←</Link>
          <div className={styles.titleInfo}>
            <h1>Estrutura Facial</h1>
            <p>Avaliação Estética & Mapeamento Anatômico</p>
          </div>
        </div>
        <div className={styles.logo}>
          FACEPIPE <span className={styles.pro}>PRO</span>
        </div>
      </header>

      <main className={styles.main}>
        <CanvasEditor />
      </main>
    </div>
  );
}
