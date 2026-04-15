import React from 'react';
import { LoginForm } from '@/components/clinical/LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <div className={styles.glow} />
      <div className={styles.content}>
        <LoginForm />
      </div>
    </main>
  );
}
