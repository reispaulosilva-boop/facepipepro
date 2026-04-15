'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CanvasEditor } from '@/components/clinical/CanvasEditor';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import styles from './page.module.css';

export default function FacialStructurePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = React.useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  // No mobile, escondemos o header se estiver "editando" (imagem carregada)
  const showHeader = !isMobile || !isEditing;

  return (
    <div className={`${styles.container} ${isMobile ? styles.mobile : ''}`}>
      {showHeader && (
        <header className={styles.header}>
          <div className={styles.left}>
            <Link href="/dashboard" className={styles.backBtn}>←</Link>
            <div className={styles.titleInfo}>
              <h1>Estrutura Facial</h1>
              {!isMobile && <p>Avaliação Estética & Mapeamento Anatômico</p>}
            </div>
          </div>
          <div className={styles.logo}>
            FACEPIPE <span className={styles.pro}>PRO</span>
          </div>
        </header>
      )}

      <main className={styles.main}>
        <CanvasEditor onImageChange={(loaded) => setIsEditing(loaded)} />
      </main>
    </div>
  );
}
