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
  where
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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isDemo: boolean;
}

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
                <h3>Aparência</h3>
                
                <div className="form-group">
                    <label>Tema de Cores</label>
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
                    <label>Fonte do Texto</label>
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

                <div className="modal-actions">
                    <button onClick={onClose} className="modal-btn neumorphic primary">Concluído</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content neumorphic">
        <h3>{title}</h3>
        <p style={{ textAlign: 'center', marginBottom: '20px' }}>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="modal-btn neumorphic">Cancelar</button>
          <button onClick={onConfirm} className="modal-btn neumorphic danger">Excluir</button>
        </div>
      </div>
    </div>
  );
};

const CategoryModal = ({ onSave, onCancel, category }: { onSave: (name: string) => void, onCancel: () => void, category?: Category }) => {
  const [name, setName] = useState(category?.name || '');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content neumorphic">
        <h3>{category ? 'Editar Categoria' : 'Nova Categoria'}</h3>
        <div className="form-group">
          <label htmlFor="categoryName">Nome da Categoria</label>
          <input
            id="categoryName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input neumorphic-inset"
            placeholder="ex: Batons"
            aria-label="Nome da Categoria"
          />
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="modal-btn neumorphic">Cancelar</button>
          <button onClick={handleSave} className="modal-btn neumorphic primary">Salvar</button>
        </div>
      </div>
    </div>
  );
};

const ItemDetailsScreen = ({ item, onBack, onEdit, onDelete }: { item: MakeupItem, onBack: () => void, onEdit: () => void, onDelete: () => void }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    return (
        <div className="screen">
            <div className="header">
                <button onClick={onBack} className="back-btn" aria-label="Voltar">←</button>
                <h2>Detalhes</h2>
                <div style={{width: '40px'}}></div> {/* Spacer */}
            </div>

            <div className="details-container">
                <div className="details-image-container neumorphic">
                    {item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.title} className="details-image" />
                    ) : (
                        <div className="details-no-image">Sem foto</div>
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
                            <label>Notas:</label>
                            <p>{item.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="details-actions">
                 <button onClick={() => setShowDeleteModal(true)} className="modal-btn neumorphic danger">
                    Excluir
                 </button>
                 <button onClick={onEdit} className="modal-btn neumorphic primary">
                    Editar
                 </button>
            </div>

            {showDeleteModal && (
                <ConfirmModal 
                    title="Excluir Item"
                    message="Tem certeza que deseja excluir este item?"
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

  const handleDeleteClick = () => {
      setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
      if (onDelete) {
          onDelete();
      }
  };

  return (
    <div className="screen">
       <div className="header">
          <button onClick={onCancel} className="back-btn" aria-label="Voltar">←</button>
          <h2>{item ? 'Editar Item' : 'Adicionar Item'}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={handleSave} className="fab neumorphic" style={{ width: '40px', height: '40px', fontSize: '20px' }} aria-label="Salvar item">✓</button>
          </div>
        </div>
      <div className="form-group">
        <label htmlFor="title">Título</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input neumorphic-inset" />
      </div>
      <div className="form-group">
        <label htmlFor="tipo">Tipo (ex: blush)</label>
        <input id="tipo" type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input neumorphic-inset" />
      </div>
       <div className="form-group">
        <label htmlFor="marca">Marca</label>
        <input id="marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className="form-input neumorphic-inset" />
      </div>
       <div className="form-group">
        <label htmlFor="cor">Cor</label>
        <input id="cor" type="text" value={cor} onChange={(e) => setCor(e.target.value)} className="form-input neumorphic-inset" />
      </div>
      <div className="form-group">
        <label htmlFor="notes">Notas</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea neumorphic-inset" />
      </div>
       <div className="form-group">
         <label>Imagens</label>
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
            <button onClick={() => cameraInputRef.current?.click()} className="image-btn neumorphic">Câmera</button>
            <button onClick={() => fileInputRef.current?.click()} className="image-btn neumorphic">Galeria</button>
         </div>
       </div>

       {showDeleteModal && (
        <ConfirmModal
            title="Excluir Item"
            message="Tem certeza que deseja excluir este item? Essa ação não pode ser desfeita."
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
                <h3>Filtrar Itens</h3>
                <div className="filter-section">
                    <h4>Por Marca</h4>
                    <div className="filter-options">
                        {brands.map(brand => (
                            <div key={brand} onClick={() => toggleBrand(brand)} className={`filter-option neumorphic ${selectedBrands.includes(brand) ? 'selected' : ''}`}>
                                {brand}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="filter-section">
                    <h4>Por Cor</h4>
                    <div className="filter-options">
                        {colors.map(color => (
                            <div key={color} onClick={() => toggleColor(color)} className={`filter-option neumorphic ${selectedColors.includes(color) ? 'selected' : ''}`}>
                                {color}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-actions">
                    <button onClick={onCancel} className="modal-btn neumorphic">Cancelar</button>
                    <button onClick={handleApply} className="modal-btn neumorphic primary">Aplicar</button>
                </div>
            </div>
        </div>
    );
};

const UserListModal = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const { isDemo } = useContext(AuthContext);

  useEffect(() => {
    if (isDemo) {
        try {
            const dbLocal = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
            setUsers(Object.keys(dbLocal));
        } catch (e) {
            setUsers([]);
        }
    } else if (db) {
        const fetchUsers = async () => {
            try {
                // Ensure the users collection is readable
                const usersSnap = await getDocs(collection(db, 'users'));
                const userList = usersSnap.docs.map(doc => doc.data().email);
                console.log("Usuarios encontrados:", userList);
                setUsers(userList);
            } catch(e) {
                console.error("Erro ao buscar usuários do firebase", e);
                alert("Erro ao buscar usuários. Verifique o console e as regras do Firebase.");
            }
        };
        fetchUsers();
    }
  }, [isDemo]);

  const handleDeleteUser = async () => {
      if (!userToDelete) return;

      try {
          if (isDemo) {
              // 1. Remove from auth db
              const dbLocal = JSON.parse(window.localStorage.getItem('makeup_users_db') || '{}');
              delete dbLocal[userToDelete];
              window.localStorage.setItem('makeup_users_db', JSON.stringify(dbLocal));

              // 2. Remove user data
              window.localStorage.removeItem(`makeup_inventory_${userToDelete}`);

              // 3. Update list
              setUsers(prev => prev.filter(email => email !== userToDelete));
          } else if (db) {
              // Firebase delete logic
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where("email", "==", userToDelete));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                  const userDoc = querySnapshot.docs[0];
                  const uid = userDoc.id;
                  
                  // Delete user record from 'users' collection
                  await deleteDoc(doc(db, 'users', uid));

                  // Note: The actual Auth user account cannot be deleted from client SDK 
                  // without the user re-authenticating. This only deletes their data.
                  
                  const itemsRef = collection(db, `users/${uid}/items`);
                  const itemsSnap = await getDocs(itemsRef);
                  itemsSnap.forEach(d => deleteDoc(d.ref));
                  
                  const catsRef = collection(db, `users/${uid}/categories`);
                  const catsSnap = await getDocs(catsRef);
                  catsSnap.forEach(d => deleteDoc(d.ref));
                  
                  setUsers(prev => prev.filter(email => email !== userToDelete));
              }
          }
          setUserToDelete(null);
      } catch (e) {
          console.error("Erro ao deletar usuário", e);
      }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content neumorphic">
        <h3>Usuários Cadastrados</h3>
        <p style={{fontSize: '0.8rem', opacity: 0.6, marginBottom: '15px', textAlign: 'center'}}>
           {isDemo ? '(Armazenados localmente - DEMO)' : '(Armazenados no Firebase)'}
        </p>
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {users.length === 0 ? (
                <p style={{textAlign: 'center', opacity: 0.7}}>Nenhum usuário encontrado na lista.</p>
            ) : (
                <ul style={{listStyle: 'none', padding: 0}}>
                    {users.map(email => (
                        <li key={email} style={{padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span style={{wordBreak: 'break-all', fontSize: '0.9rem'}}>{email}</span>
                            {email !== 'yagomdd@gmail.com' && (
                                <button 
                                    onClick={() => setUserToDelete(email)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#d9534f',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        padding: '5px'
                                    }}
                                    aria-label="Deletar Usuário"
                                >
                                    ×
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
        <div className="modal-actions">
            <button onClick={onClose} className="modal-btn neumorphic">Fechar</button>
        </div>
      </div>
      
      {userToDelete && (
          <ConfirmModal 
            title="Deletar Usuário"
            message={`Tem certeza que deseja apagar os dados do usuário ${userToDelete}? (A conta de login permanecerá ativa até que ele a exclua)`}
            onCancel={() => setUserToDelete(null)}
            onConfirm={handleDeleteUser}
          />
      )}
    </div>
  );
}

const LoginScreen = () => {
  const { login, register, isDemo } = useContext(AuthContext);
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
      setError('Preencha todos os campos.');
      setLoading(false);
      return;
    }
    
    // Validate password length for Firebase
    if (!isDemo && password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
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
        let msg = "Erro ao autenticar.";
        if (e.message) msg = e.message;
        if (e.code === 'auth/invalid-credential') msg = "Email ou senha inválidos.";
        if (e.code === 'auth/email-already-in-use') msg = "Este email já está em uso.";
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
        <h2>{isRegistering ? 'Criar Conta' : 'Bem-vindo'}</h2>
        <p className="login-subtitle">
            {isRegistering ? 'Salve seus itens favoritos' : 'Faça login para acessar seu inventário'}
        </p>
        
        {isDemo && (
             <div style={{fontSize: '0.7rem', color: '#666', marginBottom: '10px', background: '#eee', padding: '5px', borderRadius: '5px'}}>
                 Modo Demo (Offline) Ativo <br/> Configure o Firebase para salvar na nuvem.
             </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="password">Senha</label>
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
            {loading ? 'Carregando...' : (isRegistering ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        <button 
          onClick={() => { setError(''); setIsRegistering(!isRegistering); }} 
          className="toggle-auth-btn"
        >
          {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
        </button>

        {email === 'yagomdd@gmail.com' && (
             <button 
                onClick={() => setShowUserList(true)} 
                style={{marginTop: '30px', background: 'none', border: 'none', fontSize: '0.8rem', opacity: 0.5, cursor: 'pointer', textDecoration: 'underline'}}
            >
                Admin: Ver Usuários
            </button>
        )}
      </div>
      {showUserList && <UserListModal onClose={() => setShowUserList(false)} />}
    </div>
  );
};

interface ItemListScreenProps {
  category: Category;
  items: MakeupItem[];
  onBack: () => void;
  onSaveItem: (
    item: MakeupItem | null,
    newItemData: Omit<MakeupItem, 'id' | 'categoryId' | 'dateAdded'>
  ) => void;
  onDeleteItem: (itemId: string) => void;
  allItems: MakeupItem[];
}

const ItemListScreen = ({ category, items, onBack, onSaveItem, onDeleteItem, allItems }: ItemListScreenProps) => {
  const [editingItem, setEditingItem] = useState<MakeupItem | null | 'new'>(null);
  const [viewingItem, setViewingItem] = useState<MakeupItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAdded-desc');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<{ brands: string[], colors: string[] }>({ brands: [], colors: [] });

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
          // If we were editing an existing item, go back to viewing it (or null if new)
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
         <button onClick={onBack} className="back-btn" aria-label="Voltar">←</button>
        <h2>{category.name}</h2>
        <button onClick={() => setEditingItem('new')} className="fab neumorphic" aria-label="Adicionar nova item">+</button>
      </div>
      
      <div className="controls">
          <div className="search-sort-container">
             <input
                type="text"
                placeholder="Busca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input neumorphic-inset"
                aria-label="Buscar itens"
            />
            <button onClick={() => setShowFilterModal(true)} className="filter-btn neumorphic" aria-label="Filtrar itens">
                Filtrar
            </button>
          </div>
        
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="sort-select neumorphic-inset" aria-label="Ordenar itens">
          <option value="dateAdded-desc">Data de Adição (Recente)</option>
          <option value="dateAdded-asc">Data de Adição (Antigo)</option>
          <option value="title-asc">Nome (A-Z)</option>
          <option value="title-desc">Nome (Z-A)</option>
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
        <h1>Inventário</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
            {user?.email === 'yagomdd@gmail.com' && (
                <button onClick={() => setShowUserList(true)} className="fab neumorphic" style={{ fontSize: '14px', width: 'auto', padding: '0 10px' }} title="Admin">
                    🛡️
                </button>
            )}
             <button onClick={logout} className="fab neumorphic" style={{ fontSize: '14px', width: 'auto', padding: '0 15px' }}>
                Sair
             </button>
             <button onClick={() => setEditingCategory('new')} className="fab neumorphic" aria-label="Adicionar nova categoria">+</button>
        </div>
      </div>
      <p style={{marginBottom: '20px', fontSize: '0.9rem', opacity: 0.8}}>Logado como: {user?.email}</p>
      <div className="card-list">
        {data.categories.length === 0 && (
            <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>Nenhuma categoria ainda. Crie uma!</p>
        )}
        {data.categories.map(category => (
          <div key={category.id} className="card neumorphic">
            <div className="card-content" onClick={() => onSelectCategory(category)}>
              <h3>{category.name}</h3>
              <p>{data.items.filter(i => i.categoryId === category.id).length} itens</p>
            </div>
            <div className="card-actions">
                <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingCategory(category); 
                  }} 
                  className="icon-btn" 
                  aria-label={`Editar categoria ${category.name}`}
                >
                    ✎
                </button>
                <button 
                  onClick={(e) => { 
                      e.stopPropagation(); 
                      setDeletingCategory(category); 
                  }} 
                  className="icon-btn delete" 
                  aria-label={`Deletar categoria ${category.name}`}
                >
                    ×
                </button>
            </div>
          </div>
        ))}
      </div>

      <button className="settings-fab neumorphic" onClick={() => setShowSettings(true)} aria-label="Configurações de Aparência">
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
          title="Excluir Categoria"
          message={`Tem certeza que deseja excluir "${deletingCategory.name}" e todos os seus itens? Essa ação não pode ser desfeita.`}
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
        alert("Erro ao salvar categoria: " + e.message + "\n\nVerifique se o Firestore está habilitado e as regras permitem escrita.");
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
        // Delete category doc
        await deleteDoc(doc(db, `users/${user.uid}/categories`, categoryId));
        // Note: In real firebase app, you'd batch delete items too. 
        // For simplicity here we just delete from UI or let the user handle orphans
        // Or implement a cloud function.
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
                    setUser({ email: firebaseUser.email || '', uid: firebaseUser.uid });
                    
                    // SELF-HEALING: Ensure user exists in the 'users' collection for Admin listing
                    // This handles cases where users signed up before the admin feature existed
                    if (db) {
                        try {
                            const userRef = doc(db, 'users', firebaseUser.uid);
                            const userSnap = await getDoc(userRef);
                            if (!userSnap.exists()) {
                                await setDoc(userRef, {
                                    email: firebaseUser.email,
                                    uid: firebaseUser.uid,
                                    createdAt: Date.now(),
                                    lastLogin: Date.now()
                                }, { merge: true });
                                console.log("Usuário sincronizado com a lista de Admin");
                            }
                        } catch (e) {
                            console.error("Erro ao sincronizar usuário:", e);
                        }
                    }

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
            await signInWithEmailAndPassword(auth, email, password || '');
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
            // Create user doc in 'users' collection for Admin listing
            await setDoc(doc(db, 'users', cred.user.uid), {
                email: email,
                uid: cred.user.uid,
                createdAt: Date.now()
            });
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
    <ThemeProvider>
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    </ThemeProvider>
  );
}

const AppContent = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Carregando...</div>;
    
    if (!user) {
        return <LoginScreen />;
    }

    return <MainApp />;
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);