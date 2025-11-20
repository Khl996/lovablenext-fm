import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get language from context if available, fallback to browser language
  const getLanguage = () => {
    try {
      const stored = localStorage.getItem('language');
      return stored || (navigator.language.startsWith('ar') ? 'ar' : 'en');
    } catch {
      return 'en';
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const lang = getLanguage();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
      }
      
      return { error };
    } catch (error: any) {
      const lang = getLanguage();
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during sign in');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const lang = getLanguage();
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: redirectUrl,
        },
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(lang === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
      }
      
      return { error };
    } catch (error: any) {
      const lang = getLanguage();
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إنشاء الحساب' : 'An error occurred during sign up');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const lang = getLanguage();
      await supabase.auth.signOut();
      toast.success(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully');
    } catch (error) {
      const lang = getLanguage();
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تسجيل الخروج' : 'An error occurred during sign out');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
