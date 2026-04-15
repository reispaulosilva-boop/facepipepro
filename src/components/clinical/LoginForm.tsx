'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '@/lib/supabase';
import styles from './LoginForm.module.css';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleLogin}>
      <div className={styles.header}>
        <h1 className={styles.title}>FACEPIPE <span className={styles.pro}>PRO</span></h1>
        <p className={styles.subtitle}>Plataforma de Avaliação Clínica Especializada</p>
      </div>

      <div className={styles.inputs}>
        <Input 
          label="Email Profissional" 
          type="email" 
          placeholder="exemplo@clinica.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input 
          label="Senha" 
          type="password" 
          placeholder="••••••••" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <Button type="submit" isLoading={loading} className={styles.submitBtn}>
        Acessar Sistema
      </Button>

      <div className={styles.footer}>
        <p>Apenas acesso autorizado para profissionais de saúde.</p>
      </div>
    </form>
  );
};
