
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
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
  query,
  getDocs,
  getDoc,
  updateDoc
} from 'firebase/firestore';

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

let app: any, auth: any, db: any;
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

const TRANSLATIONS: Record<LanguageCode, any> = {
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
        delete_cat_msg: 'Tem certeza que deseja excluir "{name}" e todos os seus itens? Essa ação não pode ser desfeita.',
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
        logout: 'Sair',
        save_error: 'Erro ao salvar dados. Verifique o tamanho da imagem.'
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
        delete_cat_msg: 'Are you sure you want to delete "{name}" and all its items? This cannot be undone.',
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
        delete_item_msg: 'Are you sure you want to delete this item? This cannot be undone.',
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
        logout: 'Logout',
        save_error: 'Error saving data. Check image size.'
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
        demo_mode: 'Modo Demo (Offline) Ativo',
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
        delete_cat_msg: '¿Seguro que deseas eliminar "{name}" y todos sus artículos? Esto no se puede deshacer.',
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
        delete_item_msg: '¿Seguro que deseas eliminar este artículo? Esto no se puede deshacer.',
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
        active_users: 'Usuarios Activos',
        logout: 'Salir',
        save_error: 'Error al guardar los datos. Verifique el tamaño de la imagen.'
    }
};

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: string, params?: Record<string, string>) => string;
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

// Compress image more aggressively to stay under Firestore 1MB document limit
const compressImage = (base64: string, maxWidth: number = 600): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No context');
            ctx.drawImage(img, 0, 0, width, height);
            // Low quality (0.5) to ensure size stays small even for large mobile photos
            resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.onerror = (e) => reject(e);
    });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- COMPONENTS ---

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const { theme, setTheme, font, setFont } = useContext(ThemeContext);
    const { language, setLanguage, t } = useContext(LanguageContext);
    const { logout } = useContext(AuthContext);

    const themeOptions: {id: ThemeName, label: string}[] = [
        { id: 'pink', label: 'Rosa' },
        { id: 'blue', label: 'Azul' },
        { id: 'mint', label: 'Menta' },
        { id: 'lavender', label: 'Lilás' },
        { id: 'cream', label: 'Creme' }
    ];

    const fontOptions: FontFamily[] = ['Poppins', 'Roboto', 'Playfair Display', 'Dancing Script'];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content neumorphic" onClick={e => e.stopPropagation()}>
                <h3>{t('appearance')}</h3>
                
                <div className="form-group">
                    <label>{t('theme_color')}</label>
                    <div className="theme-grid">
                        {themeOptions.map(opt => (
                            <div key={opt.id} className="theme-item" onClick={() => setTheme(opt.id)}>
                                <div 
                                    className={`theme-preview ${theme === opt.id ? 'active' : ''}`}
                                    style={{ backgroundColor: THEMES[opt.id].primary }}
                                ></div>
                                <span>{opt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('font_style')}</label>
                    <select 
                        value={font} 
                        onChange={(e) => setFont(e.target.value as FontFamily)}
                        className="form-select neumorphic-inset"
                    >
                        {fontOptions.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>{t('language')}</label>
                    <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                        className="form-select neumorphic-inset"
                    >
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>
                </div>

                <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => { logout(); onClose(); }} className="modal-btn neumorphic danger">{t('logout')}</button>
                    <button onClick={onClose} className="modal-btn neumorphic primary">{t('done')}</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useContext(LanguageContext);
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content neumorphic" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="modal-btn neumorphic">{t('cancel')}</button>
          <button onClick={onConfirm} className="modal-btn neumorphic danger">{t('delete')}</button>
        </div>
      </div>
    </div>
  );
};

const CategoryModal = ({ onSave, onCancel, category }: { onSave: (name: string) => void, onCancel: () => void, category?: Category }) => {
  const [name, setName] = useState(category?.name || '');
  const { t } = useContext(LanguageContext);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content neumorphic" onClick={e => e.stopPropagation()}>
        <h3>{category ? t('edit_category') : t('new_category')}</h3>
        <div className="form-group">
          <label htmlFor="categoryName">{t('category_name')}</label>
          <input
            id="categoryName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input neumorphic-inset"
            placeholder="ex: Batons"
            aria-label={t('category_name')}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="modal-btn neumorphic">{t('cancel')}</button>
          <button onClick={handleSave} className="modal-btn neumorphic primary">{t('save')}</button>
        </div>
      </div>
    </div>
  );
};

const ItemDetailsScreen = ({ item, onBack, onEdit, onDelete }: { item: MakeupItem, onBack: () => void, onEdit: () => void, onDelete: () => void }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { t } = useContext(LanguageContext);

    return (
        <div className="screen">
            <div className="header">
                <button onClick={onBack} className="back-btn" aria-label={t('back')}>←</button>
                <h2>{t('details')}</h2>
                <div style={{width: '40px'}}></div>
            </div>

            <div className="details-container">
                <div className="details-image-container neumorphic">
                    {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.title} className="details-image" />
                    ) : (
                        <div className="details-no-image">{t('no_image')}</div>
                    )}
                </div>

                <div className="details-card neumorphic">
                    <h3 className="details-title">{item.title}</h3>
                    {item.marca && <p className="details-brand">{item.marca}</p>}
                    
                    <div className="details-tags">
                        {item.tipo && <span className="tag neumorphic-inset">{item.tipo}</span>}
                        {item.cor && <span className="tag neumorphic-inset">{item.cor}</span>}
                    </div>

                    {item.notes && (
                        <div className="details-notes neumorphic-inset">
                            <label>{t('notes')}:</label>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="details-actions">
                 <button onClick={() => setShowDeleteModal(true)} className="modal-btn neumorphic danger">
                    {t('delete')}
                 </button>
                 <button onClick={onEdit} className="modal-btn neumorphic primary">
                    {t('edit')}
                 </button>
            </div>

            {showDeleteModal && (
                <ConfirmModal 
                    title={t('delete_item_title')}
                    message={t('delete_item_msg')}
                    onCancel={() => setShowDeleteModal(false)}
                    onConfirm={onDelete}
                />
            )}
        </div>
    );
};

const ItemForm = ({ onSave, onCancel, item }: { onSave: (item: Omit<MakeupItem, 'id' | 'categoryId' | 'dateAdded'>) => void, onCancel: () => void, item?: MakeupItem }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [images, setImages] = useState<string[]>(item?.images || []);
  const [tipo, setTipo] = useState(item?.tipo || '');
  const [marca, setMarca] = useState(item?.marca || '');
  const [cor, setCor] = useState(item?.cor || '');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useContext(LanguageContext);

  const handleSave = () => {
    if (title.trim()) {
      onSave({ title, notes, images, tipo, marca, cor });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setIsProcessingImage(true);
      try {
        const file = event.target.files[0];
        const base64 = await fileToBase64(file);
        // Smaller maxWidth and explicit compression quality 0.5
        const compressed = await compressImage(base64, 600);
        setImages([compressed]);
      } catch (e) {
        console.error("Erro ao processar imagem", e);
        alert(t('save_error'));
      } finally {
        setIsProcessingImage(false);
      }
    }
  };
  
  const removeImage = () => {
    setImages([]);
  };

  return (
    <div className="screen">
       <div className="header">
          <button onClick={onCancel} className="back-btn" aria-label={t('back')}>←</button>
          <h2>{item ? t('edit_item') : t('add_item')}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={handleSave} disabled={isProcessingImage} className="fab neumorphic" style={{ width: '40px', height: '40px', fontSize: '20px' }}>
                {isProcessingImage ? '...' : '✓'}
             </button>
          </div>
        </div>
      <div className="form-group">
        <label htmlFor="title">{t('title')}</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input neumorphic-inset" />
      </div>
      <div className="form-group">
        <label htmlFor="tipo">{t('type')}</label>
        <input id="tipo" type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input neumorphic-inset" />
      </div>
       <div className="form-group">
        <label htmlFor="marca">{t('brand')}</label>
        <input id="marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className="form-input neumorphic-inset" />
      </div>
       <div className="form-group">
        <label htmlFor="cor">{t('color')}</label>
        <input id="cor" type="text" value={cor} onChange={(e) => setCor(e.target.value)} className="form-input neumorphic-inset" />
      </div>
      <div className="form-group">
        <label htmlFor="notes">{t('notes')}</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea neumorphic-inset" />
      </div>
       <div className="form-group">
         <label>{t('images')}</label>
         <div className="image-preview-container">
            {images.map((img, index) => (
                <div key={index} className="image-preview">
                    {img ? <img src={img} alt="Preview" /> : null}
                    <button onClick={removeImage} className="remove-image-btn" aria-label="Remover">x</button>
                </div>
            ))}
         </div>
         <div className="image-actions">
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            <button onClick={() => cameraInputRef.current?.click()} className="image-btn neumorphic">{t('camera')}</button>
            <button onClick={() => fileInputRef.current?.click()} className="image-btn neumorphic">{t('gallery')}</button>
         </div>
       </div>
    </div>
  );
};

const FilterModal = ({ brands, colors, activeFilters, onApply, onCancel }: { brands: string[], colors: string[], activeFilters: { brands: string[], colors: string[] }, onApply: (filters: { brands: string[], colors: string[] }) => void, onCancel: () => void }) => {
    const [selectedBrands, setSelectedBrands] = useState<string[]>(activeFilters.brands);
    const [selectedColors, setSelectedColors] = useState<string[]>(activeFilters.colors);
    const { t } = useContext(LanguageContext);

    const toggleBrand = (brand: string) => {
        setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
    };

    const toggleColor = (color: string) => {
        setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content neumorphic" onClick={e => e.stopPropagation()}>
                <h3>{t('filter')}</h3>
                <div className="filter-section">
                    <h4>{t('filter_by_brand')}</h4>
                    <div className="filter-options">
                        {brands.map(brand => (
                            <div key={brand} onClick={() => toggleBrand(brand)} className={`filter-option neumorphic ${selectedBrands.includes(brand) ? 'selected' : ''}`}>
                                {brand}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="filter-section">
                    <h4>{t('filter_by_color')}</h4>
                    <div className="filter-options">
                        {colors.map(color => (
                            <div key={color} onClick={() => toggleColor(color)} className={`filter-option neumorphic ${selectedColors.includes(color) ? 'selected' : ''}`}>
                                {color}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-actions">
                    <button onClick={onCancel} className="modal-btn neumorphic">{t('cancel')}</button>
                    <button onClick={() => onApply({ brands: selectedBrands, colors: selectedColors })} className="modal-btn neumorphic primary">{t('apply')}</button>
                </div>
            </div>
        </div>
    );
};

const UserListModal = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<{email: string, uid: string, isApproved: boolean}[]>([]);
  const { isDemo } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  useEffect(() => {
    if (isDemo || !db) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(d => ({ email: d.data().email, uid: d.id, isApproved: !!d.data().isApproved })));
    });
    return unsub;
  }, [isDemo]);

  const handleApprove = async (uid: string) => {
    try {
        await updateDoc(doc(db, 'users', uid), { isApproved: true });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (uid: string) => {
      if (!confirm(t('delete_user_title'))) return;
      try { await deleteDoc(doc(db, 'users', uid)); } catch (e) { console.error(e); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content neumorphic" onClick={e => e.stopPropagation()}>
        <h3>{t('users_title')}</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {users.map(u => (
                <div key={u.uid} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontSize: '0.8rem' }}>{u.email}</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {!u.isApproved && <button onClick={() => handleApprove(u.uid)} className="icon-btn success">✓</button>}
                        <button onClick={() => handleDelete(u.uid)} className="icon-btn danger">×</button>
                    </div>
                </div>
            ))}
        </div>
        <button onClick={onClose} className="modal-btn neumorphic" style={{ marginTop: '20px', width: '100%' }}>{t('close')}</button>
      </div>
    </div>
  );
}

const LoginScreen = () => {
  const { login, register, isDemo } = useContext(AuthContext);
  const { t, language, setLanguage } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email || !password) {
      setError(t('error_fill_all'));
      setLoading(false);
      return;
    }
    try {
        if (isRegistering) await register(email, password);
        else await login(email, password);
    } catch (e: any) {
        if (e.message === "ACCOUNT_PENDING") setError(t('error_pending'));
        else setError(t('error_invalid'));
    } finally { setLoading(false); }
  };

  return (
    <div className="screen login-screen">
      <div className="login-container neumorphic">
        <h2>{isRegistering ? t('create_account') : t('welcome')}</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input neumorphic-inset" placeholder={t('email')} style={{marginBottom: '10px'}} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input neumorphic-inset" placeholder={t('password')} style={{marginBottom: '15px'}} />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" disabled={loading} className="modal-btn neumorphic primary login-btn">
            {loading ? t('loading') : (isRegistering ? t('register_btn') : t('login_btn'))}
          </button>
        </form>
        <button onClick={() => { setError(''); setIsRegistering(!isRegistering); }} className="toggle-auth-btn">
          {isRegistering ? t('have_account') : t('no_account')}
        </button>
        <div className="lang-container">
            <button className={`lang-btn ${language === 'pt' ? 'active' : ''}`} onClick={() => setLanguage('pt')}>PT</button>
            <button className={`lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
            <button className={`lang-btn ${language === 'es' ? 'active' : ''}`} onClick={() => setLanguage('es')}>ES</button>
        </div>
      </div>
    </div>
  );
};

const ItemListScreen = ({ category, items, onBack, onSaveItem, onDeleteItem, allItems }: { category: Category, items: MakeupItem[], onBack: () => void, onSaveItem: any, onDeleteItem: any, allItems: MakeupItem[] }) => {
  const [editingItem, setEditingItem] = useState<MakeupItem | null | 'new'>(null);
  const [viewingItem, setViewingItem] = useState<MakeupItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAdded-desc');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<{ brands: string[], colors: string[] }>({ brands: [], colors: [] });
  const { t } = useContext(LanguageContext);

  const uniqueBrands = useMemo(() => Array.from(new Set(allItems.map(i => i.marca).filter(Boolean))), [allItems]);
  const uniqueColors = useMemo(() => Array.from(new Set(allItems.map(i => i.cor).filter(Boolean))), [allItems]);

  const filteredItems = useMemo(() => {
    let list = items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filters.brands.length) list = list.filter(i => filters.brands.includes(i.marca));
    if (filters.colors.length) list = list.filter(i => filters.colors.includes(i.cor));
    
    const [key, dir] = sortOrder.split('-');
    list.sort((a, b) => {
        let valA = (a as any)[key], valB = (b as any)[key];
        if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
        if (valA < valB) return dir === 'asc' ? -1 : 1;
        if (valA > valB) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    return list;
  }, [items, searchTerm, sortOrder, filters]);

  if (editingItem) {
    return (
      <ItemForm
        item={editingItem === 'new' ? undefined : editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={async (data) => {
          const success = await onSaveItem(editingItem === 'new' ? null : editingItem, data);
          if (success) {
            setEditingItem(null);
            if (viewingItem) setViewingItem({ ...viewingItem, ...data });
          }
        }}
      />
    );
  }

  if (viewingItem) {
      return (
          <ItemDetailsScreen 
            item={viewingItem}
            onBack={() => setViewingItem(null)}
            onEdit={() => setEditingItem(viewingItem)}
            onDelete={() => { onDeleteItem(viewingItem.id); setViewingItem(null); }}
          />
      );
  }

  return (
    <div className="screen">
      <div className="header">
         <button onClick={onBack} className="back-btn">←</button>
        <h2>{category.name}</h2>
        <button onClick={() => setEditingItem('new')} className="fab neumorphic">+</button>
      </div>
      <div className="controls">
        <div className="search-sort-container">
            <input type="text" placeholder={t('search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input neumorphic-inset" />
            <button onClick={() => setShowFilterModal(true)} className="filter-btn neumorphic">{t('filter')}</button>
        </div>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="sort-select neumorphic-inset">
          <option value="dateAdded-desc">{t('sort_date_desc')}</option>
          <option value="dateAdded-asc">{t('sort_date_asc')}</option>
          <option value="title-asc">{t('sort_az')}</option>
          <option value="title-desc">{t('sort_za')}</option>
        </select>
      </div>
      <div className="item-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="item-card neumorphic" onClick={() => setViewingItem(item)}>
            {item.images && item.images[0] ? <img src={item.images[0]} alt={item.title} /> : <div style={{width:'80px',height:'80px',background:'#ddd',borderRadius:'10px',marginBottom:'10px'}}></div>}
            <h4>{item.title}</h4>
            <p>{item.marca}</p>
          </div>
        ))}
      </div>
       {showFilterModal && <FilterModal brands={uniqueBrands} colors={uniqueColors} activeFilters={filters} onApply={(f) => { setFilters(f); setShowFilterModal(false); }} onCancel={() => setShowFilterModal(false)} />}
    </div>
  );
};

const CategoryListScreen = ({ data, onSelectCategory, onSaveCategory, onDeleteCategory }: any) => {
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  return (
    <div className="screen">
      <div className="header">
        <h1>{t('inventory')}</h1>
        <div style={{display: 'flex', gap: '10px'}}>
            {user?.email === 'yagomdd@gmail.com' && <button onClick={() => setShowAdmin(true)} className="fab neumorphic" style={{fontSize: '14px', width: 'auto', padding: '0 10px'}}>🛡️</button>}
            <button onClick={() => setEditingCategory('new')} className="fab neumorphic">+</button>
        </div>
      </div>
      <div className="card-list">
        {data.categories.map((c: any) => (
          <div key={c.id} className="card neumorphic" onClick={() => onSelectCategory(c)}>
            <div className="card-content">
              <h3>{c.name}</h3>
              <p>{data.items.filter((i: any) => i.categoryId === c.id).length} {t('items_count')}</p>
            </div>
            <div className="card-actions">
                <button onClick={(e) => { e.stopPropagation(); setEditingCategory(c); }} className="icon-btn">✎</button>
                <button onClick={(e) => { e.stopPropagation(); setDeletingCategory(c); }} className="icon-btn delete">×</button>
            </div>
          </div>
        ))}
      </div>
      <button className="settings-fab neumorphic" onClick={() => setShowSettings(true)}>⚙</button>
      {editingCategory && <CategoryModal category={editingCategory === 'new' ? undefined : editingCategory} onCancel={() => setEditingCategory(null)} onSave={(n) => { onSaveCategory(editingCategory === 'new' ? null : editingCategory, n); setEditingCategory(null); }} />}
      {deletingCategory && <ConfirmModal title={t('delete_cat_title')} message={t('delete_cat_msg', { name: deletingCategory.name })} onConfirm={() => { onDeleteCategory(deletingCategory.id); setDeletingCategory(null); }} onCancel={() => setDeletingCategory(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAdmin && <UserListModal onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

const MainApp = () => {
  const { user, isDemo } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [data, setData] = useState<AppData>({ categories: [], items: [] });
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const storageKey = user ? `makeup_inventory_${user.email}` : 'makeup_inventory_temp';
  const [localData, setLocalData] = useLocalStorage<AppData>(storageKey, { categories: [], items: [] });

  useEffect(() => {
    if (isDemo || !user?.uid || !db) { setData(localData); return; }
    const unsubCats = onSnapshot(collection(db, `users/${user.uid}/categories`), (snap) => {
        setData(prev => ({ ...prev, categories: snap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[] }));
    });
    const unsubItems = onSnapshot(collection(db, `users/${user.uid}/items`), (snap) => {
        setData(prev => ({ ...prev, items: snap.docs.map(d => ({ id: d.id, ...d.data() })) as MakeupItem[] }));
    });
    return () => { unsubCats(); unsubItems(); };
  }, [isDemo, user, localData]);

  const handleSaveCategory = async (cat: Category | null, name: string) => {
    try {
        if (isDemo) {
            const newList = cat ? localData.categories.map(c => c.id === cat.id ? { ...c, name } : c) : [...localData.categories, { id: generateId(), name }];
            setLocalData({ ...localData, categories: newList });
        } else if (user?.uid && db) {
            const id = cat?.id || generateId();
            await setDoc(doc(db, `users/${user.uid}/categories`, id), { name, id });
        }
    } catch (e) { 
        console.error("Rejeição ao salvar categoria:", e); 
        alert(t('save_error'));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
        if (isDemo) setLocalData({ categories: localData.categories.filter(c => c.id !== id), items: localData.items.filter(i => i.categoryId !== id) });
        else await deleteDoc(doc(db, `users/${user.uid}/categories`, id));
    } catch (e) { console.error("Rejeição ao deletar categoria:", e); }
  };

  const handleSaveItem = async (item: MakeupItem | null, update: any) => {
    try {
        const id = item?.id || generateId();
        const catId = activeCategory?.id || item?.categoryId;
        if (!catId) return false;

        if (isDemo) {
            const newItem = { ...update, id, categoryId: catId, dateAdded: item?.dateAdded || Date.now() };
            const newList = item ? localData.items.map(i => i.id === item.id ? newItem : i) : [...localData.items, newItem];
            setLocalData({ ...localData, items: newList });
            return true;
        } else if (user?.uid && db) {
            // Document write will fail if size > 1MB. compressImage logic should prevent this.
            await setDoc(doc(db, `users/${user.uid}/items`, id), { ...update, id, categoryId: catId, dateAdded: item?.dateAdded || Date.now() });
            return true;
        }
        return false;
    } catch (e) { 
        console.error("Rejeição ao salvar item:", e); 
        alert(t('save_error'));
        return false;
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
        if (isDemo) setLocalData({ ...localData, items: localData.items.filter(i => i.id !== id) });
        else await deleteDoc(doc(db, `users/${user.uid}/items`, id));
    } catch (e) { console.error("Rejeição ao deletar item:", e); }
  };

  return activeCategory ? <ItemListScreen category={activeCategory} items={data.items.filter(i => i.categoryId === activeCategory.id)} onBack={() => setActiveCategory(null)} onSaveItem={handleSaveItem} onDeleteItem={handleDeleteItem} allItems={data.items} /> 
                        : <CategoryListScreen data={data} onSelectCategory={setActiveCategory} onSaveCategory={handleSaveCategory} onDeleteCategory={handleDeleteCategory} />;
};

// Explicitly made children optional
const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
    const isDemo = !isFirebaseConfigured;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isDemo) {
            const saved = window.localStorage.getItem('makeup_active_user');
            if (saved) setUser(JSON.parse(saved));
            setLoading(false);
        } else if (auth) {
            return onAuthStateChanged(auth, async (u) => {
                if (u) setUser({ email: u.email || '', uid: u.uid });
                else setUser(null);
                setLoading(false);
            });
        } else setLoading(false);
    }, [isDemo]);

    const login = async (email: string, password?: string) => {
        if (isDemo) {
            const dbL = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
            if (!dbL[email] || dbL[email].password !== password) throw new Error('Invalid');
            setUser({ email });
            window.localStorage.setItem('makeup_active_user', JSON.stringify({ email }));
        } else {
            const cred = await signInWithEmailAndPassword(auth, email, password || '');
            const uDoc = await getDoc(doc(db, 'users', cred.user.uid));
            if (!uDoc.exists() || (!uDoc.data().isApproved && email !== 'yagomdd@gmail.com')) {
                await signOut(auth);
                throw new Error("ACCOUNT_PENDING");
            }
        }
    };

    const register = async (email: string, password: string) => {
        if (isDemo) {
            const dbL = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
            if (dbL[email]) throw new Error('Exists');
            dbL[email] = { password };
            window.localStorage.setItem('makeup_users_db', JSON.stringify(dbL));
            setUser({ email });
            window.localStorage.setItem('makeup_active_user', JSON.stringify({ email }));
        } else {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const isAdm = email === 'yagomdd@gmail.com';
            await setDoc(doc(db, 'users', cred.user.uid), { email, uid: cred.user.uid, isApproved: isAdm, createdAt: Date.now() });
            if (!isAdm) { await signOut(auth); throw new Error("ACCOUNT_PENDING"); }
        }
    };

    const logout = () => {
        if (isDemo) { setUser(null); window.localStorage.removeItem('makeup_active_user'); }
        else signOut(auth);
    };

    return <AuthContext.Provider value={{ user, login, register, logout, loading, isDemo }}>{children}</AuthContext.Provider>;
};

// Explicitly made children optional
const LanguageProvider = ({ children }: { children?: React.ReactNode }) => {
    const [language, setLanguage] = useLocalStorage<LanguageCode>('makeup_app_lang', 'pt');
    const t = (key: string, params?: any) => {
        let text = (TRANSLATIONS[language] as any)?.[key] || (TRANSLATIONS['pt'] as any)?.[key] || key;
        if (params) Object.keys(params).forEach(p => { text = text.replace(`{${p}}`, params[p]); });
        return text;
    };
    return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

// Explicitly made children optional
const ThemeProvider = ({ children }: { children?: React.ReactNode }) => {
    const [theme, setTheme] = useLocalStorage<ThemeName>('makeup_app_theme', 'pink');
    const [font, setFont] = useLocalStorage<FontFamily>('makeup_app_font', 'Poppins');
    useEffect(() => {
        const root = document.documentElement;
        const cur = THEMES[theme];
        root.style.setProperty('--primary-color', cur.primary);
        root.style.setProperty('--shadow-dark', cur.shadowDark);
        root.style.setProperty('--shadow-light', cur.shadowLight);
        root.style.setProperty('--accent-color', cur.accent);
        root.style.setProperty('--text-color', cur.text);
        root.style.setProperty('--font-family', `"${font}", sans-serif`);
    }, [theme, font]);
    return <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>{children}</ThemeContext.Provider>;
};

const App = () => {
  return (
    <LanguageProvider>
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    </LanguageProvider>
  );
}

const AppContent = () => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="screen" style={{justifyContent: 'center', alignItems: 'center'}}>Loading...</div>;
    return user ? <MainApp /> : <LoginScreen />;
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
