import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
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
  where,
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

// Verifica se a config é válida
const isFirebaseConfigured = firebaseConfig.apiKey !== "" && !firebaseConfig.apiKey.includes("SUA_API_KEY");

// Inicialização condicional
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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isDemo: boolean;
}

// --- TRANSLATIONS & LANGUAGES ---
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
        logout: 'Salir'
    }
};

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: keyof typeof TRANSLATIONS.pt, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>(null!);

// --- THEME & STYLES ---

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
    pink: {
        primary: '#f0d9e7',
        shadowDark: '#d3b8c8',
        shadowLight: '#ffffff',
        accent: '#e5a9c5',
        text: '#5b4b52'
    },
    blue: {
        primary: '#e0f2f7',
        shadowDark: '#beced4',
        shadowLight: '#ffffff',
        accent: '#81d4fa',
        text: '#455a64'
    },
    mint: {
        primary: '#e0f2f1',
        shadowDark: '#bec9c8',
        shadowLight: '#ffffff',
        accent: '#80cbc4',
        text: '#004d40'
    },
    lavender: {
        primary: '#ede7f6',
        shadowDark: '#c9c4d1',
        shadowLight: '#ffffff',
        accent: '#b39ddb',
        text: '#4527a0'
    },
    cream: {
        primary: '#fcfbf2',
        shadowDark: '#d6d5ce',
        shadowLight: '#ffffff',
        accent: '#dce775',
        text: '#5d4037'
    }
};

interface ThemeContextType {
    theme: ThemeName;
    setTheme: (t: ThemeName) => void;
    font: FontFamily;
    setFont: (f: FontFamily) => void;
}

const ThemeContext = createContext<ThemeContextType>(null!);

// --- CONTEXT ---
const AuthContext = createContext<AuthContextType>(null!);

// --- HELPER FUNCTIONS ---
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// LocalStorage Hook (only used in Demo Mode or for Settings)
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

    const themeOptions: {id: ThemeName, label: string}[] = [
        { id: 'pink', label: 'Rosa' },
        { id: 'blue', label: 'Azul' },
        { id: 'mint', label: 'Menta' },
        { id: 'lavender', label: 'Lilás' },
        { id: 'cream', label: 'Creme' }
    ];

    const fontOptions: FontFamily[] = ['Poppins', 'Roboto', 'Playfair Display', 'Dancing Script'];

    return (
        <div className="modal-overlay">
            <div className="modal-content neumorphic">
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

                <div className="modal-actions">
                    <button onClick={onClose} className="modal-btn neumorphic primary">{t('done')}</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
    const { t } = useContext(LanguageContext);
  return (
    <div className="modal-overlay">
      <div className="modal-content neumorphic">
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
    <div className="modal-overlay">
      <div className="modal-content neumorphic">
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
                <div style={{width: '40px'}}></div> {/* Spacer */}
            </div>

            <div className="details-container">
                <div className="details-image-container neumorphic">
                    {item.images.length > 0 ? (
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
                            <p>{item.notes}</p>
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

const ItemForm = ({ onSave, onCancel, onDelete, item, categoryId }: { onSave: (item: Omit<MakeupItem, 'id' | 'categoryId' | 'dateAdded'>, images: string[]) => void, onCancel: () => void, onDelete?: () => void, item?: MakeupItem, categoryId: string }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [images, setImages] = useState<string[]>(item?.images || []);
  const [tipo, setTipo] = useState(item?.tipo || '');
  const [marca, setMarca] = useState(item?.marca || '');
  const [cor, setCor] = useState(item?.cor || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useContext(LanguageContext);

  const handleSave = () => {
    if (title.trim()) {
      onSave({ title, notes, images, tipo, marca, cor }, images);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const base64Images = await Promise.all(files.map(fileToBase64));
      setImages(prev => [...prev, ...base64Images]);
    }
  };
  
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmDelete = () => {
      if (onDelete) {
          onDelete();
      }
  };

  return (
    <div className="screen">
       <div className="header">
          <button onClick={onCancel} className="back-btn" aria-label={t('back')}>←</button>
          <h2>{item ? t('edit_item') : t('add_item')}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={handleSave} className="fab neumorphic" style={{ width: '40px', height: '40px', fontSize: '20px' }} aria-label={t('save')}>✓</button>
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
                    <img src={img} alt="Pré-visualização do item de maquiagem" />
                    <button onClick={() => removeImage(index)} className="remove-image-btn" aria-label="Remover imagem">x</button>
                </div>
            ))}
         </div>
         <div className="image-actions">
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
            <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            <button onClick={() => cameraInputRef.current?.click()} className="image-btn neumorphic">{t('camera')}</button>
            <button onClick={() => fileInputRef.current?.click()} className="image-btn neumorphic">{t('gallery')}</button>
         </div>
       </div>

       {showDeleteModal && (
        <ConfirmModal
            title={t('delete_item_title')}
            message={t('delete_item_msg')}
            onConfirm={handleConfirmDelete}
            onCancel={() => setShowDeleteModal(false)}
        />
       )}
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

    const handleApply = () => {
        onApply({ brands: selectedBrands, colors: selectedColors });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content neumorphic">
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
                    <button onClick={handleApply} className="modal-btn neumorphic primary">{t('apply')}</button>
                </div>
            </div>
        </div>
    );
};

interface UserData {
    email: string;
    uid: string;
    isApproved: boolean;
}

const UserListModal = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const { isDemo } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  useEffect(() => {
    if (isDemo) {
        try {
            const dbLocal = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
            const list = Object.keys(dbLocal).map(email => ({
                email, 
                uid: email, 
                isApproved: true // Demo users are always approved
            }));
            setUsers(list);
        } catch (e) {
            setUsers([]);
        }
    } else if (db) {
        const fetchUsers = async () => {
            try {
                // Ensure the users collection is readable
                const usersSnap = await getDocs(collection(db, 'users'));
                const userList = usersSnap.docs.map(doc => ({
                    email: doc.data().email,
                    uid: doc.id,
                    isApproved: doc.data().isApproved === true
                }));
                setUsers(userList);
            } catch(e) {
                console.error("Erro ao buscar usuários do firebase", e);
                alert("Erro ao buscar usuários. Verifique o console e as regras do Firebase.");
            }
        };
        fetchUsers();
    }
  }, [isDemo]);

  const handleApproveUser = async (userToApprove: UserData) => {
      if(isDemo) return;
      try {
          if(db) {
              await updateDoc(doc(db, 'users', userToApprove.uid), {
                  isApproved: true
              });
              setUsers(prev => prev.map(u => u.uid === userToApprove.uid ? {...u, isApproved: true} : u));
          }
      } catch (e) {
          console.error("Erro ao aprovar usuário", e);
          alert("Erro ao aprovar usuário");
      }
  };

  const handleDeleteUser = async () => {
      if (!userToDelete) return;

      try {
          if (isDemo) {
              const dbLocal = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
              delete dbLocal[userToDelete.email];
              window.localStorage.setItem('makeup_users_db', JSON.stringify(dbLocal));
              window.localStorage.removeItem(`makeup_inventory_${userToDelete.email}`);
              setUsers(prev => prev.filter(u => u.email !== userToDelete.email));
          } else if (db) {
              const uid = userToDelete.uid;
              await deleteDoc(doc(db, 'users', uid));
              
              const itemsRef = collection(db, `users/${uid}/items`);
              const itemsSnap = await getDocs(itemsRef);
              itemsSnap.forEach(d => deleteDoc(d.ref));
              
              const catsRef = collection(db, `users/${uid}/categories`);
              const catsSnap = await getDocs(catsRef);
              catsSnap.forEach(d => deleteDoc(d.ref));
              
              setUsers(prev => prev.filter(u => u.uid !== uid));
          }
          setUserToDelete(null);
      } catch (e) {
          console.error("Erro ao deletar usuário", e);
      }
  };

  const pendingUsers = users.filter(u => !u.isApproved);
  const activeUsers = users.filter(u => u.isApproved);

  return (
    <div className="modal-overlay">
      <div className="modal-content neumorphic">
        <h3>{t('users_title')}</h3>
        <p style={{fontSize: '0.8rem', opacity: 0.6, marginBottom: '15px', textAlign: 'center'}}>
           {isDemo ? t('demo_users') : t('firebase_users')}
        </p>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
            {users.length === 0 ? (
                <p style={{textAlign: 'center', opacity: 0.7}}>{t('no_users')}</p>
            ) : (
                <>
                {pendingUsers.length > 0 && (
                    <div className="admin-list-section">
                        <h4>{t('pending_approval')}</h4>
                        <ul style={{listStyle: 'none', padding: 0}}>
                            {pendingUsers.map(user => (
                                <li key={user.uid} style={{padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span style={{wordBreak: 'break-all', fontSize: '0.9rem'}}>{user.email}</span>
                                    <div style={{display: 'flex', gap: '5px'}}>
                                        <button 
                                            onClick={() => handleApproveUser(user)}
                                            style={{
                                                background: 'none', border: 'none', color: '#5cb85c', cursor: 'pointer', fontSize: '1.2rem', padding: '5px'
                                            }}
                                            title={t('approve')}
                                        >
                                            ✓
                                        </button>
                                        <button 
                                            onClick={() => setUserToDelete(user)}
                                            style={{
                                                background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontSize: '1.2rem', padding: '5px'
                                            }}
                                            title={t('delete')}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="admin-list-section">
                    <h4>{t('active_users')}</h4>
                    <ul style={{listStyle: 'none', padding: 0}}>
                        {activeUsers.map(user => (
                            <li key={user.uid} style={{padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{wordBreak: 'break-all', fontSize: '0.9rem'}}>{user.email}</span>
                                {user.email !== 'yagomdd@gmail.com' && (
                                    <button 
                                        onClick={() => setUserToDelete(user)}
                                        style={{
                                            background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', fontSize: '1.2rem', padding: '5px'
                                        }}
                                        title={t('delete')}
                                    >
                                        ×
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                </>
            )}
        </div>
        <div className="modal-actions">
            <button onClick={onClose} className="modal-btn neumorphic">{t('close')}</button>
        </div>
      </div>
      
      {userToDelete && (
          <ConfirmModal 
            title={t('delete_user_title')}
            message={t('delete_user_msg', { email: userToDelete.email })}
            onCancel={() => setUserToDelete(null)}
            onConfirm={handleDeleteUser}
          />
      )}
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
  const [showUserList, setShowUserList] = useState(false);
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
    
    if (!isDemo && password.length < 6) {
        setError(t('error_invalid')); // Generic error or add specific translation for password length
        setLoading(false);
        return;
    }

    try {
        if (isRegistering) {
            await register(email, password);
        } else {
            await login(email, password);
        }
    } catch (e: any) {
        console.error(e);
        let msg = t('error_auth');
        if (e.message === "ACCOUNT_PENDING") msg = t('error_pending');
        else if (e.code === 'auth/invalid-credential') msg = t('error_invalid');
        else if (e.code === 'auth/email-already-in-use') msg = t('error_in_use');
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="screen login-screen">
      <div className="login-container neumorphic">
        <div className="login-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 100 100">
             <rect width="100" height="100" rx="20" fill="#e5a9c5"/>
             <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="white" font-family="Poppins, sans-serif" font-weight="bold">M</text>
          </svg>
        </div>
        <h2>{isRegistering ? t('create_account') : t('welcome')}</h2>
        <p className="login-subtitle">
            {isRegistering ? t('create_subtitle') : t('login_subtitle')}
        </p>
        
        {isDemo && (
             <div style={{fontSize: '0.7rem', color: '#666', marginBottom: '10px', background: '#eee', padding: '5px', borderRadius: '5px'}}>
                 {t('demo_mode')}
             </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input neumorphic-inset"
              placeholder="seu@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input neumorphic-inset"
              placeholder="******"
            />
          </div>
          
          {error && <p className="error-msg">{error}</p>}
          
          <button type="submit" disabled={loading} className="modal-btn neumorphic primary login-btn">
            {loading ? t('loading') : (isRegistering ? t('register_btn') : t('login_btn'))}
          </button>
        </form>

        <button 
          onClick={() => { setError(''); setIsRegistering(!isRegistering); }} 
          className="toggle-auth-btn"
        >
          {isRegistering ? t('have_account') : t('no_account')}
        </button>

        <div className="lang-container">
            <button className={`lang-btn ${language === 'pt' ? 'active' : ''}`} onClick={() => setLanguage('pt')}>PT</button>
            <button className={`lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
            <button className={`lang-btn ${language === 'es' ? 'active' : ''}`} onClick={() => setLanguage('es')}>ES</button>
        </div>

        {email === 'yagomdd@gmail.com' && (
             <button 
                onClick={() => setShowUserList(true)} 
                style={{marginTop: '30px', background: 'none', border: 'none', fontSize: '0.8rem', opacity: 0.5, cursor: 'pointer', textDecoration: 'underline'}}
            >
                {t('admin_link')}
            </button>
        )}
      </div>
      {showUserList && <UserListModal onClose={() => setShowUserList(false)} />}
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

  const filteredAndSortedItems = useMemo(() => {
    let processedItems = items
      .filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.notes.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(item => {
          const brandMatch = filters.brands.length === 0 || filters.brands.includes(item.marca);
          const colorMatch = filters.colors.length === 0 || filters.colors.includes(item.cor);
          return brandMatch && colorMatch;
      });

    const [key, direction] = sortOrder.split('-');
    
    processedItems.sort((a, b) => {
        let valA, valB;
        if (key === 'title') {
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
        } else if (key === 'category') {
            return 0;
        } else { // dateAdded
            valA = a.dateAdded;
            valB = b.dateAdded;
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return processedItems;
  }, [items, searchTerm, sortOrder, filters]);

  // If editing, show form
  if (editingItem) {
    return (
      <ItemForm
        categoryId={category.id}
        item={editingItem === 'new' ? undefined : editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={(newItemData, newImages) => {
          onSaveItem(editingItem === 'new' ? null : editingItem, { ...newItemData, images: newImages });
          setEditingItem(null);
          if (editingItem !== 'new') {
              setViewingItem(prev => prev ? {...prev, ...newItemData, images: newImages} : null);
          }
        }}
        onDelete={editingItem !== 'new' ? () => {
            onDeleteItem(editingItem.id);
            setEditingItem(null);
            setViewingItem(null);
        } : undefined}
      />
    );
  }

  // If viewing details, show details screen
  if (viewingItem) {
      return (
          <ItemDetailsScreen 
            item={viewingItem}
            onBack={() => setViewingItem(null)}
            onEdit={() => setEditingItem(viewingItem)}
            onDelete={() => {
                onDeleteItem(viewingItem.id);
                setViewingItem(null);
            }}
          />
      );
  }

  return (
    <div className="screen">
      <div className="header">
         <button onClick={onBack} className="back-btn" aria-label={t('back')}>←</button>
        <h2>{category.name}</h2>
        <button onClick={() => setEditingItem('new')} className="fab neumorphic" aria-label={t('add_item')}>+</button>
      </div>
      
      <div className="controls">
          <div className="search-sort-container">
             <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input neumorphic-inset"
                aria-label="Buscar itens"
            />
            <button onClick={() => setShowFilterModal(true)} className="filter-btn neumorphic" aria-label="Filtrar itens">
                {t('filter')}
            </button>
          </div>
        
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="sort-select neumorphic-inset" aria-label="Ordenar itens">
          <option value="dateAdded-desc">{t('sort_date_desc')}</option>
          <option value="dateAdded-asc">{t('sort_date_asc')}</option>
          <option value="title-asc">{t('sort_az')}</option>
          <option value="title-desc">{t('sort_za')}</option>
        </select>
      </div>

      <div className="item-grid">
        {filteredAndSortedItems.map(item => (
          <div key={item.id} className="item-card neumorphic" onClick={() => setViewingItem(item)}>
            <img src={item.images[0] || ''} alt={item.title} />
            <h4>{item.title}</h4>
            <p>{item.marca}</p>
          </div>
        ))}
      </div>
       {showFilterModal && (
            <FilterModal 
                brands={uniqueBrands}
                colors={uniqueColors}
                activeFilters={filters}
                onApply={(newFilters) => {
                    setFilters(newFilters);
                    setShowFilterModal(false);
                }}
                onCancel={() => setShowFilterModal(false)}
            />
        )}
    </div>
  );
};


const CategoryListScreen = ({ 
    data, 
    onSelectCategory, 
    onSaveCategory, 
    onDeleteCategory 
}: {
    data: AppData,
    onSelectCategory: (c: Category) => void,
    onSaveCategory: (c: Category | null, name: string) => void,
    onDeleteCategory: (id: string) => void
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null | 'new'>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const { logout, user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);

  const handleSave = (name: string) => {
    onSaveCategory(editingCategory === 'new' ? null : editingCategory, name);
    setEditingCategory(null);
  };

  const handleConfirmDelete = () => {
    if (deletingCategory) {
      onDeleteCategory(deletingCategory.id);
      setDeletingCategory(null);
    }
  };
  
  return (
    <div className="screen">
      <div className="header">
        <h1>{t('inventory')}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
            {user?.email === 'yagomdd@gmail.com' && (
                <button onClick={() => setShowUserList(true)} className="fab neumorphic" style={{ fontSize: '14px', width: 'auto', padding: '0 10px' }} title="Admin">
                    🛡️
                </button>
            )}
             <button onClick={logout} className="fab neumorphic" style={{ fontSize: '14px', width: 'auto', padding: '0 15px' }}>
                {t('logout')}
             </button>
             <button onClick={() => setEditingCategory('new')} className="fab neumorphic" aria-label={t('new_category')}>+</button>
        </div>
      </div>
      <p style={{marginBottom: '20px', fontSize: '0.9rem', opacity: 0.8}}>{t('logged_in_as')}: {user?.email}</p>
      <div className="card-list">
        {data.categories.length === 0 && (
            <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>{t('no_categories')}</p>
        )}
        {data.categories.map(category => (
          <div key={category.id} className="card neumorphic">
            <div className="card-content" onClick={() => onSelectCategory(category)}>
              <h3>{category.name}</h3>
              <p>{data.items.filter(i => i.categoryId === category.id).length} {t('items_count')}</p>
            </div>
            <div className="card-actions">
                <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingCategory(category); 
                  }} 
                  className="icon-btn" 
                  aria-label={t('edit')}
                >
                    ✎
                </button>
                <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      setDeletingCategory(category); 
                  }} 
                  className="icon-btn delete" 
                  aria-label={t('delete')}
                >
                    ×
                </button>
            </div>
          </div>
        ))}
      </div>

      <button className="settings-fab neumorphic" onClick={() => setShowSettings(true)} aria-label={t('appearance')}>
        ⚙
      </button>

      {editingCategory && (
        <CategoryModal
          category={editingCategory === 'new' ? undefined : editingCategory}
          onCancel={() => setEditingCategory(null)}
          onSave={handleSave}
        />
      )}
      {deletingCategory && (
        <ConfirmModal
          title={t('delete_cat_title')}
          message={t('delete_cat_msg', { name: deletingCategory.name })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingCategory(null)}
        />
      )}
      {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      {showUserList && <UserListModal onClose={() => setShowUserList(false)} />}
    </div>
  );
};

const MainApp = () => {
  const { user, isDemo } = useContext(AuthContext);
  
  // Local state for app data (sync with Firebase/Local)
  const [data, setData] = useState<AppData>({ categories: [], items: [] });
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  // DEMO MODE PERSISTENCE
  const storageKey = user ? `makeup_inventory_${user.email}` : 'makeup_inventory_temp';
  const [localData, setLocalData] = useLocalStorage<AppData>(storageKey, { categories: [], items: [] });

  // FIREBASE / DEMO LISTENER
  useEffect(() => {
    if (isDemo || !user?.uid || !db) {
        setData(localData);
        return;
    }

    // Real-time listeners for Firebase
    const catsQuery = collection(db, `users/${user.uid}/categories`);
    const itemsQuery = collection(db, `users/${user.uid}/items`);

    const unsubCats = onSnapshot(catsQuery, (snap) => {
        const cats = snap.docs.map(d => ({id: d.id, ...d.data()})) as Category[];
        setData(prev => ({...prev, categories: cats}));
    });

    const unsubItems = onSnapshot(itemsQuery, (snap) => {
        const items = snap.docs.map(d => ({id: d.id, ...d.data()})) as MakeupItem[];
        setData(prev => ({...prev, items: items}));
    });

    return () => {
        unsubCats();
        unsubItems();
    };

  }, [isDemo, user, localData]);

  const handleSaveCategory = async (category: Category | null, name: string) => {
    try {
        if (isDemo) {
            setLocalData(prev => {
                if (category) {
                    return { ...prev, categories: prev.categories.map(c => c.id === category.id ? { ...c, name } : c) };
                } else {
                    const newCategory = { id: generateId(), name };
                    return { ...prev, categories: [...prev.categories, newCategory] };
                }
            });
        } else if (user?.uid && db) {
            if (category) {
                await setDoc(doc(db, `users/${user.uid}/categories`, category.id), { name }, { merge: true });
            } else {
                const newRef = doc(collection(db, `users/${user.uid}/categories`));
                await setDoc(newRef, { name, id: newRef.id });
            }
        }
    } catch (e: any) {
        alert("Erro ao salvar categoria: " + e.message);
        console.error(e);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (isDemo) {
        setLocalData(prev => ({
            categories: prev.categories.filter(c => c.id !== categoryId),
            items: prev.items.filter(i => i.categoryId !== categoryId),
        }));
    } else if (user?.uid && db) {
        await deleteDoc(doc(db, `users/${user.uid}/categories`, categoryId));
    }
  };
  
  const handleSaveItem = async (item: MakeupItem | null, newItemData: Omit<MakeupItem, 'id' | 'categoryId' | 'dateAdded'>) => {
      if(!activeCategory) return;

      if (isDemo) {
        setLocalData(prev => {
            if(item){ 
                return {...prev, items: prev.items.map(i => i.id === item.id ? {...i, ...newItemData} : i)}
            } else { 
                const newItem: MakeupItem = {
                    ...newItemData,
                    id: generateId(),
                    categoryId: activeCategory.id,
                    dateAdded: Date.now()
                }
                return {...prev, items: [...prev.items, newItem]};
            }
        });
      } else if (user?.uid && db) {
          if (item) {
              await setDoc(doc(db, `users/${user.uid}/items`, item.id), newItemData, { merge: true });
          } else {
              const newRef = doc(collection(db, `users/${user.uid}/items`));
              await setDoc(newRef, {
                  ...newItemData,
                  id: newRef.id,
                  categoryId: activeCategory.id,
                  dateAdded: Date.now()
              });
          }
      }
  }
  
  const handleDeleteItem = async (itemId: string) => {
      if (isDemo) {
        setLocalData(prev => ({...prev, items: prev.items.filter(i => i.id !== itemId)}));
      } else if (user?.uid && db) {
        await deleteDoc(doc(db, `users/${user.uid}/items`, itemId));
      }
  }

  if (activeCategory) {
    return (
      <ItemListScreen
        category={activeCategory}
        items={data.items.filter(i => i.categoryId === activeCategory.id)}
        onBack={() => setActiveCategory(null)}
        onSaveItem={handleSaveItem}
        onDeleteItem={handleDeleteItem}
        allItems={data.items}
      />
    );
  }

  return (
    <CategoryListScreen
      data={data}
      onSelectCategory={setActiveCategory}
      onSaveCategory={handleSaveCategory}
      onDeleteCategory={handleDeleteCategory}
    />
  );
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const isDemo = !isFirebaseConfigured;
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isDemo) {
            const savedUser = window.localStorage.getItem('makeup_active_user');
            if (savedUser) setUser(JSON.parse(savedUser));
            setLoading(false);
        } else if (auth) {
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    // Check approval status on auth state change (e.g. page refresh)
                    // Note: Ideally this is checked at login, but good to have here too
                    // if permissions change.
                    setUser({ email: firebaseUser.email || '', uid: firebaseUser.uid });
                } else {
                    setUser(null);
                }
                setLoading(false);
            });
            return unsubscribe;
        } else {
            setLoading(false);
        }
    }, [isDemo]);

    const login = async (email: string, password?: string) => {
        if (isDemo) {
            const usersDb = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
            if (!usersDb[email] || usersDb[email].password !== password) {
                 if(!usersDb[email]) throw new Error('Usuário não encontrado.');
                 throw new Error('Senha incorreta.');
            }
            const newUser = { email };
            setUser(newUser);
            window.localStorage.setItem('makeup_active_user', JSON.stringify(newUser));
        } else if (auth) {
            const userCredential = await signInWithEmailAndPassword(auth, email, password || '');
            const uid = userCredential.user.uid;
            
            // Check Approval Status in Firestore
            if (db) {
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Admin is always approved
                    if (!userData.isApproved && email !== 'yagomdd@gmail.com') {
                        await signOut(auth); // Log them out immediately
                        throw new Error("ACCOUNT_PENDING");
                    }
                } else {
                     // Create doc if it doesn't exist (legacy users or error case)
                     // Admin gets auto approved
                     const isAdmin = email === 'yagomdd@gmail.com';
                     await setDoc(doc(db, 'users', uid), {
                        email: email,
                        uid: uid,
                        isApproved: isAdmin,
                        createdAt: Date.now()
                    });
                    if (!isAdmin) {
                        await signOut(auth);
                        throw new Error("ACCOUNT_PENDING");
                    }
                }
            }
        }
    };

    const register = async (email: string, password: string) => {
        if (isDemo) {
            const usersDb = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
            if (usersDb[email]) throw new Error('Usuário já existe.');
            
            usersDb[email] = { password };
            window.localStorage.setItem('makeup_users_db', JSON.stringify(usersDb));
            
            const newUser = { email };
            setUser(newUser);
            window.localStorage.setItem('makeup_active_user', JSON.stringify(newUser));
        } else if (auth && db) {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const isAdmin = email === 'yagomdd@gmail.com';
            
            // Create user doc with approval status
            await setDoc(doc(db, 'users', cred.user.uid), {
                email: email,
                uid: cred.user.uid,
                isApproved: isAdmin, // Only admin is auto-approved
                createdAt: Date.now()
            });

            if (!isAdmin) {
                // Sign out immediately if not admin
                await signOut(auth);
                throw new Error("ACCOUNT_PENDING");
            }
        }
    }

    const logout = () => {
        if (isDemo) {
            setUser(null);
            window.localStorage.removeItem('makeup_active_user');
        } else if (auth) {
            signOut(auth);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, isDemo }}>
            {children}
        </AuthContext.Provider>
    );
};

const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguage] = useLocalStorage<LanguageCode>('makeup_app_lang', 'pt');

    const t = (key: keyof typeof TRANSLATIONS.pt, params?: Record<string, string>) => {
        let text = TRANSLATIONS[language][key] || TRANSLATIONS['pt'][key] || key;
        if (params) {
            Object.keys(params).forEach(param => {
                text = text.replace(`{${param}}`, params[param]);
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

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useLocalStorage<ThemeName>('makeup_app_theme', 'pink');
    const [font, setFont] = useLocalStorage<FontFamily>('makeup_app_font', 'Poppins');

    useEffect(() => {
        const root = document.documentElement;
        const currentTheme = THEMES[theme];

        // Apply Colors
        root.style.setProperty('--primary-color', currentTheme.primary);
        root.style.setProperty('--shadow-dark', currentTheme.shadowDark);
        root.style.setProperty('--shadow-light', currentTheme.shadowLight);
        root.style.setProperty('--accent-color', currentTheme.accent);
        root.style.setProperty('--text-color', currentTheme.text);

        // Apply Font
        root.style.setProperty('--font-family', `"${font}", sans-serif`);

        // Update meta theme-color for browser address bar
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', currentTheme.primary);

    }, [theme, font]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
            {children}
        </ThemeContext.Provider>
    );
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

    if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
    
    if (!user) {
        return <LoginScreen />;
    }

    return <MainApp />;
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);