
import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  getDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
// Import GoogleGenAI as per guidelines
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyB6VX3Pga-_oXuCY9sR9-0HlXyARZi-cXU",
  authDomain: "makup-inventory.firebaseapp.com",
  projectId: "makup-inventory",
  storageBucket: "makup-inventory.firebasestorage.app",
  messagingSenderId: "519099671660",
  appId: "1:519099671660:web:aa7bf498cd75cf55c06449",
  measurementId: "G-YDEGDPSYHL"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "" && !firebaseConfig.apiKey.includes("SUA_API_KEY");

let app, auth, db;
if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e) {
        console.error("Erro ao iniciar Firebase:", e);
    }
}

// --- TYPE DEFINITIONS ---
interface MakeupItem {
  id: string;
  categoryId: string;
  title: string;
  notes: string;
  images: string[];
  tipo: string;
  marca: string;
  cor: string;
  dateAdded: number;
}

interface Category {
  id: string;
  name: string;
}

interface AppData {
  categories: Category[];
  items: MakeupItem[];
}

interface User {
  email: string;
  uid?: string;
  isApproved?: boolean;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isDemo: boolean;
}

type LanguageCode = 'pt' | 'en' | 'es';

const TRANSLATIONS = {
    pt: {
        welcome: 'Bem-vindo',
        login_subtitle: 'Faça login para acessar seu inventário',
        create_account: 'Criar Conta',
        create_subtitle: 'Salve seus itens favoritos',
        email: 'Email',
        password: 'Senha',
        login_btn: 'Entrar',
        register_btn: 'Cadastrar',
        loading: 'Carregando...',
        have_account: 'Já tem uma conta? Entrar',
        no_account: 'Não tem conta? Cadastre-se',
        admin_link: 'Admin: Ver Usuários',
        error_auth: 'Erro ao autenticar.',
        error_invalid: 'Email ou senha inválidos.',
        error_pending: 'Sua conta está em análise. Aguarde a aprovação do administrador.',
        error_in_use: 'Este email já está em uso.',
        error_fill_all: 'Preencha todos os campos.',
        demo_mode: 'Modo Demo (Offline) Ativo',
        inventory: 'Inventário',
        items_count: 'itens',
        logged_in_as: 'Logado como',
        no_categories: 'Nenhuma categoria ainda. Crie uma!',
        new_category: 'Nova Categoria',
        edit_category: 'Editar Categoria',
        category_name: 'Nome da Categoria',
        save: 'Salvar',
        cancel: 'Cancelar',
        close: 'Fechar',
        delete: 'Excluir',
        delete_cat_title: 'Excluir Categoria',
        delete_cat_msg: 'Tem certeza que deseja excluir "{name}" e todos os seus itens?',
        appearance: 'Aparência',
        theme_color: 'Tema de Cores',
        font_style: 'Estilo de Fonte',
        language: 'Idioma',
        done: 'Concluído',
        back: 'Voltar',
        details: 'Detalhes',
        edit: 'Editar',
        no_image: 'Sem foto',
        notes: 'Notas',
        delete_item_title: 'Excluir Item',
        delete_item_msg: 'Tem certeza que deseja excluir este item? Essa ação não pode ser desfeita.',
        edit_item: 'Editar Item',
        add_item: 'Adicionar Item',
        title: 'Título',
        type: 'Tipo (ex: blush)',
        brand: 'Marca',
        color: 'Cor',
        images: 'Imagens',
        camera: 'Câmera',
        gallery: 'Galeria',
        search: 'Busca...',
        filter: 'Filtrar',
        sort: 'Ordenar',
        sort_date_desc: 'Data (Recente)',
        sort_date_asc: 'Data (Antigo)',
        sort_az: 'Nome (A-Z)',
        sort_za: 'Nome (Z-A)',
        filter_by_brand: 'Por Marca',
        filter_by_color: 'Por Cor',
        apply: 'Aplicar',
        users_title: 'Usuários Cadastrados',
        demo_users: '(Armazenados localmente - DEMO)',
        firebase_users: '(Armazenados no Firebase)',
        no_users: 'Nenhum usuário encontrado.',
        delete_user_title: 'Deletar Usuário',
        delete_user_msg: 'Tem certeza que deseja apagar os dados do usuário {email}?',
        approve: 'Aprovar',
        pending_approval: 'Aprovação Pendente',
        active_users: 'Usuários Ativos',
        logout: 'Sair'
    },
    en: {
        welcome: 'Welcome',
        login_subtitle: 'Login to access your inventory',
        create_account: 'Create Account',
        create_subtitle: 'Save your favorite items',
        email: 'Email',
        password: 'Password',
        login_btn: 'Login',
        register_btn: 'Sign Up',
        loading: 'Loading...',
        have_account: 'Already have an account? Login',
        no_account: 'No account? Sign up',
        admin_link: 'Admin: View Users',
        error_auth: 'Authentication error.',
        error_invalid: 'Invalid email or password.',
        error_pending: 'Your account is under review. Please wait for admin approval.',
        error_in_use: 'Email already in use.',
        error_fill_all: 'Please fill all fields.',
        demo_mode: 'Demo Mode (Offline) Active',
        inventory: 'Inventory',
        items_count: 'items',
        logged_in_as: 'Logged in as',
        no_categories: 'No categories yet. Create one!',
        new_category: 'New Category',
        edit_category: 'Edit Category',
        category_name: 'Category Name',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        delete: 'Delete',
        delete_cat_title: 'Delete Category',
        delete_cat_msg: 'Are you sure you want to delete "{name}" and all its items?',
        appearance: 'Appearance',
        theme_color: 'Color Theme',
        font_style: 'Font Style',
        language: 'Language',
        done: 'Done',
        back: 'Back',
        details: 'Details',
        edit: 'Edit',
        no_image: 'No image',
        notes: 'Notes',
        delete_item_title: 'Delete Item',
        delete_item_msg: 'Are you sure you want to delete this item?',
        edit_item: 'Edit Item',
        add_item: 'Add Item',
        title: 'Title',
        type: 'Type (e.g., blush)',
        brand: 'Brand',
        color: 'Color',
        images: 'Images',
        camera: 'Camera',
        gallery: 'Gallery',
        search: 'Search...',
        filter: 'Filter',
        sort: 'Sort',
        sort_date_desc: 'Date (Newest)',
        sort_date_asc: 'Date (Oldest)',
        sort_az: 'Name (A-Z)',
        sort_za: 'Name (Z-A)',
        filter_by_brand: 'By Brand',
        filter_by_color: 'By Color',
        apply: 'Apply',
        users_title: 'Registered Users',
        demo_users: '(Locally stored - DEMO)',
        firebase_users: '(Stored in Firebase)',
        no_users: 'No users found.',
        delete_user_title: 'Delete User',
        delete_user_msg: 'Are you sure you want to delete user data for {email}?',
        approve: 'Approve',
        pending_approval: 'Pending Approval',
        active_users: 'Active Users',
        logout: 'Logout'
    },
    es: {
        welcome: 'Bienvenido',
        login_subtitle: 'Inicia sesión para acceder a tu inventario',
        create_account: 'Crear Cuenta',
        create_subtitle: 'Guarda tus artículos favoritos',
        email: 'Correo',
        password: 'Contraseña',
        login_btn: 'Entrar',
        register_btn: 'Registrarse',
        loading: 'Cargando...',
        have_account: '¿Ya tienes cuenta? Entrar',
        no_account: '¿No tienes cuenta? Regístrate',
        admin_link: 'Admin: Ver Usuarios',
        error_auth: 'Error de autenticación.',
        error_invalid: 'Correo o contraseña inválidos.',
        error_pending: 'Tu cuenta está en revisión. Espera la aprobación del administrador.',
        error_in_use: 'Este correo ya está en uso.',
        error_fill_all: 'Completa todos los campos.',
        demo_mode: 'Modo Demo (Offline) Activo',
        inventory: 'Inventario',
        items_count: 'artículos',
        logged_in_as: 'Conectado como',
        no_categories: 'Aún no hay categorías. ¡Crea una!',
        new_category: 'Nueva Categoría',
        edit_category: 'Editar Categoría',
        category_name: 'Nombre de la Categoría',
        save: 'Guardar',
        cancel: 'Cancelar',
        close: 'Cerrar',
        delete: 'Eliminar',
        delete_cat_title: 'Eliminar Categoría',
        delete_cat_msg: '¿Seguro que deseas eliminar "{name}" y todos sus artículos?',
        appearance: 'Apariencia',
        theme_color: 'Tema de Color',
        font_style: 'Estilo de Fuente',
        language: 'Idioma',
        done: 'Listo',
        back: 'Volver',
        details: 'Detalles',
        edit: 'Editar',
        no_image: 'Sin imagen',
        notes: 'Notas',
        delete_item_title: 'Eliminar Artículo',
        delete_item_msg: '¿Seguro que deseas eliminar este artículo?',
        edit_item: 'Editar Artículo',
        add_item: 'Añadir Artículo',
        title: 'Título',
        type: 'Tipo (ej: rubor)',
        brand: 'Marca',
        color: 'Color',
        images: 'Imágenes',
        camera: 'Cámara',
        gallery: 'Galería',
        search: 'Buscar...',
        filter: 'Filtrar',
        sort: 'Ordenar',
        sort_date_desc: 'Fecha (Reciente)',
        sort_date_asc: 'Fecha (Antigua)',
        sort_az: 'Nombre (A-Z)',
        sort_za: 'Nombre (Z-A)',
        filter_by_brand: 'Por Marca',
        filter_by_color: 'Por Color',
        apply: 'Aplicar',
        users_title: 'Usuarios Registrados',
        demo_users: '(Almacenados localmente - DEMO)',
        firebase_users: '(Almacenados en Firebase)',
        no_users: 'No se encontraron usuarios.',
        delete_user_title: 'Eliminar Usuario',
        delete_user_msg: '¿Seguro que deseas borrar los datos del usuario {email}?',
        approve: 'Aprobar',
        pending_approval: 'Aprobación Pendiente',
        active_users: 'Usuarios Ativos',
        logout: 'Salir'
    }
};

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: keyof typeof TRANSLATIONS.pt, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>(null!);

type ThemeName = 'pink' | 'blue' | 'mint' | 'lavender' | 'cream';
type FontFamily = 'Poppins' | 'Roboto' | 'Playfair Display' | 'Dancing Script';

interface ThemeDefinition {
    primary: string;
    shadowDark: string;
    shadowLight: string;
    accent: string;
    text: string;
}

const THEMES: Record<ThemeName, ThemeDefinition> = {
    pink: { primary: '#f0d9e7', shadowDark: '#d3b8c8', shadowLight: '#ffffff', accent: '#e5a9c5', text: '#5b4b52' },
    blue: { primary: '#e0f2f7', shadowDark: '#beced4', shadowLight: '#ffffff', accent: '#81d4fa', text: '#455a64' },
    mint: { primary: '#e0f2f1', shadowDark: '#bec9c8', shadowLight: '#ffffff', accent: '#80cbc4', text: '#004d40' },
    lavender: { primary: '#ede7f6', shadowDark: '#c9c4d1', shadowLight: '#ffffff', accent: '#b39ddb', text: '#4527a0' },
    cream: { primary: '#fcfbf2', shadowDark: '#d6d5ce', shadowLight: '#ffffff', accent: '#dce775', text: '#5d4037' }
};

interface ThemeContextType {
    theme: ThemeName;
    setTheme: (t: ThemeName) => void;
    font: FontFamily;
    setFont: (f: FontFamily) => void;
}

const ThemeContext = createContext<ThemeContextType>(null!);
const AuthContext = createContext<AuthContextType>(null!);

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

/**
 * Fix: Added proper type checking and handling for Blob to avoid 'unknown' assignment errors.
 * This helper safely converts any input that should be a Blob into a base64 string.
 */
const safeBlobToBase64 = (potentialBlob: unknown): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!(potentialBlob instanceof Blob)) {
            return reject(new Error('Input is not a valid Blob'));
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Could not convert Blob to base64 string'));
            }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(potentialBlob);
    });
};

// Função para redimensionar imagem e evitar estouro de limite do Firestore (1MB)
// Se a imagem for muito grande, o Firestore recusa o documento e o snapshot deleta o item localmente.
const resizeAndCompressImage = (base64Str: string, maxWidth: number = 800, maxHeight: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');
      ctx.drawImage(img, 0, 0, width, height);
      // Reduzindo qualidade para 0.6 para garantir tamanho seguro
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
      resolve(compressedBase64);
    };
    img.onerror = (e) => reject(e);
  });
};

// --- AUTH PROVIDER ---
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(!isFirebaseConfigured);
  const [localUsers, setLocalUsers] = useLocalStorage<User[]>('makeup_demo_users', [
    { email: 'admin@makeup.com', isApproved: true, isAdmin: true }
  ]);

  useEffect(() => {
    if (!isDemo && auth) {
      return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              setUser({ ...userDoc.data(), uid: firebaseUser.uid } as User);
            } else {
              // Primeiro acesso/registro
              setUser({ email: firebaseUser.email!, uid: firebaseUser.uid, isApproved: false });
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } else {
      const savedUser = localStorage.getItem('makeup_demo_current_user');
      if (savedUser) setUser(JSON.parse(savedUser));
      setLoading(false);
    }
  }, [isDemo]);

  const login = async (email: string, password?: string) => {
    if (isDemo) {
      const found = localUsers.find(u => u.email === email);
      if (found) {
        if (!found.isApproved) throw new Error('PENDING');
        setUser(found);
        localStorage.setItem('makeup_demo_current_user', JSON.stringify(found));
      } else {
        throw new Error('INVALID');
      }
    } else {
      try {
        const res = await signInWithEmailAndPassword(auth, email, password!);
        const userDoc = await getDoc(doc(db, 'users', res.user.uid));
        const userData = userDoc.data() as User;
        if (!userData?.isApproved) {
            await signOut(auth);
            throw new Error('PENDING');
        }
        setUser({ ...userData, uid: res.user.uid });
      } catch (error: any) {
        if (error.message === 'PENDING') throw error;
        throw new Error('INVALID');
      }
    }
  };

  const register = async (email: string, password: string) => {
    if (isDemo) {
      if (localUsers.find(u => u.email === email)) throw new Error('IN_USE');
      const newUser = { email, isApproved: false };
      setLocalUsers([...localUsers, newUser]);
      throw new Error('PENDING');
    } else {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = { email, isApproved: false, isAdmin: false };
      await setDoc(doc(db, 'users', res.user.uid), newUser);
      await signOut(auth);
      throw new Error('PENDING');
    }
  };

  const logout = () => {
    if (!isDemo) signOut(auth);
    setUser(null);
    localStorage.removeItem('makeup_demo_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- LANGUAGE PROVIDER ---
const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useLocalStorage<LanguageCode>('makeup_lang', 'pt');

    const t = (key: keyof typeof TRANSLATIONS.pt, params?: Record<string, string>) => {
        let text = TRANSLATIONS[language][key] || TRANSLATIONS.pt[key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, v);
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// --- THEME PROVIDER ---
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useLocalStorage<ThemeName>('makeup_theme', 'pink');
    const [font, setFont] = useLocalStorage<FontFamily>('makeup_font', 'Poppins');

    useEffect(() => {
        const themeDef = THEMES[theme];
        const root = document.documentElement;
        root.style.setProperty('--primary-color', themeDef.primary);
        root.style.setProperty('--shadow-dark', themeDef.shadowDark);
        root.style.setProperty('--shadow-light', themeDef.shadowLight);
        root.style.setProperty('--accent-color', themeDef.accent);
        root.style.setProperty('--text-color', themeDef.text);
        root.style.setProperty('--font-family', `'${font}', sans-serif`);
    }, [theme, font]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
            {children}
        </ThemeContext.Provider>
    );
};

// --- COMPONENTS ---

const NeumorphicIcon: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div className={`neumorphic fab ${className}`} onClick={onClick}>
    {children}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  const { t } = useContext(LanguageContext);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content neumorphic" onClick={e => e.stopPropagation()}>
        <h3 style={{fontSize: '1.4rem'}}>{title}</h3>
        {children}
      </div>
    </div>
  );
};

// --- AI ASSISTANT ---

const AIAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void; items: MakeupItem[] }> = ({ isOpen, onClose, items }) => {
  const { t } = useContext(LanguageContext);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Build a small context of the user's inventory
      const inventoryBrief = items.slice(0, 10).map(i => `${i.title} (${i.marca})`).join(', ');
      const systemInstruction = "You are a world-class beauty consultant and makeup artist. Use the user's current inventory to give personalized advice.";
      
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `My inventory includes: ${inventoryBrief}. Question: ${prompt}`,
        config: { systemInstruction }
      });

      setResponse(result.text || "AI did not provide a response.");
    } catch (err) {
      console.error(err);
      setResponse("Sorry, I encountered an error connecting to the AI service.");
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState('');

  if (!isOpen) return null;

  return (
    <Modal title="AI Beauty Expert" onClose={onClose}>
      <div className="form-group">
        <label>How can I help you with your makeup today?</label>
        <textarea 
          className="form-textarea neumorphic-inset" 
          placeholder="e.g., Suggest a combination for a natural look using my items..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{height: '100px'}}
        />
      </div>
      
      {response && (
        <div className="details-notes neumorphic-inset" style={{marginBottom: '20px', maxHeight: '200px', overflowY: 'auto'}}>
          <p style={{whiteSpace: 'pre-wrap', fontSize: '0.9rem'}}>{response}</p>
        </div>
      )}

      <div className="modal-actions">
        <button className="modal-btn neumorphic" onClick={onClose}>{t('close')}</button>
        <button 
          className="modal-btn neumorphic primary" 
          onClick={handleAskAI} 
          disabled={loading}
        >
          {loading ? t('loading') : 'Ask AI'}
        </button>
      </div>
    </Modal>
  );
};

// --- SCREENS ---

const LoginScreen: React.FC = () => {
  const { login, register, isDemo } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError(t('error_fill_all'));
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: any) {
      if (err.message === 'PENDING') setError(t('error_pending'));
      else if (err.message === 'IN_USE') setError(t('error_in_use'));
      else setError(t('error_invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen login-screen">
      <div className="login-container neumorphic">
        <div className="login-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="var(--accent-color)"/>
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="60" fill="white" fontWeight="bold">M</text>
          </svg>
        </div>
        <h2 style={{fontSize: '1.8rem', marginBottom: '10px'}}>{isLogin ? t('welcome') : t('create_account')}</h2>
        <p className="login-subtitle">{isLogin ? t('login_subtitle') : t('create_subtitle')}</p>
        
        {error && <div className="error-msg">{error}</div>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input 
              type="email" 
              className="form-input neumorphic-inset" 
              placeholder={t('email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input 
              type="password" 
              className="form-input neumorphic-inset" 
              placeholder={t('password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="modal-btn login-btn neumorphic primary" disabled={loading}>
            {loading ? t('loading') : (isLogin ? t('login_btn') : t('register_btn'))}
          </button>
        </form>
        
        <button className="toggle-auth-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? t('no_account') : t('have_account')}
        </button>

        {isDemo && <p style={{marginTop: '20px', fontSize: '0.7rem', opacity: 0.5}}>{t('demo_mode')}</p>}

        <div className="lang-container">
            <button className={`lang-btn ${language === 'pt' ? 'active' : ''}`} onClick={() => setLanguage('pt')}>PT</button>
            <button className={`lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
            <button className={`lang-btn ${language === 'es' ? 'active' : ''}`} onClick={() => setLanguage('es')}>ES</button>
        </div>
      </div>
    </div>
  );
};

const AdminModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { isDemo, user } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);
    const [users, setUsers] = useState<User[]>([]);
    const [demoUsers, setDemoUsers] = useLocalStorage<User[]>('makeup_demo_users', []);

    useEffect(() => {
        if (!isDemo && db) {
            const unsub = onSnapshot(collection(db, 'users'), (snap) => {
                const list: User[] = [];
                snap.forEach(doc => list.push({ ...doc.data(), uid: doc.id } as User));
                setUsers(list);
            });
            return unsub;
        } else {
            setUsers(demoUsers);
        }
    }, [isDemo, demoUsers]);

    const handleApprove = async (u: User) => {
        if (isDemo) {
            setDemoUsers(demoUsers.map(usr => usr.email === u.email ? { ...usr, isApproved: true } : usr));
        } else {
            await updateDoc(doc(db, 'users', u.uid!), { isApproved: true });
        }
    };

    const handleDelete = async (u: User) => {
        if (u.isAdmin) return;
        if (!confirm(t('delete_user_msg', { email: u.email }))) return;
        if (isDemo) {
            setDemoUsers(demoUsers.filter(usr => usr.email !== u.email));
        } else {
            await deleteDoc(doc(db, 'users', u.uid!));
        }
    };

    const pending = users.filter(u => !u.isApproved);
    const approved = users.filter(u => u.isApproved);

    return (
        <Modal title={t('users_title')} onClose={onClose}>
            <div className="admin-list-section">
                <h4>{t('pending_approval')}</h4>
                {pending.length === 0 && <p style={{fontSize: '0.8rem', opacity: 0.5}}>{t('no_users')}</p>}
                {pending.map(u => (
                    <div key={u.email} className="card neumorphic" style={{marginBottom: '10px', padding: '10px'}}>
                        <div className="card-content">
                            <p style={{fontWeight: 600, opacity: 1}}>{u.email}</p>
                        </div>
                        <div className="card-actions">
                            <button className="icon-btn success" onClick={() => handleApprove(u)}>✓</button>
                            <button className="icon-btn danger" onClick={() => handleDelete(u)}>✕</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="admin-list-section">
                <h4>{t('active_users')}</h4>
                {approved.map(u => (
                    <div key={u.email} className="card neumorphic" style={{marginBottom: '10px', padding: '10px'}}>
                        <div className="card-content">
                            <p style={{fontWeight: 600, opacity: 1}}>{u.email}</p>
                            {u.isAdmin && <span style={{fontSize: '0.6rem', color: 'var(--accent-color)'}}>ADMIN</span>}
                        </div>
                        {!u.isAdmin && (
                            <div className="card-actions">
                                <button className="icon-btn danger" onClick={() => handleDelete(u)}>✕</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button className="modal-btn neumorphic" onClick={onClose}>{t('close')}</button>
        </Modal>
    );
};

const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { theme, setTheme, font, setFont } = useContext(ThemeContext);
    const { language, setLanguage, t } = useContext(LanguageContext);
    const { logout } = useContext(AuthContext);

    return (
        <Modal title={t('appearance')} onClose={onClose}>
            <div className="form-group">
                <label>{t('theme_color')}</label>
                <div className="theme-grid">
                    {(Object.keys(THEMES) as ThemeName[]).map(tName => (
                        <div key={tName} className="theme-item" onClick={() => setTheme(tName)}>
                            <div 
                                className={`theme-preview ${theme === tName ? 'active' : ''}`} 
                                style={{ backgroundColor: THEMES[tName].primary }}
                            />
                            <span>{tName}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="form-group">
                <label>{t('font_style')}</label>
                <select className="form-select neumorphic-inset" value={font} onChange={e => setFont(e.target.value as FontFamily)}>
                    <option value="Poppins">Poppins</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Dancing Script">Dancing Script</option>
                </select>
            </div>
            <div className="form-group">
                <label>{t('language')}</label>
                <select className="form-select neumorphic-inset" value={language} onChange={e => setLanguage(e.target.value as LanguageCode)}>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                </select>
            </div>
            <div className="modal-actions">
                <button className="modal-btn neumorphic danger" onClick={() => { logout(); onClose(); }}>{t('logout')}</button>
                <button className="modal-btn neumorphic primary" onClick={onClose}>{t('done')}</button>
            </div>
        </Modal>
    );
};

const MainScreen: React.FC = () => {
  const { user, isDemo } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MakeupItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<MakeupItem | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeleteCatOpen, setIsDeleteCatOpen] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  
  // Local storage backups for Demo mode
  const [localCategories, setLocalCategories] = useLocalStorage<Category[]>('makeup_demo_cats', []);
  const [localItems, setLocalItems] = useLocalStorage<MakeupItem[]>('makeup_demo_items', []);

  useEffect(() => {
    if (!user) return;
    if (!isDemo && db) {
      const unsubCats = onSnapshot(collection(db, `users/${user.uid}/categories`), (snap) => {
        const cats: Category[] = [];
        snap.forEach(doc => cats.push({ ...doc.data(), id: doc.id } as Category));
        setCategories(cats);
      });
      const unsubItems = onSnapshot(collection(db, `users/${user.uid}/items`), (snap) => {
        const its: MakeupItem[] = [];
        snap.forEach(doc => its.push({ ...doc.data(), id: doc.id } as MakeupItem));
        setItems(its);
      });
      return () => { unsubCats(); unsubItems(); };
    } else {
      setCategories(localCategories);
      setItems(localItems);
    }
  }, [user, isDemo, localCategories, localItems]);

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    const catData = { name: categoryName };
    if (isDemo) {
      if (editingCategory) {
        setLocalCategories(localCategories.map(c => c.id === editingCategory ? { ...c, ...catData } : c));
      } else {
        setLocalCategories([...localCategories, { id: generateId(), ...catData }]);
      }
    } else {
      const colRef = collection(db, `users/${user!.uid}/categories`);
      if (editingCategory) {
        await setDoc(doc(colRef, editingCategory), catData);
      } else {
        await setDoc(doc(colRef, generateId()), catData);
      }
    }
    setCategoryName('');
    setEditingCategory(null);
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (isDemo) {
      setLocalCategories(localCategories.filter(c => c.id !== id));
      setLocalItems(localItems.filter(i => i.categoryId !== id));
    } else {
      await deleteDoc(doc(db, `users/${user!.uid}/categories`, id));
      // In a real app, you'd also delete items. For simplicity here:
      const q = query(collection(db, `users/${user!.uid}/items`), where('categoryId', '==', id));
      const snap = await getDocs(q);
      snap.forEach(async (d) => await deleteDoc(d.ref));
    }
    setIsDeleteCatOpen(null);
  };

  const handleSaveItem = async (itemData: Partial<MakeupItem>, id?: string) => {
    if (isDemo) {
      if (id) {
        setLocalItems(localItems.map(i => i.id === id ? { ...i, ...itemData } as MakeupItem : i));
      } else {
        setLocalItems([...localItems, { id: generateId(), dateAdded: Date.now(), ...itemData } as MakeupItem]);
      }
    } else {
      const colRef = collection(db, `users/${user!.uid}/items`);
      const itemId = id || generateId();
      try {
        await setDoc(doc(colRef, itemId), { 
            ...itemData, 
            id: itemId, 
            dateAdded: itemData.dateAdded || Date.now() 
        });
      } catch (e) {
        alert("Erro ao salvar: Imagem muito grande ou erro de conexão.");
        console.error(e);
      }
    }
    setIsItemModalOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = async (id: string) => {
    if (isDemo) {
      setLocalItems(localItems.filter(i => i.id !== id));
    } else {
      await deleteDoc(doc(db, `users/${user!.uid}/items`, id));
    }
    setSelectedItem(null);
  };

  if (selectedItem) {
    return (
      <DetailsScreen 
        item={selectedItem} 
        onBack={() => setSelectedItem(null)} 
        onEdit={() => setIsItemModalOpen(true)}
        onDelete={() => { if(confirm(t('delete_item_msg'))) handleDeleteItem(selectedItem.id); }}
      />
    );
  }

  if (selectedCategory) {
    return (
      <ItemsScreen 
        category={selectedCategory} 
        items={items.filter(i => i.categoryId === selectedCategory.id)}
        onBack={() => setSelectedCategory(null)}
        onAddItem={() => setIsItemModalOpen(true)}
        onSelectItem={setSelectedItem}
      />
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <h1>{t('inventory')}</h1>
        <div style={{display: 'flex', gap: '10px'}}>
            {user?.isAdmin && (
                <NeumorphicIcon className="icon-btn" onClick={() => setIsAdminOpen(true)}>
                    <span style={{fontSize: '1.2rem'}}>🛡️</span>
                </NeumorphicIcon>
            )}
            <NeumorphicIcon className="icon-btn" onClick={() => setIsAIModalOpen(true)}>
                <span style={{fontSize: '1.2rem'}}>✨</span>
            </NeumorphicIcon>
            <NeumorphicIcon onClick={() => setIsCategoryModalOpen(true)}>+</NeumorphicIcon>
        </div>
      </div>

      <div className="card-list">
        {categories.length === 0 ? (
          <p style={{textAlign: 'center', opacity: 0.5, marginTop: '40px'}}>{t('no_categories')}</p>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="card neumorphic" onClick={() => setSelectedCategory(cat)}>
              <div className="card-content">
                <h3>{cat.name}</h3>
                <p>{items.filter(i => i.categoryId === cat.id).length} {t('items_count')}</p>
              </div>
              <div className="card-actions">
                <button className="icon-btn" onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory(cat.id);
                  setCategoryName(cat.name);
                  setIsCategoryModalOpen(true);
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button className="icon-btn delete" onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteCatOpen(cat.id);
                }}>
                  &times;
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="settings-fab neumorphic" onClick={() => setIsSettingsOpen(true)}>
        ⚙️
      </button>

      {isCategoryModalOpen && (
        <Modal title={editingCategory ? t('edit_category') : t('new_category')} onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); setCategoryName(''); }}>
          <div className="form-group">
            <label>{t('category_name')}</label>
            <input 
              className="form-input neumorphic-inset" 
              value={categoryName} 
              onChange={e => setCategoryName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button className="modal-btn neumorphic" onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); setCategoryName(''); }}>{t('cancel')}</button>
            <button className="modal-btn neumorphic primary" onClick={handleSaveCategory}>{t('save')}</button>
          </div>
        </Modal>
      )}

      {isDeleteCatOpen && (
        <Modal title={t('delete_cat_title')} onClose={() => setIsDeleteCatOpen(null)}>
          <p>{t('delete_cat_msg', { name: categories.find(c => c.id === isDeleteCatOpen)?.name || '' })}</p>
          <div className="modal-actions">
            <button className="modal-btn neumorphic" onClick={() => setIsDeleteCatOpen(null)}>{t('cancel')}</button>
            <button className="modal-btn neumorphic primary" style={{backgroundColor: '#d9534f'}} onClick={() => handleDeleteCategory(isDeleteCatOpen)}>{t('delete')}</button>
          </div>
        </Modal>
      )}

      {isItemModalOpen && (
        <ItemModal 
          categoryId={selectedCategory?.id || ''}
          item={selectedItem}
          onClose={() => setIsItemModalOpen(false)}
          onSave={handleSaveItem}
        />
      )}

      {isAdminOpen && <AdminModal onClose={() => setIsAdminOpen(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isAIModalOpen && <AIAssistantModal items={items} isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />}
    </div>
  );
};

const ItemsScreen: React.FC<{ 
  category: Category; 
  items: MakeupItem[]; 
  onBack: () => void; 
  onAddItem: () => void;
  onSelectItem: (item: MakeupItem) => void;
}> = ({ category, items, onBack, onAddItem, onSelectItem }) => {
  const { t } = useContext(LanguageContext);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [filterBrand, setFilterBrand] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (search) {
      result = result.filter(i => 
        i.title.toLowerCase().includes(search.toLowerCase()) || 
        i.marca.toLowerCase().includes(search.toLowerCase()) ||
        i.tipo.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterBrand) {
      result = result.filter(i => i.marca === filterBrand);
    }
    
    if (sort === 'newest') result.sort((a, b) => b.dateAdded - a.dateAdded);
    else if (sort === 'oldest') result.sort((a, b) => a.dateAdded - b.dateAdded);
    else if (sort === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'za') result.sort((a, b) => b.title.localeCompare(a.title));
    
    return result;
  }, [items, search, sort, filterBrand]);

  const brands = Array.from(new Set(items.map(i => i.marca))).filter(Boolean);

  return (
    <div className="screen">
      <div className="header">
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <button className="back-btn" onClick={onBack}>←</button>
          <h2>{category.name}</h2>
        </div>
        <NeumorphicIcon onClick={onAddItem}>+</NeumorphicIcon>
      </div>

      <div className="controls">
        <div className="search-sort-container">
            <input 
              className="search-input neumorphic-inset" 
              placeholder={t('search')} 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
            <select className="sort-select neumorphic-inset" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">{t('sort_date_desc')}</option>
                <option value="oldest">{t('sort_date_asc')}</option>
                <option value="az">{t('sort_az')}</option>
                <option value="za">{t('sort_za')}</option>
            </select>
            <select className="sort-select neumorphic-inset" value={filterBrand || ''} onChange={e => setFilterBrand(e.target.value || null)}>
                <option value="">{t('filter_by_brand')}</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
        </div>
      </div>

      <div className="item-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="item-card neumorphic" onClick={() => onSelectItem(item)}>
            {item.images[0] ? (
              <img src={item.images[0] || undefined} alt={item.title} />
            ) : (
              <div style={{width: '80px', height: '80px', borderRadius: '10px', backgroundColor: 'var(--shadow-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '10px'}}>💄</div>
            )}
            <h4>{item.title}</h4>
            <p>{item.marca}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const DetailsScreen: React.FC<{ 
  item: MakeupItem; 
  onBack: () => void; 
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, onBack, onEdit, onDelete }) => {
  const { t } = useContext(LanguageContext);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  return (
    <div className="screen">
      <div className="header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>{t('details')}</h2>
        <div style={{display: 'flex', gap: '10px'}}>
            <NeumorphicIcon className="icon-btn" onClick={onEdit}>✏️</NeumorphicIcon>
            <NeumorphicIcon className="icon-btn" style={{color: '#d9534f'}} onClick={onDelete}>🗑️</NeumorphicIcon>
        </div>
      </div>

      <div className="details-container">
        <div className="details-image-container neumorphic">
          {item.images.length > 0 ? (
            <>
              <img 
                src={item.images[currentImageIndex] || undefined} 
                className="details-image" 
                alt={item.title} 
              />
              {item.images.length > 1 && (
                <div style={{position: 'absolute', bottom: '10px', display: 'flex', gap: '5px'}}>
                  {item.images.map((_, i) => (
                    <div 
                      key={i} 
                      style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === currentImageIndex ? 'var(--accent-color)' : 'white', opacity: 0.8}} 
                      onClick={() => setCurrentImageIndex(i)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="details-no-image">{t('no_image')}</div>
          )}
        </div>

        <div className="details-card neumorphic">
          <h1 className="details-title">{item.title}</h1>
          <p className="details-brand">{item.marca}</p>
          
          <div className="details-tags">
            {item.tipo && <span className="tag neumorphic">{item.tipo}</span>}
            {item.cor && <span className="tag neumorphic">{item.cor}</span>}
          </div>

          <div className="details-notes neumorphic-inset">
            <label>{t('notes')}</label>
            <p style={{whiteSpace: 'pre-wrap'}}>{item.notes || '...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ItemModal: React.FC<{ 
  categoryId: string; 
  item?: MakeupItem | null; 
  onClose: () => void; 
  onSave: (data: Partial<MakeupItem>, id?: string) => void;
}> = ({ categoryId, item, onClose, onSave }) => {
  const { t } = useContext(LanguageContext);
  const [title, setTitle] = useState(item?.title || '');
  const [marca, setMarca] = useState(item?.marca || '');
  const [tipo, setTipo] = useState(item?.tipo || '');
  const [cor, setCor] = useState(item?.cor || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [images, setImages] = useState<string[]>(item?.images || []);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsCompressing(true);
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          try {
            const compressed = await resizeAndCompressImage(base64);
            setImages(prev => [...prev, compressed]);
          } catch (err) {
            console.error("Compression failed", err);
          } finally {
            setIsCompressing(false);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <Modal title={item ? t('edit_item') : t('add_item')} onClose={onClose}>
      <div className="form-group">
        <label>{t('title')}</label>
        <input className="form-input neumorphic-inset" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="form-group">
        <label>{t('brand')}</label>
        <input className="form-input neumorphic-inset" value={marca} onChange={e => setMarca(e.target.value)} />
      </div>
      <div style={{display: 'flex', gap: '15px'}}>
        <div className="form-group" style={{flex: 1}}>
            <label>{t('type')}</label>
            <input className="form-input neumorphic-inset" value={tipo} onChange={e => setTipo(e.target.value)} />
        </div>
        <div className="form-group" style={{flex: 1}}>
            <label>{t('color')}</label>
            <input className="form-input neumorphic-inset" value={cor} onChange={e => setCor(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>{t('notes')}</label>
        <textarea className="form-textarea neumorphic-inset" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      
      <div className="form-group">
        <label>{t('images')}</label>
        <div className="image-preview-container">
          {images.map((img, i) => (
            <div key={i} className="image-preview">
              <img src={img || undefined} alt="preview" />
              <button className="remove-image-btn" onClick={() => removeImage(i)}>&times;</button>
            </div>
          ))}
          <div 
            className="neumorphic-inset" 
            style={{height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.5rem'}}
            onClick={() => fileInputRef.current?.click()}
          >
            {isCompressing ? '...' : '+'}
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{display: 'none'}} 
          accept="image/*" 
          multiple 
          onChange={handleImageUpload} 
        />
      </div>

      <div className="modal-actions">
        <button className="modal-btn neumorphic" onClick={onClose}>{t('cancel')}</button>
        <button 
          className="modal-btn neumorphic primary" 
          onClick={() => onSave({ title, marca, tipo, cor, notes, images, categoryId }, item?.id)}
          disabled={isCompressing}
        >
          {t('save')}
        </button>
      </div>
    </Modal>
  );
};

// --- APP ROOT ---
const App: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  if (loading) return <div className="screen" style={{justifyContent: 'center', alignItems: 'center'}}><p>{t('loading')}</p></div>;

  return user ? <MainScreen /> : <LoginScreen />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <LanguageProvider>
        <AuthProvider>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </AuthProvider>
    </LanguageProvider>
);
