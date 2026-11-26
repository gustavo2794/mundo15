'use client';

import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { checkIsAdmin, syncUserProfile } from '@/lib/firestore-service';
import { useRouter } from 'next/navigation';
import type { SignUpFormValues, LoginFormValues, UserProfile } from '@/lib/types';

interface AuthResult {
  success: boolean;
  error?: string;
}

export interface GoogleAuthOptions {
  userType?: 'quinceanera' | 'business';
  businessName?: string;
  businessCategory?: string;
  location?: string;
  cost?: '$' | '$$' | '$$$';
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (values: SignUpFormValues) => Promise<AuthResult>;
  login: (values: LoginFormValues) => Promise<AuthResult>;
  loginWithGoogle: (options?: GoogleAuthOptions) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  resendVerificationEmail: () => Promise<AuthResult>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getFriendlyErrorMessage = (error: unknown): string => {
  const code = (error as AuthError)?.code;
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está en uso. Por favor, inicia sesión o usa otro correo.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo electrónico o contraseña incorrectos.';
    case 'auth/operation-not-allowed':
      return 'El método de correo y contraseña debe habilitarse en Firebase Console (Authentication → Sign-in method).';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google antes de completar el inicio de sesión.';
    case 'auth/popup-blocked':
      return 'Tu navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos seguidos. Espera unos minutos antes de volver a intentarlo.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu acceso a internet e intenta de nuevo.';
    default:
      return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUserContext = useCallback(async (firebaseUser: User | null, signupExtra?: {
    userType?: 'quinceanera' | 'business';
    businessName?: string;
    businessCategory?: string;
    location?: string;
    cost?: '$' | '$$' | '$$$';
    phone?: string;
  }) => {
    if (!firebaseUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    try {
      const adminStatus = await checkIsAdmin(firebaseUser);
      setIsAdmin(adminStatus);

      if (firebaseUser.emailVerified || signupExtra) {
        let pendingPhone = signupExtra?.phone;
        if (!pendingPhone && typeof window !== 'undefined') {
          const savedPhone = window.localStorage.getItem(`pendingPhone_${firebaseUser.uid}`);
          if (savedPhone) {
            pendingPhone = savedPhone;
            window.localStorage.removeItem(`pendingPhone_${firebaseUser.uid}`);
          }
        }
        const synced = await syncUserProfile(firebaseUser, {
          phone: pendingPhone,
          userType: signupExtra?.userType,
          businessName: signupExtra?.businessName,
          businessCategory: signupExtra?.businessCategory,
          location: signupExtra?.location,
          cost: signupExtra?.cost,
        });
        setProfile(synced);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error al cargar el perfil y rol del usuario:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        await loadUserContext(firebaseUser);
        setLoading(false);
      },
      (error) => {
        console.error('Error en el estado de autenticación:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [loadUserContext]);

  const signUp = async (values: SignUpFormValues): Promise<AuthResult> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      await updateProfile(userCredential.user, {
        displayName: values.name,
      });

      if (values.phone?.trim() && typeof window !== 'undefined') {
        window.localStorage.setItem(
          `pendingPhone_${userCredential.user.uid}`,
          values.phone.trim()
        );
      }

      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyError) {
        console.error('Error al enviar correo de verificación:', verifyError);
      }

      setUser(auth.currentUser);
      await loadUserContext(auth.currentUser, {
        userType: values.userType,
        businessName: values.businessName,
        businessCategory: values.businessCategory,
        location: values.location,
        cost: values.cost,
        phone: values.phone,
      });
      router.push('/academies');
      return { success: true };
    } catch (error) {
      console.error('Error en el registro:', error);
      return { success: false, error: getFriendlyErrorMessage(error) };
    }
  };

  const login = async (values: LoginFormValues): Promise<AuthResult> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await loadUserContext(credential.user);
      router.push('/academies');
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { success: false, error: getFriendlyErrorMessage(error) };
    }
  };

  const loginWithGoogle = async (options?: GoogleAuthOptions): Promise<AuthResult> => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await loadUserContext(credential.user, options);
      router.push('/academies');
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      return { success: false, error: getFriendlyErrorMessage(error) };
    }
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (error) {
      console.error('Error al enviar correo de recuperación:', error);
      return { success: false, error: getFriendlyErrorMessage(error) };
    }
  };

  const resendVerificationEmail = async (): Promise<AuthResult> => {
    if (!auth.currentUser) {
      return { success: false, error: 'No hay una sesión activa.' };
    }
    try {
      await sendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (error) {
      console.error('Error al reenviar verificación:', error);
      return { success: false, error: getFriendlyErrorMessage(error) };
    }
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser } as User);
      await loadUserContext(auth.currentUser);
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
    }
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    await loadUserContext(auth.currentUser);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setIsAdmin(false);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        signUp,
        login,
        loginWithGoogle,
        sendPasswordReset,
        resendVerificationEmail,
        refreshUser,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
