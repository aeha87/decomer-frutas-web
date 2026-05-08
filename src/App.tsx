import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { 
  ShoppingCart, User, Lock, Mail, Phone, MapPin, Plus, Trash2, Edit, LogOut, Instagram, Facebook,
  CheckCircle, X, Package, TrendingUp, DollarSign, List, Tag, ShoppingBag, CreditCard, Activity, Calendar, 
  Search, MessageCircle, Heart, Zap, Star, Gift, Truck, MousePointer2, Eye, Printer, Send, Users, ArrowUpRight, Clock,
  Map, ArrowUp, ArrowDown, Share2, AlertTriangle, Save, ShieldAlert, Megaphone, Ticket, TrendingDown, Award, ScanBarcode
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE (Producción) ---
const firebaseConfig = {
  apiKey: "AIzaSyCyEMZbI7l7nNr2h4yS7PoA-fKQjxwkH_o",
  authDomain: "decomerfrutas-3047d.firebaseapp.com",
  projectId: "decomerfrutas-3047d",
  storageBucket: "decomerfrutas-3047d.firebasestorage.app",
  messagingSenderId: "398908357282",
  appId: "1:398908357282:web:80fa1cac178cd1c0b5f5fb"
};

const IMGBB_API_KEY = "19641e99aad23c4e7f45f6540efa1f50";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const VENEZUELAN_BANKS = [
  "Banesco", "Banco Mercantil", "Banco Provincial", "Banco Nacional de Crédito (BNC)", 
  "Bancaribe", "Banco de Venezuela", "Banco Bicentenario", "Banco del Tesoro", 
  "Banplus", "Banco Plaza", "Banco Activo", "Bancamiga", "100% Banco", 
  "Mi Banco", "Banco Caroní", "Banco Exterior"
];

const getSafeTime = (dateVal) => {
  if (!dateVal) return 0;
  try {
    if (typeof dateVal === 'object' && dateVal.seconds) {
       return dateVal.seconds * 1000;
    }
    if (typeof dateVal === 'string' || typeof dateVal === 'number') {
       const d = new Date(dateVal);
       if (!isNaN(d.getTime())) return d.getTime();
    }
  } catch (e) {}
  return 0;
};

// Formateador de teléfonos para WhatsApp (🇻🇪)
const formatPhoneForWA = (phone) => {
  if(!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '58' + clean.substring(1);
  return clean;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]); 
  const [bcvRate, setBcvRate] = useState(36.50);
  const [cart, setCart] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [view, setView] = useState('app');

  useEffect(() => {
    const unsubBcv = onSnapshot(doc(db, 'settings', 'bcv'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().rate) {
        setBcvRate(Number(docSnap.data().rate));
      } else {
        const fetchBcv = async () => {
          try {
            const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv');
            const data = await res.json();
            if (data?.monitors?.bcv?.price) {
              const fetchedRate = Number(data.monitors.bcv.price);
              setBcvRate(fetchedRate);
              setDoc(doc(db, 'settings', 'bcv'), { rate: fetchedRate }, { merge: true });
            }
          } catch (e) {
            console.log("No se pudo conectar al servidor del BCV.");
          }
        };
        fetchBcv();
      }
    });
    return () => unsubBcv();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ uid: user.uid, email: user.email, ...userDoc.data() });
        } else {
          setCurrentUser({ uid: user.uid, email: user.email, role: 'client' });
        }
        setView('app');
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    let unsubOrders = () => {};
    let unsubUsers = () => {};
    let unsubClients = () => {};
    let unsubPromos = () => {};
    let unsubExpenses = () => {};
    
    if (currentUser?.role === 'admin') {
      unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
        const sortedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
          const timeA = getSafeTime(a.date);
          const timeB = getSafeTime(b.date);
          return timeB - timeA;
        });
        setOrders(sortedOrders);
      });

      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setSystemUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
        setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubPromos = onSnapshot(collection(db, 'promotions'), (snap) => {
        setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
        const sortedExp = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(sortedExp);
      });
    }

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCoupons();
      unsubOrders();
      unsubUsers();
      unsubClients();
      unsubPromos();
      unsubExpenses();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    setCart([]);
  };

  const handleSaveBcvRate = async (newRate) => {
    if (!newRate || isNaN(newRate)) return;
    try {
      await setDoc(doc(db, 'settings', 'bcv'), { rate: Number(newRate) }, { merge: true });
    } catch (error) {
      console.error("Error al guardar la tasa:", error);
    }
  };

  if (loadingAuth) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center font-bold text-red-600">Cargando plataforma...</div>;
  }

  if (view === 'login' || view === 'register') {
    return <AuthScreen view={view} setView={setView} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans overflow-x-hidden">
      <Navbar 
        user={currentUser} 
        onLogout={handleLogout} 
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
        bcvRate={bcvRate} 
        setBcvRate={setBcvRate} 
        onSaveBcv={handleSaveBcvRate} 
        onLoginClick={() => setView('login')} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchExpanded={isSearchExpanded}
        setIsSearchExpanded={setIsSearchExpanded}
      />
      <main className="flex-grow container mx-auto px-4 py-8 relative">
        {currentUser?.role === 'admin' ? (
          <AdminDashboard products={products} categories={categories} orders={orders} expenses={expenses} coupons={coupons} bcvRate={bcvRate} clients={clients} promotions={promotions} />
        ) : (
          <ClientStorefront 
            products={products} 
            categories={categories} 
            cart={cart} 
            setCart={setCart} 
            user={currentUser} 
            bcvRate={bcvRate}
            searchQuery={searchQuery}
            coupons={coupons}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function AuthScreen({ view, setView }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', address: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          email: formData.email,
          role: formData.email.toLowerCase().includes('admin') ? 'admin' : 'client'
        });
      }
    } catch (error) {
      if(error.code === 'auth/invalid-credential') setErrorMsg("Correo o contraseña incorrectos.");
      else if(error.code === 'auth/email-already-in-use') setErrorMsg("Este correo ya está registrado.");
      else setErrorMsg(error.message);
    }
    setIsLoading(false);
  };

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="bg-white p-6 text-center border-b border-stone-100 flex flex-col items-center">
          <img src="/logo.png" alt="Decomer Frutas" className="h-32 w-auto object-contain" />
          <p className="text-stone-500 font-medium mt-2">Acceso Administrativo</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            {view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 font-medium">
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input required type="text" name="name" placeholder="Nombre completo" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input required type="email" name="email" placeholder="Correo electrónico" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input required type="password" name="password" placeholder="Contraseña" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
            </div>

            {view === 'register' && (
              <>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input required type="tel" name="phone" placeholder="Teléfono" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input required type="text" name="address" placeholder="Dirección" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
                </div>
              </>
            )}

            <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg mt-6">
              {isLoading ? 'Cargando...' : (view === 'login' ? 'Ingresar al Panel' : 'Registrarme')}
            </button>
          </form>

          <button onClick={() => setView('app')} className="mt-6 flex items-center justify-center gap-2 text-stone-400 hover:text-stone-600 font-medium text-sm w-full transition-colors">
            <X className="w-4 h-4" /> Volver al Catálogo Público
          </button>
        </div>
      </div>
    </div>
  );
}

function Navbar({ user, onLogout, cartCount, bcvRate, setBcvRate, onSaveBcv, onLoginClick, searchQuery, setSearchQuery, isSearchExpanded, setIsSearchExpanded }) {
  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 print:hidden transition-all">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src="/logo.png" alt="Decomer Frutas" className="h-10 sm:h-14 w-auto drop-shadow-sm hover:scale-105 transition-transform" />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-4">
          <div className={`items-center gap-1 sm:gap-2 bg-green-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-green-200 shadow-inner transition-opacity ${user?.role !== 'admin' && isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            <span className="hidden sm:inline text-xs font-bold text-green-800">Tasa BCV:</span>
            <span className="sm:hidden text-[10px] font-bold text-green-800">BCV:</span>
            {user?.role === 'admin' ? (
              <input 
                type="number" 
                step="0.01" 
                value={bcvRate} 
                onChange={(e) => setBcvRate(Number(e.target.value))} 
                onBlur={(e) => onSaveBcv(Number(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && onSaveBcv(Number(e.target.value))}
                className="w-12 sm:w-16 text-[10px] sm:text-xs px-1 border-b border-green-300 bg-transparent outline-none font-bold text-green-900 focus:border-green-500" 
              />
            ) : (
              <span className="text-[10px] sm:text-xs font-bold text-green-900">Bs. {bcvRate}</span>
            )}
          </div>

          {user?.role === 'admin' ? (
            <>
              <div className="text-sm text-gray-600 hidden md:block">
                Hola, <span className="font-semibold text-gray-800">{user.name || 'Admin'}</span>
              </div>
              <button onClick={onLogout} className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors p-2 bg-stone-100 rounded-xl">
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:block text-sm font-medium">Salir</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-0">
              <div className={`relative flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-36 sm:w-64' : 'w-8 sm:w-10'}`}>
                {isSearchExpanded ? (
                  <div className="w-full relative animate-fade-in">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input autoFocus type="text" placeholder="Buscar producto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="w-full pl-9 pr-8 sm:pl-10 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-red-400 rounded-full outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all"/>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <button onClick={() => setIsSearchExpanded(true)} className="w-full h-full flex items-center justify-center text-stone-600 hover:text-red-600 transition-colors p-1 sm:p-2"><Search className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                )}
              </div>

              <div className="relative text-stone-600 hover:text-red-600 transition-colors cursor-pointer group p-1 sm:p-2" onClick={() => document.getElementById('cart-section')?.scrollIntoView({behavior: 'smooth'})}>
                <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-bounce shadow-md">{cartCount}</span>
                )}
              </div>
              
              <button onClick={onLoginClick} title="Ingreso Administrativo" className="flex items-center gap-2 text-stone-300 hover:text-stone-800 transition-colors ml-1 sm:ml-2">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 py-10 text-center mt-auto print:hidden">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-6">
        <div className="space-y-2">
          <p className="font-serif text-3xl text-white font-bold tracking-wide">Decomer Frutas</p>
          <p className="text-sm max-w-md text-stone-400 mx-auto">Especialistas en arreglos frutales, fresas con chocolate y desayunos sorpresa. ¡Endulzamos tus mejores momentos!</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <a href="https://www.instagram.com/decomerfrutas/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-transform hover:scale-110 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg"><Instagram className="w-5 h-5" /><span className="font-medium text-sm">Instagram</span></a>
          <a href="https://www.facebook.com/DecomerFrutasMCBO" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-transform hover:scale-110 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg"><Facebook className="w-5 h-5" /><span className="font-medium text-sm">Facebook</span></a>
          <a href="https://www.tiktok.com/@decomer.frutas" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white hover:text-gray-200 transition-transform hover:scale-110 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
            <span className="font-medium text-sm">TikTok</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

// --- ADMIN COMPONENTS ---
function AdminDashboard({ products, categories, orders, expenses, coupons, systemUsers, bcvRate, clients, promotions }) {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 shrink-0 print:hidden">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 sticky top-24">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><Star className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-gray-800 leading-tight">Administración</h3>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest">Decomer Frutas</p>
            </div>
          </div>
          
          <nav className="space-y-1.5">
            <button onClick={() => setActiveTab('kpis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'kpis' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><TrendingUp className="w-5 h-5" /> Dashboard</button>
            <button onClick={() => setActiveTab('expenses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'expenses' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><TrendingDown className="w-5 h-5" /> Gastos y Egresos</button>
            <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'orders' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}>
              <ShoppingBag className="w-5 h-5" /> Pedidos 
              {orders.filter((o)=>o.status==='Pendiente').length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{orders.filter((o)=>o.status==='Pendiente').length}</span>}
            </button>
            
            <button onClick={() => setActiveTab('delivery')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'delivery' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Map className="w-5 h-5" /> Rutas de Entrega</button>
            
            <div className="pt-4 mt-4 border-t border-stone-100"></div>

            <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'clients' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Users className="w-5 h-5" /> Mis Clientes</button>
            <button onClick={() => setActiveTab('promos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'promos' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Zap className="w-5 h-5" /> Promociones</button>
            <button onClick={() => setActiveTab('coupons')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'coupons' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Ticket className="w-5 h-5" /> Cupones</button>

            <div className="pt-4 mt-4 border-t border-stone-100"></div>
            
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'products' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Tag className="w-5 h-5" /> Catálogo / Extras</button>
            <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'categories' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><List className="w-5 h-5" /> Categorías</button>
          </nav>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {activeTab === 'kpis' && <AdminKPIs orders={orders} expenses={expenses} bcvRate={bcvRate} />}
        {activeTab === 'expenses' && <AdminExpenses expenses={expenses} bcvRate={bcvRate} />}
        {activeTab === 'orders' && <AdminOrders orders={orders} bcvRate={bcvRate} products={products} />}
        {activeTab === 'delivery' && <AdminDeliveryRoute orders={orders} bcvRate={bcvRate} />}
        {activeTab === 'clients' && <AdminClients clients={clients} promotions={promotions} products={products} />}
        {activeTab === 'promos' && <AdminPromos promotions={promotions} products={products} />}
        {activeTab === 'coupons' && <AdminCoupons coupons={coupons} />}
        {activeTab === 'products' && <AdminProducts products={products} categories={categories} />}
        {activeTab === 'categories' && <AdminCategories categories={categories} />}
      </div>
    </div>
  );
}

// --- MÓDULO GASTOS ---
function AdminExpenses({ expenses, bcvRate }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!desc.trim() || !amount) return;
    await addDoc(collection(db, 'expenses'), { description: desc.trim(), amountUSD: Number(amount), date });
    setDesc(''); setAmount('');
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Seguro que quieres borrar este gasto?')) await deleteDoc(doc(db, 'expenses', id));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><TrendingDown className="w-6 h-6 text-orange-600"/> Control de Gastos</h2>
        <p className="text-stone-500">Registra tus compras de material, delivery e insumos</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-6">
          <input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500 bg-stone-50 w-full sm:w-40" />
          <input required type="text" placeholder="Ej: Compra de fresas y globos" value={desc} onChange={e=>setDesc(e.target.value)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500 bg-stone-50" />
          <input required type="number" step="0.01" placeholder="Monto USD" value={amount} onChange={e=>setAmount(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500 bg-stone-50 w-full sm:w-32 font-bold" />
          <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md shrink-0">Agregar Gasto</button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-stone-100">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 font-bold">Fecha</th>
                <th className="p-4 font-bold">Descripción del Gasto</th>
                <th className="p-4 font-bold text-right">Monto</th>
                <th className="p-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-4 text-sm font-medium text-stone-600">{exp.date}</td>
                  <td className="p-4 font-bold text-gray-800">{exp.description}</td>
                  <td className="p-4 text-right">
                    <div className="font-black text-red-500">-${Number(exp.amountUSD).toFixed(2)}</div>
                    <div className="text-[10px] text-stone-400">Bs. {(Number(exp.amountUSD) * bcvRate).toFixed(2)}</div>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(exp.id)} className="text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-stone-500">No hay gastos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MÓDULO CUPONES ---
function AdminCoupons({ coupons }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!code.trim() || !value) return;
    await addDoc(collection(db, 'coupons'), { code: code.trim().toUpperCase(), type, value: Number(value), active: true });
    setCode(''); setValue('');
  };

  const toggleStatus = async (id, currentStatus) => {
    await updateDoc(doc(db, 'coupons', id), { active: !currentStatus });
  };
  const handleDelete = async (id) => {
    if(window.confirm('¿Borrar cupón?')) await deleteDoc(doc(db, 'coupons', id));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Ticket className="w-6 h-6 text-pink-500"/> Cupones de Descuento</h2>
        <p className="text-stone-500">Crea códigos promocionales para tus clientes</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-6">
          <input required type="text" placeholder="Ej: MAMA20" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-pink-500 bg-stone-50 font-black uppercase" />
          <select value={type} onChange={e=>setType(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-pink-500 bg-white">
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Monto Fijo ($)</option>
          </select>
          <input required type="number" step="0.01" placeholder="Valor" value={value} onChange={e=>setValue(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-pink-500 bg-stone-50 w-full sm:w-32 font-bold" />
          <button type="submit" className="bg-stone-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md shrink-0">Crear Cupón</button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className={`p-5 rounded-2xl border ${c.active ? 'border-pink-200 bg-pink-50' : 'border-stone-200 bg-stone-50 opacity-60'} flex flex-col relative`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-lg tracking-wider text-gray-900">{c.code}</span>
                <button onClick={() => handleDelete(c.id)} className="text-stone-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
              </div>
              <p className="text-sm font-bold text-stone-600 mb-4">Descuento: <span className="text-pink-600">{c.type === 'percent' ? `${c.value}%` : `$${c.value} USD`}</span></p>
              
              <button onClick={() => toggleStatus(c.id, c.active)} className={`mt-auto py-2 rounded-lg text-xs font-bold transition-colors ${c.active ? 'bg-white text-stone-700 hover:bg-stone-200 shadow-sm' : 'bg-stone-200 text-stone-500 hover:bg-stone-300'}`}>
                {c.active ? '✅ Activo (Apagar)' : '❌ Apagado (Encender)'}
              </button>
            </div>
          ))}
          {coupons.length === 0 && <p className="col-span-full py-8 text-center text-stone-500">No hay cupones creados.</p>}
        </div>
      </div>
    </div>
  );
}


// --- MÓDULO MIS CLIENTES (ACTUALIZADO CON PUNTOS) ---
function AdminClients({ clients, promotions, products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone || '').includes(searchTerm)
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedClients(filteredClients.map(c => c.id));
    else setSelectedClients([]);
  };

  const toggleSelectClient = (id) => {
    if (selectedClients.includes(id)) setSelectedClients(selectedClients.filter(cId => cId !== id));
    else setSelectedClients([...selectedClients, id]);
  };

  const getPromoText = (promoId) => {
    const promo = promotions.find(p => p.id === promoId);
    if (!promo) return '';
    let text = `*${promo.title}*\n\n${promo.message}\n\n`;
    if (promo.selectedProductIds && promo.selectedProductIds.length > 0) {
      text += `*🔥 Promociones Destacadas:*\n`;
      promo.selectedProductIds.forEach(pid => {
         const product = products.find(prod => prod.id === pid);
         if (product) text += `▪️ ${product.isExtra ? product.emoji : '🍓'} ${product.name} - *$${Number(product.price).toFixed(2)}*\n`;
      });
      text += `\nHaz tu pedido aquí:\n🌐 https://decomer-frutas.web.app\n`;
    }
    return encodeURIComponent(text);
  };

  const handleStartQueue = () => {
    if (!selectedPromoId) return alert("Selecciona una promoción primero.");
    if (selectedClients.length === 0) return alert("Selecciona al menos un cliente.");
    setIsPromoModalOpen(false); setCurrentIndex(0); setIsQueueOpen(true);
  };

  const handleSendCurrent = () => {
    const currentClient = clients.find(c => c.id === selectedClients[currentIndex]);
    if (!currentClient) return;
    window.open(`https://wa.me/${formatPhoneForWA(currentClient.phone)}?text=${getPromoText(selectedPromoId)}`, '_blank');
  };

  const handleNextInQueue = () => {
    if (currentIndex < selectedClients.length - 1) setCurrentIndex(currentIndex + 1);
    else { setIsQueueOpen(false); setSelectedClients([]); alert("¡Envío masivo finalizado!"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600"/> Mis Clientes</h2>
          <p className="text-stone-500">Cartera de clientes, puntos acumulados y marketing</p>
        </div>
        {selectedClients.length > 0 && (
          <button onClick={() => setIsPromoModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg text-sm animate-fade-in">
            <Send className="w-4 h-4" /> Enviar Promo a {selectedClients.length}
          </button>
        )}
      </div>

      <div className="relative w-full md:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input type="text" placeholder="Buscar cliente por nombre o teléfono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl outline-none focus:border-blue-500 text-sm shadow-sm transition-colors"/>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 text-center w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedClients.length === filteredClients.length && filteredClients.length > 0} className="w-4 h-4 rounded" /></th>
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold">Teléfono</th>
                <th className="p-4 font-bold text-center">Nº Pedidos</th>
                <th className="p-4 font-bold text-center">Puntos Decomer</th>
                <th className="p-4 font-bold text-center">Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-4 text-center"><input type="checkbox" checked={selectedClients.includes(client.id)} onChange={() => toggleSelectClient(client.id)} className="w-4 h-4 rounded text-blue-600" /></td>
                  <td className="p-4">
                    <span className="font-bold text-gray-900 block">{client.name || 'Sin Nombre'}</span>
                    <span className="text-xs text-stone-500 truncate max-w-[200px] block" title={client.address}>{client.address || 'Sin dirección guardada'}</span>
                  </td>
                  <td className="p-4 font-medium text-stone-700">{client.phone}</td>
                  <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 font-black px-3 py-1 rounded-full text-xs">{client.totalOrders || 1}</span></td>
                  <td className="p-4 text-center">
                    <span className="flex items-center justify-center gap-1 font-black text-pink-600 bg-pink-50 px-3 py-1 rounded-full text-xs border border-pink-100 w-max mx-auto">
                      <Award className="w-3 h-3"/> {client.points ? Math.floor(client.points) : 0} pts
                    </span>
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    <a href={`https://wa.me/${formatPhoneForWA(client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 p-2.5 rounded-xl transition-colors"><MessageCircle className="w-5 h-5" /></a>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-stone-500 font-medium">No se encontraron clientes registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS de Envio (Mantenidos igual que la versión anterior) */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Megaphone className="w-5 h-5 text-green-600"/> Enviar Promoción</h3>
              <button onClick={() => setIsPromoModalOpen(false)} className="bg-white text-stone-400 hover:text-gray-800 p-1 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 mb-4">Se enviará un mensaje a los <strong>{selectedClients.length}</strong> clientes seleccionados.</p>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Selecciona la Promoción</label>
              {promotions.length > 0 ? (
                <select value={selectedPromoId} onChange={e => setSelectedPromoId(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 mb-6">
                  <option value="">Seleccione una promoción...</option>
                  {promotions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              ) : (
                <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm font-medium border border-orange-100 mb-6">No has creado ninguna promoción aún.</div>
              )}
              <button onClick={handleStartQueue} disabled={!selectedPromoId} className="w-full bg-[#25D366] hover:bg-[#1ebd5a] disabled:bg-stone-300 text-white font-bold py-3.5 rounded-xl shadow-lg">Iniciar Envío Masivo</button>
            </div>
          </div>
        </div>
      )}

      {isQueueOpen && (() => {
        const currentClient = clients.find(c => c.id === selectedClients[currentIndex]);
        return (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center p-8 text-center relative border-4 border-[#25D366]">
            <button onClick={() => {if(window.confirm('¿Detener el envío masivo?')) setIsQueueOpen(false)}} className="absolute top-4 right-4 text-stone-400 hover:text-red-500"><X className="w-6 h-6"/></button>
            <div className="w-16 h-16 bg-[#25D366]/20 rounded-full flex items-center justify-center mb-4"><Send className="w-8 h-8 text-[#25D366] ml-1" /></div>
            <h3 className="font-black text-2xl text-gray-800 mb-1">Enviando Promoción</h3>
            <p className="text-stone-500 font-bold mb-6 bg-stone-100 px-4 py-1.5 rounded-full text-sm">Cliente {currentIndex + 1} de {selectedClients.length}</p>
            <div className="bg-stone-50 border border-stone-200 w-full p-4 rounded-2xl mb-6 text-left shadow-inner">
              <p className="text-xs font-bold text-stone-400 uppercase mb-1">Preparando mensaje para:</p>
              <p className="font-bold text-lg text-gray-800">{currentClient?.name || 'Cliente'}</p>
              <p className="text-sm text-stone-500">{currentClient?.phone}</p>
            </div>
            <button onClick={handleSendCurrent} className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-green-200 text-lg mb-4 hover:scale-[1.02]">1. Enviar a este cliente</button>
            <button onClick={handleNextInQueue} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3.5 rounded-xl transition-all border border-stone-200">2. Siguiente Cliente ➡️</button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// --- MÓDULO PROMOCIONES ---
function AdminPromos({ promotions, products }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPromo, setCurrentPromo] = useState({ id: '', title: '', message: '', selectedProductIds: [] });

  const handleToggleProduct = (productId) => {
    let newIds = [...currentPromo.selectedProductIds];
    if (newIds.includes(productId)) {
      newIds = newIds.filter(id => id !== productId);
    } else {
      newIds.push(productId);
    }
    setCurrentPromo({ ...currentPromo, selectedProductIds: newIds });
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    if (!currentPromo.title || !currentPromo.message) return alert("El título y el mensaje son obligatorios.");

    const promoData = {
      title: currentPromo.title,
      message: currentPromo.message,
      selectedProductIds: currentPromo.selectedProductIds,
      dateCreated: new Date().toISOString()
    };

    if (currentPromo.id) {
      await updateDoc(doc(db, 'promotions', currentPromo.id), promoData);
    } else {
      await addDoc(collection(db, 'promotions'), promoData);
    }
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar esta promoción?')) {
      await deleteDoc(doc(db, 'promotions', id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Zap className="w-6 h-6 text-yellow-500"/> Promociones</h2>
          <p className="text-stone-500">Crea mensajes atractivos para enviar a tus clientes</p>
        </div>
        <button onClick={() => { setCurrentPromo({ id: '', title: '', message: '', selectedProductIds: [] }); setIsEditing(true); }}
          className="bg-stone-900 hover:bg-black text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg text-sm"
        >
          <Plus className="w-5 h-5" /> Nueva Promo
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-stone-200 relative animate-scale-in">
          <button onClick={()=>setIsEditing(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800"><X className="w-6 h-6"/></button>
          <h3 className="font-bold text-lg mb-6 text-gray-800">Redactar Promoción</h3>
          
          <form onSubmit={handleSavePromo} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Título de la Promo (Interno y Cabecera)</label>
              <input required type="text" placeholder="Ej: 🎈 Especial Día de las Madres" value={currentPromo.title} onChange={e => setCurrentPromo({...currentPromo, title: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-stone-500 font-bold" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cuerpo del Mensaje</label>
              <textarea required placeholder="Hola! Tenemos una súper sorpresa preparada para ti hoy..." value={currentPromo.message} onChange={e => setCurrentPromo({...currentPromo, message: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-stone-500 min-h-[120px]" />
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <label className="block text-xs font-bold text-gray-700 mb-3 uppercase flex items-center gap-2"><Tag className="w-4 h-4"/> Adjuntar Productos (Opcional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                {products.map(p => (
                  <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${currentPromo.selectedProductIds.includes(p.id) ? 'bg-white border-green-500 shadow-sm' : 'bg-white border-stone-200 opacity-70 hover:opacity-100'}`}>
                    <input type="checkbox" checked={currentPromo.selectedProductIds.includes(p.id)} onChange={() => handleToggleProduct(p.id)} className="w-4 h-4 text-green-600 rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-stone-500 font-black">${Number(p.price).toFixed(2)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="px-8 py-3 text-sm font-bold bg-stone-900 hover:bg-black text-white rounded-xl shadow-lg transition-all flex items-center gap-2"><Save className="w-4 h-4"/> Guardar Promoción</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo) => (
          <div key={promo.id} className="bg-white rounded-3xl shadow-sm border border-stone-200 p-5 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-gray-800 text-lg leading-tight">{promo.title}</h3>
              <div className="flex gap-1 shrink-0 bg-stone-50 rounded-lg p-1 border border-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => {setCurrentPromo(promo); setIsEditing(true); window.scrollTo({top:0, behavior:'smooth'});}} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(promo.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <p className="text-sm text-stone-500 line-clamp-3 mb-4 italic leading-relaxed whitespace-pre-wrap flex-grow bg-stone-50 p-3 rounded-xl border border-stone-100">"{promo.message}"</p>
            
            <div className="flex justify-between items-end mt-auto pt-4 border-t border-stone-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 px-2 py-1 rounded-md">
                {promo.selectedProductIds?.length || 0} productos adjuntos
              </span>
            </div>
          </div>
        ))}
        
        {promotions.length === 0 && !isEditing && (
          <div className="col-span-full bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center text-stone-500">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg mb-1">Crea tu primera promoción</p>
            <p className="text-sm">Envía descuentos y catálogos a tus clientes guardados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- MÓDULO RUTA DE ENTREGA ---
function AdminDeliveryRoute({ orders, bcvRate }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('Todos');
  const [routeIds, setRouteIds] = useState([]);

  useEffect(() => {
    setRouteIds([]);
  }, [selectedDate, selectedShift]);

  const filteredOrders = orders.filter(o => {
    if (o.status === 'Cancelado') return false; 
    
    // Extracción segura de la fecha blindada
    let orderDate = o.deliveryDate || '';
    if (!orderDate && o.date) {
      try {
        if (typeof o.date === 'string' || typeof o.date === 'number') {
           const d = new Date(o.date);
           if(!isNaN(d.getTime())) orderDate = d.toISOString().split('T')[0];
        }
      } catch(e) {}
    }

    if (orderDate !== selectedDate) return false;

    if (selectedShift !== 'Todos') {
      const orderShift = o.deliveryTimeSlot || '';
      if (selectedShift === 'Mañana' && !orderShift.includes('Mañana')) return false;
      if (selectedShift === 'Tarde' && !orderShift.includes('Tarde')) return false;
    }
    return true;
  });

  const routeOrders = routeIds.map(id => filteredOrders.find(o => o.id === id)).filter(Boolean);
  const availableOrders = filteredOrders.filter(o => !routeIds.includes(o.id));

  const addToRoute = (id) => setRouteIds([...routeIds, id]);
  const removeFromRoute = (id) => setRouteIds(routeIds.filter(routeId => routeId !== id));

  const moveOrder = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === routeIds.length - 1) return;
    const newRouteIds = [...routeIds];
    const temp = newRouteIds[index];
    newRouteIds[index] = newRouteIds[index + direction];
    newRouteIds[index + direction] = temp;
    setRouteIds(newRouteIds);
  };

  const calculateBalance = (order) => {
    const totalPaid = (order.payments || []).reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
    const orderTotal = Number(order.totalUSD) || 0;
    return Math.max(0, orderTotal - totalPaid);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    await updateDoc(doc(db, 'orders', id), { status: newStatus });
  };

  const generateWhatsAppMessage = () => {
    if (routeOrders.length === 0) return alert("No has añadido pedidos a la ruta actual.");

    let msg = `🚚 *RUTA DE ENTREGA DECOMER* 🚚\n`;
    msg += `📅 *Fecha:* ${selectedDate.split('-').reverse().join('/')}\n`;
    msg += `⏰ *Turno:* ${selectedShift}\n\n`;

    routeOrders.forEach((order, index) => {
      const balance = calculateBalance(order);
      
      msg += `*📍 PARADA ${index + 1}:* ${order.displayId || 'PED'}\n`;
      msg += `👤 *Recibe:* ${order.recipientName || order.customerName || 'N/A'}\n`;
      msg += `📞 *Teléfono:* ${order.recipientPhone || order.phone || order.senderPhone || 'N/A'}\n`;
      msg += `🏠 *Dirección:* ${order.deliveryAddress || order.address || 'N/A'}\n`;
      
      const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      msg += `📦 *Entregar:* ${itemsList}\n`;

      if (balance > 0) {
        msg += `\n💰 ⚠️ *¡¡ATENCIÓN!! COBRAR AL ENTREGAR:* ⚠️\n`;
        msg += `💵 Monto: *$${balance.toFixed(2)} USD*\n`;
        msg += `🇻🇪 En Bs: *Bs. ${(balance * bcvRate).toFixed(2)}*\n`;
      } else {
        msg += `\n✅ *PAGADO* (Solo entregar)\n`;
      }
      msg += `--------------------------\n\n`;
    });

    msg += `*Conduce con cuidado.* 🍓🍫`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Map className="w-6 h-6 text-red-600"/> Constructor de Rutas</h2>
        <p className="text-stone-500">Selecciona los pedidos y arma la ruta específica para un motorizado.</p>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="flex-1">
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">1. Selecciona la Fecha</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-red-500 text-sm font-bold text-gray-800 w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">2. Selecciona el Turno</label>
            <div className="flex bg-stone-100 p-1 rounded-xl w-full">
              {['Todos', 'Mañana', 'Tarde'].map(shift => (
                <button 
                  key={shift} 
                  onClick={() => setSelectedShift(shift)}
                  className={`flex-1 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedShift === shift ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 flex flex-col max-h-[800px]">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center rounded-t-3xl shrink-0">
            <div>
              <h3 className="font-bold text-stone-700 text-sm flex items-center gap-2"><Package className="w-4 h-4"/> Pedidos Disponibles</h3>
              <p className="text-[10px] text-stone-500 mt-0.5">Pendientes por asignar ({availableOrders.length})</p>
            </div>
          </div>
          <div className="overflow-y-auto p-3 space-y-3 flex-grow bg-stone-50/50">
            {availableOrders.length === 0 ? (
              <div className="p-10 text-center text-stone-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">No hay pedidos pendientes para este filtro.</p>
              </div>
            ) : (
              availableOrders.map(order => {
                const balance = calculateBalance(order);
                return (
                  <div key={order.id} className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-black text-gray-900 text-base">{order.displayId}</span>
                        <p className="text-xs font-bold text-gray-700 mt-1">{order.recipientName || order.customerName}</p>
                      </div>
                      <button 
                        onClick={() => addToRoute(order.id)}
                        className="bg-stone-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir a Ruta
                      </button>
                    </div>
                    
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                      <span className="font-bold">Dir:</span> {order.deliveryAddress || order.address}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                      {balance > 0 ? (
                        <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-black border border-red-100">
                          COBRAR: ${balance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="bg-green-50 text-green-600 px-2 py-1 rounded-md text-[10px] font-black border border-green-100">
                          PAGADO
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-stone-400 truncate max-w-[150px]">
                        {order.items.length} items
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border-2 border-green-500 flex flex-col max-h-[800px] relative overflow-hidden">
          <div className="p-4 bg-green-50 border-b border-green-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
            <div>
              <h3 className="font-black text-green-800 text-base flex items-center gap-2"><Truck className="w-5 h-5"/> Ruta a Enviar ({routeOrders.length})</h3>
              <p className="text-[10px] text-green-600/80 mt-0.5 font-bold uppercase tracking-wider">Ordena las paradas y genera el mensaje</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {routeOrders.length > 0 && (
                <button 
                  onClick={() => setRouteIds([])}
                  className="bg-white border border-red-200 text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0"
                  title="Limpiar Ruta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={generateWhatsAppMessage}
                disabled={routeOrders.length === 0}
                className="bg-[#25D366] hover:bg-[#1ebd5a] disabled:bg-stone-300 disabled:border-stone-300 border border-[#1ebd5a] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
              >
                <Share2 className="w-4 h-4" /> Enviar Ruta
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-grow bg-white">
            {routeOrders.length === 0 ? (
              <div className="p-12 text-center text-green-600/40 flex flex-col items-center justify-center h-full">
                <Map className="w-16 h-16 mb-4 opacity-50" />
                <p className="font-bold text-sm">La ruta está vacía.</p>
                <p className="text-xs mt-1 max-w-[200px]">Añade pedidos desde el panel izquierdo para armar el recorrido.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {routeOrders.map((order, index) => {
                  const balance = calculateBalance(order);
                  return (
                    <div key={order.id} className="p-4 flex gap-3 hover:bg-green-50/30 transition-colors">
                      <div className="flex flex-col gap-1 shrink-0 bg-stone-50 p-1 rounded-xl h-fit border border-stone-100">
                        <button onClick={() => moveOrder(index, -1)} disabled={index === 0} className="p-1 text-stone-400 hover:bg-white hover:text-gray-800 disabled:opacity-30 rounded transition-colors"><ArrowUp className="w-4 h-4"/></button>
                        <div className="w-6 h-6 flex items-center justify-center font-black text-green-700 bg-green-100 rounded text-xs">{index + 1}</div>
                        <button onClick={() => moveOrder(index, 1)} disabled={index === routeOrders.length - 1} className="p-1 text-stone-400 hover:bg-white hover:text-gray-800 disabled:opacity-30 rounded transition-colors"><ArrowDown className="w-4 h-4"/></button>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-gray-900 block leading-none">{order.displayId}</span>
                            <span className="text-xs font-bold text-stone-500">{order.recipientName || order.customerName}</span>
                          </div>
                          <button 
                            onClick={() => removeFromRoute(order.id)}
                            className="text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            title="Quitar de esta ruta"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {order.deliveryAddress || order.address}
                        </p>
                        
                        <div className="flex justify-between items-center bg-stone-50 p-2 rounded-lg border border-stone-100">
                          {balance > 0 ? (
                            <span className="text-red-600 text-[10px] font-black flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> COBRAR ${balance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-green-600 text-[10px] font-black">PAGADO</span>
                          )}
                          
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            className="text-[10px] font-bold uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer text-stone-500 text-right text-ellipsis w-24"
                          >
                            <option value="En Preparación">En Prep.</option>
                            <option value="Abonado">Abonado</option>
                            <option value="Pagado">Pagado</option>
                            <option value="Completado">✓ Entregado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MÓDULO DASHBOARD / KPIs (ACTUALIZADO CON GASTOS Y GANANCIAS) ---
function AdminKPIs({ orders, expenses, bcvRate }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toLocaleDateString();

  const validOrders = orders.filter((o) => o.status !== 'Cancelado');
  
  const monthOrders = validOrders.filter((o) => {
    if(!o.date) return false;
    try {
      const d = new Date(o.date);
      if(isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } catch { return false; }
  });

  const todayOrders = validOrders.filter((o) => {
    if(!o.date) return false;
    try {
      const d = new Date(o.date);
      if(isNaN(d.getTime())) return false;
      return d.toLocaleDateString() === todayStr;
    } catch { return false; }
  });

  const monthSalesUSD = monthOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  const todaySalesUSD = todayOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  const totalHistóricoUSD = validOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  
  const monthExpenses = expenses.filter((e) => {
    try {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } catch { return false; }
  });
  const monthExpensesUSD = monthExpenses.reduce((sum, e) => sum + Number(e.amountUSD), 0);
  
  const monthNetProfit = monthSalesUSD - monthExpensesUSD;

  const pendientes = orders.filter((o) => o.status === 'Pendiente').length;
  const enPrep = orders.filter((o) => o.status === 'En Preparación').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Métricas del Negocio</h2>
        <p className="text-stone-500">Analiza el rendimiento y tus ganancias reales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VENTAS */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-stone-400 text-sm font-bold flex items-center gap-2 mb-1"><Calendar className="w-4 h-4"/> Ventas (Mes)</p>
            <p className="text-4xl font-black text-green-400">+${monthSalesUSD.toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1">Bs. {(monthSalesUSD * bcvRate).toFixed(2)}</p>
            <div className="mt-4 pt-4 border-t border-stone-700/50 flex justify-between items-center text-sm text-stone-300">
              <span>{monthOrders.length} pedidos</span>
            </div>
          </div>
          <Activity className="absolute -right-6 -bottom-6 w-32 h-32 text-stone-700 opacity-20" />
        </div>

        {/* GASTOS */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-red-800 text-sm font-bold flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4"/> Gastos (Mes)</p>
            <p className="text-4xl font-black text-red-600">-${monthExpensesUSD.toFixed(2)}</p>
            <p className="text-xs text-red-400 mt-1">Bs. {(monthExpensesUSD * bcvRate).toFixed(2)}</p>
            <div className="mt-4 pt-4 border-t border-red-200 flex justify-between items-center text-sm text-red-600 font-medium">
              <span>{monthExpenses.length} egresos reg.</span>
            </div>
          </div>
        </div>

        {/* GANANCIA NETA */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-green-800 text-sm font-bold flex items-center gap-2 mb-1"><Award className="w-4 h-4"/> Ganancia Neta (Mes)</p>
            <p className={`text-4xl font-black ${monthNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${monthNetProfit.toFixed(2)}</p>
            <p className="text-xs text-green-600/60 mt-1 font-bold">Libres de gastos</p>
            <div className="mt-4 pt-4 border-t border-green-200 flex justify-between items-center text-sm font-black text-green-700">
              <span>Rendimiento Real</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-stone-500 text-sm font-bold flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-yellow-500"/> Ventas de Hoy</p>
            <p className="text-3xl font-black text-gray-900">${todaySalesUSD.toFixed(2)}</p>
            <p className="text-sm text-stone-500 font-medium">Bs. {(todaySalesUSD * bcvRate).toFixed(2)}</p>
          </div>
          <div className="mt-4 text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-lg">{todayOrders.length} pedidos</span> hoy
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-stone-500 text-sm font-bold flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-orange-500"/> Cola de Trabajo</p>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-3xl font-black text-red-600">{pendientes}</p>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Pendientes</p>
              </div>
              <div>
                <p className="text-3xl font-black text-purple-600">{enPrep}</p>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">En Prep.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-stone-100 p-4 rounded-2xl border border-stone-200 flex justify-between items-center mt-6">
        <div>
          <h4 className="font-bold text-gray-800 text-sm">Ventas Históricas Brutas</h4>
          <p className="text-xs text-stone-500">Desde el inicio de los registros</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-gray-900">${totalHistóricoUSD.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

// --- MÓDULO CONTROL DE PEDIDOS (ACTUALIZADO CON ETIQUETAS) ---
function AdminOrders({ orders, bcvRate, products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Modal Pago
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, orderId: null });
  const [paymentForm, setPaymentForm] = useState({ 
    method: 'Pago Móvil', inputAmount: '', inputCurrency: 'BS', customBcvRate: bcvRate, 
    reference: '', bank: VENEZUELAN_BANKS[0], phone: '', accountName: '', notes: '' 
  });
  
  const [viewPaymentsModal, setViewPaymentsModal] = useState({ isOpen: false, orderId: null });
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, order: null });
  const [stickerModal, setStickerModal] = useState({ isOpen: false, order: null }); // NUEVO: Modal Sticker

  // Modal Pedido Manual / Edición
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);
  const [manualOrder, setManualOrder] = useState({ 
    senderName: '', senderPhone: '', recipientName: '', recipientPhone: '', 
    deliveryAddress: '', deliveryDate: '', deliveryTimeSlot: 'Mañana (8:00 AM - 12:00 PM)', dedication: '', items: [] 
  });
  const [manualProduct, setManualProduct] = useState('');
  const [manualQty, setManualQty] = useState(1);

  const handleStatusChange = async (id, newStatus) => {
    await updateDoc(doc(db, 'orders', id), { status: newStatus });
  };

  const openPaymentModal = (order) => {
    setPaymentForm({ 
      method: 'Pago Móvil', inputAmount: '', inputCurrency: 'BS', customBcvRate: bcvRate, 
      reference: '', bank: VENEZUELAN_BANKS[0], phone: '', accountName: '', notes: '' 
    });
    setPaymentModal({ isOpen: true, orderId: order.id });
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const order = orders.find((o) => o.id === paymentModal.orderId);
    if (!order) return;

    const rateToUse = Number(paymentForm.customBcvRate) || bcvRate;
    const amountUSDToSave = paymentForm.inputCurrency === 'BS' ? Number(paymentForm.inputAmount) / rateToUse : Number(paymentForm.inputAmount);

    if (!amountUSDToSave || amountUSDToSave <= 0) return alert("Ingresa un monto válido");

    let detailsStr = '';
    if (['Pago Móvil', 'Transferencia Bs'].includes(paymentForm.method)) detailsStr = `Banco: ${paymentForm.bank} - Tlf: ${paymentForm.phone}`;
    else if (['Zelle', 'Zinli', 'Binance'].includes(paymentForm.method)) detailsStr = `Titular/Cuenta: ${paymentForm.accountName}`;
    else if (paymentForm.method === 'Efectivo Divisas') detailsStr = paymentForm.notes ? `Notas: ${paymentForm.notes}` : '';

    const newPayment = { method: paymentForm.method, reference: paymentForm.reference || '', amountUSD: amountUSDToSave, details: detailsStr, date: new Date().toISOString() };
    const updatedPayments = [...(order.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
    const orderTotal = Number(order.totalUSD) || 0;
    
    let newStatus = order.status;
    if (totalPaid >= orderTotal) newStatus = 'Pagado';
    else if (totalPaid > 0 && totalPaid < orderTotal && order.status === 'Pendiente') newStatus = 'Abonado';

    await updateDoc(doc(db, 'orders', order.id), { status: newStatus, payments: updatedPayments });
    setPaymentModal({ isOpen: false, orderId: null });
  };

  const handleDeletePayment = async (orderId, paymentIndex) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (!window.confirm("¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.")) return;

    const updatedPayments = [...(order.payments || [])];
    updatedPayments.splice(paymentIndex, 1);
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
    const orderTotal = Number(order.totalUSD) || 0;

    let newStatus = order.status;
    if (updatedPayments.length === 0) newStatus = 'Pendiente';
    else if (totalPaid >= orderTotal) newStatus = 'Pagado';
    else newStatus = 'Abonado';

    await updateDoc(doc(db, 'orders', order.id), { payments: updatedPayments, status: newStatus });
  };

  const openCreateModal = () => {
    setEditOrderId(null);
    setManualOrder({ senderName: '', senderPhone: '', recipientName: '', recipientPhone: '', deliveryAddress: '', deliveryDate: '', deliveryTimeSlot: 'Mañana (8:00 AM - 12:00 PM)', dedication: '', items: [] });
    setIsOrderModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditOrderId(order.id);
    setManualOrder({
      senderName: order.senderName || order.customerName || '',
      senderPhone: order.senderPhone || order.phone || '',
      recipientName: order.recipientName || '',
      recipientPhone: order.recipientPhone || '',
      deliveryAddress: order.deliveryAddress || order.address || '',
      deliveryDate: order.deliveryDate || '',
      deliveryTimeSlot: order.deliveryTimeSlot || 'Mañana (8:00 AM - 12:00 PM)',
      dedication: order.dedication || '',
      items: order.items || []
    });
    setIsOrderModalOpen(true);
  };

  const closeOrderModal = () => {
    setIsOrderModalOpen(false);
    setEditOrderId(null);
  };

  const handleAddManualItem = () => {
    const productId = manualProduct || (products.length > 0 ? products[0].id : null);
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    
    const existingIndex = manualOrder.items.findIndex(i => i.id === product.id);
    let newItems = [...manualOrder.items];
    if (existingIndex >= 0) newItems[existingIndex].quantity += Number(manualQty);
    else newItems.push({ ...product, quantity: Number(manualQty) });
    setManualOrder({ ...manualOrder, items: newItems });
    setManualQty(1);
  };
  
  const handleRemoveManualItem = (index) => {
    const newItems = [...manualOrder.items];
    newItems.splice(index, 1);
    setManualOrder({ ...manualOrder, items: newItems });
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (manualOrder.items.length === 0) return alert("Debes agregar al menos un producto.");
    const totalUSD = manualOrder.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    
    const orderData = {
      senderName: manualOrder.senderName,
      senderPhone: manualOrder.senderPhone,
      recipientName: manualOrder.recipientName,
      recipientPhone: manualOrder.recipientPhone,
      deliveryAddress: manualOrder.deliveryAddress,
      deliveryDate: manualOrder.deliveryDate,
      deliveryTimeSlot: manualOrder.deliveryTimeSlot,
      dedication: manualOrder.dedication,
      items: manualOrder.items,
      totalUSD: totalUSD,
      customerName: manualOrder.senderName,
      phone: manualOrder.senderPhone,
      address: manualOrder.deliveryAddress
    };

    if (editOrderId) {
      const existingOrder = orders.find(o => o.id === editOrderId);
      const totalPaid = (existingOrder.payments || []).reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
      let newStatus = existingOrder.status;

      if (totalPaid >= totalUSD && totalUSD > 0) newStatus = 'Pagado';
      else if (totalPaid > 0 && totalPaid < totalUSD) newStatus = 'Abonado';
      else if (totalPaid === 0 && newStatus === 'Pagado') newStatus = 'Pendiente';

      await updateDoc(doc(db, 'orders', editOrderId), { ...orderData, status: newStatus });
    } else {
      await addDoc(collection(db, 'orders'), {
        ...orderData,
        displayId: `PED-M${Math.floor(Math.random() * 10000)}`,
        status: 'Pendiente',
        payments: [],
        date: new Date().toISOString()
      });
    }

    // --- GUARDAR CLIENTE Y PUNTOS ---
    const cleanPhone = String(manualOrder.senderPhone).replace(/\D/g, '');
    if (cleanPhone) {
      const clientRef = doc(db, 'clients', cleanPhone);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        await updateDoc(clientRef, { 
          totalOrders: (clientSnap.data().totalOrders || 0) + (editOrderId ? 0 : 1), 
          points: (clientSnap.data().points || 0) + (!editOrderId ? Math.floor(totalUSD) : 0),
          name: manualOrder.senderName || clientSnap.data().name, 
          address: manualOrder.deliveryAddress || clientSnap.data().address 
        });
      } else {
        await setDoc(clientRef, { 
          name: manualOrder.senderName || 'Sin Nombre', 
          phone: manualOrder.senderPhone, 
          address: manualOrder.deliveryAddress || '', 
          totalOrders: 1, 
          points: Math.floor(totalUSD),
          dateAdded: new Date().toISOString() 
        });
      }
    }
    
    closeOrderModal();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pendiente': return 'bg-orange-100 text-orange-700';
      case 'Abonado': return 'bg-yellow-100 text-yellow-700';
      case 'Pagado': return 'bg-blue-100 text-blue-700';
      case 'En Preparación': return 'bg-purple-100 text-purple-700';
      case 'Completado': return 'bg-green-100 text-green-700';
      case 'Cancelado': return 'bg-red-100 text-red-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = String(order.displayId || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(order.customerName || order.senderName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(order.phone || order.senderPhone || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Control de Pedidos</h2>
          <p className="text-stone-500">Gestiona entregas y cobros</p>
        </div>
        <button onClick={openCreateModal} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg hover:shadow-xl text-sm">
          <Plus className="w-5 h-5" /> Nuevo Pedido Manual
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
        <div className="flex bg-stone-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {['Todos', 'Pendiente', 'Pagado', 'En Preparación', 'Completado'].map(status => (
            <button 
              key={status} 
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === status ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Buscar ID, Nombre, Tlf..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-red-500 text-sm transition-colors"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto print:hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
              <th className="p-4 font-bold">ID / Fecha</th>
              <th className="p-4 font-bold">Detalles del Cliente</th>
              <th className="p-4 font-bold">Monto</th>
              <th className="p-4 font-bold">Estado del Pago</th>
              <th className="p-4 font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredOrders.map((order) => {
              const totalPaid = (order.payments || []).reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
              const orderTotal = Number(order.totalUSD) || 0;
              const balance = orderTotal - totalPaid;
              
              let dateStr = 'N/A';
              if (order.date) {
                 try {
                     if (typeof order.date === 'string' || typeof order.date === 'number') {
                         const d = new Date(order.date);
                         if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString();
                     } else if (typeof order.date === 'object' && order.date.seconds) {
                         const d = new Date(order.date.seconds * 1000);
                         if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString();
                     }
                 } catch { /* ignore */ }
              }
              
              return (
              <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-black text-gray-900">{order.displayId || 'PED-WEB'}</div>
                  <div className="text-xs text-stone-500 font-medium">{dateStr}</div>
                </td>
                <td className="p-4 text-sm text-gray-700">
                  <div className="font-bold flex items-center gap-1"><User className="w-3 h-3 text-stone-400"/> {order.senderName || order.customerName}</div>
                  <div className="text-stone-500 text-xs mt-0.5">📞 {order.senderPhone || order.phone}</div>
                </td>
                <td className="p-4">
                  <div className="font-black text-gray-900">${orderTotal.toFixed(2)}</div>
                  {order.discountUSD > 0 && <div className="text-[10px] text-pink-600 font-bold bg-pink-50 px-1 rounded inline-block mt-1">Desc: ${order.discountUSD}</div>}
                </td>
                <td className="p-4 text-sm">
                  {totalPaid > 0 ? (
                    <div className="mb-1">
                      <span className="text-green-600 font-black">${totalPaid.toFixed(2)} Pagado</span>
                      {balance > 0 && <span className="text-red-500 ml-2 text-xs font-bold bg-red-50 px-1 rounded block mt-1 w-max">Deuda: ${balance.toFixed(2)}</span>}
                      <button onClick={() => setViewPaymentsModal({ isOpen: true, orderId: order.id })} className="text-[10px] font-bold text-blue-600 hover:underline mt-1">Ver/Borrar pagos</button>
                    </div>
                  ) : (
                    <span className="text-orange-500 font-bold text-xs bg-orange-50 px-2 py-1 rounded">Por Cobrar</span>
                  )}
                  {balance > 0 && order.status !== 'Cancelado' && (
                    <button onClick={() => openPaymentModal(order)} className="mt-2 block text-xs bg-stone-900 text-white hover:bg-black px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm">
                      + Añadir Pago
                    </button>
                  )}
                </td>
                <td className="p-4 flex items-center justify-center gap-2">
                  <select 
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl border-0 outline-none cursor-pointer shadow-sm ${getStatusColor(order.status)}`}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Abonado">Abonado</option>
                    <option value="Pagado">Pagado</option>
                    <option value="En Preparación">En Preparación</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  
                  <button onClick={() => openEditModal(order)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors shadow-sm" title="Editar Pedido">
                    <Edit className="w-5 h-5" />
                  </button>

                  <button onClick={() => setStickerModal({ isOpen: true, order })} className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors shadow-sm" title="Imprimir Sticker">
                    <ScanBarcode className="w-5 h-5" />
                  </button>

                  <button onClick={() => setReceiptModal({ isOpen: true, order })} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors shadow-sm" title="Imprimir Nota">
                    <Printer className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            )})}
            {filteredOrders.length === 0 && (
              <tr><td colSpan="5" className="p-12 text-center text-stone-500 font-medium">No se encontraron pedidos con estos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL ETIQUETA TÉRMICA --- */}
      {stickerModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] print:bg-white print:p-0">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-sticker, .print-sticker * { visibility: visible; }
              .print-sticker { position: absolute; left: 0; top: 0; width: 58mm; padding: 0; box-shadow: none; border: none; font-family: monospace; }
            }
          `}</style>
          <div className="bg-white rounded-xl w-full max-w-sm flex flex-col max-h-[90vh] print:shadow-none print:w-[58mm] overflow-hidden">
            <div className="p-4 print:hidden flex justify-between items-center border-b bg-stone-50">
               <h3 className="font-bold flex items-center gap-2"><ScanBarcode className="w-5 h-5"/> Etiqueta Térmica</h3>
               <button onClick={()=>setStickerModal({isOpen: false, order: null})} className="text-stone-400 hover:text-gray-800"><X/></button>
            </div>
            
            <div className="p-4 print-sticker bg-white text-black text-[12px] leading-tight flex-grow overflow-y-auto">
               <div className="text-center font-black text-xl mb-1 tracking-widest">DECOMER</div>
               <div className="text-center text-[10px] mb-3 border-b border-black pb-2 font-bold uppercase">ORDEN: {stickerModal.order.displayId}</div>
               <div className="mb-3 space-y-1">
                 <p><b>Para:</b> {stickerModal.order.recipientName}</p>
                 <p><b>Tlf:</b> {stickerModal.order.recipientPhone}</p>
                 <p className="mt-2"><b>Dir:</b> {stickerModal.order.deliveryAddress}</p>
                 {stickerModal.order.deliveryDate && <p className="mt-1"><b>Fecha:</b> {stickerModal.order.deliveryDate}</p>}
               </div>
               <div className="border-t border-b border-dashed border-black py-2 mb-3">
                 <p className="font-bold mb-1 text-[10px]">PRODUCTOS:</p>
                 {stickerModal.order.items.map((i, idx) => (
                   <div key={idx} className="flex justify-between items-start mb-1">
                     <span className="font-bold mr-1">{i.quantity}x</span>
                     <span className="flex-1 uppercase">{i.name}</span>
                   </div>
                 ))}
               </div>
               {stickerModal.order.dedication && (
                 <div className="text-[11px] italic text-center mb-3 p-2 border border-black rounded-lg">"{stickerModal.order.dedication}"</div>
               )}
               <div className="text-center font-bold text-[10px] mt-4">¡Gracias por preferirnos!</div>
               <div className="text-center text-[8px] mt-1">@decomerfrutas</div>
            </div>
            
            <div className="p-4 print:hidden border-t bg-stone-50">
               <button onClick={()=>window.print()} className="w-full bg-stone-900 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2">
                 <Printer className="w-4 h-4"/> Imprimir Etiqueta
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL NOTA DE ENTREGA NORMAL --- */}
      {receiptModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] print:bg-white print:p-0">
          <style>{`@media print { body * { visibility: hidden; } .print-container, .print-container * { visibility: visible; } .print-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0; box-shadow: none; border: none; } }`}</style>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print-container">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 print:hidden shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Nota de Entrega</h3>
              <button onClick={() => setReceiptModal({ isOpen: false, order: null })} className="text-stone-400 hover:text-gray-800 bg-white p-1 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white flex-grow" id="receipt-content">
              <div className="text-center mb-6">
                <img src="/logo.png" alt="Decomer Frutas" className="h-20 mx-auto mb-3 object-contain" />
                <h2 className="font-serif font-bold text-2xl text-gray-900">Decomer Frutas</h2>
                <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Arreglos & Chocolates</p>
                <div className="mt-4 inline-block bg-stone-100 px-3 py-1 rounded text-sm font-bold text-gray-800">ORDEN: {receiptModal.order.displayId}</div>
              </div>

              <div className="border-t border-b border-dashed border-stone-300 py-4 mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 border-b border-stone-100 pb-2">
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase">Enviado por:</p>
                    <p className="text-sm font-bold text-gray-800">{receiptModal.order.senderName || receiptModal.order.customerName}</p>
                    <p className="text-xs text-stone-500">{receiptModal.order.senderPhone || receiptModal.order.phone}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase">Recibido por:</p>
                    <p className="text-sm font-bold text-gray-800">{receiptModal.order.recipientName || 'N/A'}</p>
                    <p className="text-xs text-stone-500">{receiptModal.order.recipientPhone}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-800"><strong className="text-gray-500">Dirección:</strong> {receiptModal.order.deliveryAddress || receiptModal.order.address}</p>
                <p className="text-sm text-gray-800"><strong className="text-gray-500">Fecha/Hora:</strong> {receiptModal.order.deliveryDate} - {receiptModal.order.deliveryTimeSlot}</p>
              </div>

              {receiptModal.order.dedication && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6">
                  <p className="text-[10px] font-bold text-red-800 mb-1 uppercase tracking-wider flex items-center gap-1"><Heart className="w-3 h-3"/> Dedicatoria:</p>
                  <p className="text-sm text-gray-800 font-serif italic text-center text-lg mt-2">"{receiptModal.order.dedication}"</p>
                </div>
              )}

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase text-[10px]">
                    <th className="text-left py-2 font-medium">Cant.</th>
                    <th className="text-left py-2 font-medium">Producto</th>
                    <th className="text-right py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {receiptModal.order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-black text-gray-700">{item.quantity}</td>
                      <td className="py-3 text-gray-800 pr-2 font-medium">{item.isExtra ? '🎈 ' : ''}{item.name}</td>
                      <td className="text-right py-3 font-bold text-gray-800">${(Number(item.price) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right border-t border-stone-300 pt-4 mb-6">
                {receiptModal.order.discountUSD > 0 && (
                  <p className="text-sm text-pink-500 mb-1 font-bold">Descuento aplicado: -${receiptModal.order.discountUSD.toFixed(2)}</p>
                )}
                <p className="text-sm text-stone-500 mb-1 font-bold">Total del Pedido</p>
                <p className="font-black text-4xl text-gray-900">${(Number(receiptModal.order.totalUSD) || 0).toFixed(2)}</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-stone-100 bg-stone-50 print:hidden shrink-0">
              <button onClick={() => window.print()} className="w-full bg-stone-900 hover:bg-black text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm">
                <Printer className="w-5 h-5" /> Imprimir Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE PAGOS AVANZADO --- */}
      {paymentModal.isOpen && orders.find((o) => o.id === paymentModal.orderId) && (() => {
        const activeOrder = orders.find((o) => o.id === paymentModal.orderId);
        
        const orderTotalUSD = Number(activeOrder.totalUSD) || 0;
        const previouslyPaidUSD = (activeOrder.payments || []).reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
        const initialBalanceUSD = Math.max(0, orderTotalUSD - previouslyPaidUSD);
        
        const rateToUse = Number(paymentForm.customBcvRate) || bcvRate;
        const inputAmountConvertedUSD = paymentForm.inputCurrency === 'BS' ? (Number(paymentForm.inputAmount) || 0) / rateToUse : (Number(paymentForm.inputAmount) || 0);

        const newRemainingUSD = Math.max(0, initialBalanceUSD - inputAmountConvertedUSD);
        const maxInputAllowed = paymentForm.inputCurrency === 'BS' ? (initialBalanceUSD * rateToUse).toFixed(2) : initialBalanceUSD.toFixed(2);

        return (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600"/> Registrar Pago</h3>
              <button onClick={() => setPaymentModal({ isOpen: false, orderId: null })} className="bg-white text-stone-400 hover:text-gray-800 p-1 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-stone-100 p-4 rounded-2xl border border-stone-200">
                <div>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Deuda Actual</p>
                  <p className="text-2xl font-black text-red-500">${initialBalanceUSD.toFixed(2)}</p>
                  <p className="text-xs font-bold text-stone-400">Bs. {(initialBalanceUSD * rateToUse).toFixed(2)}</p>
                </div>
                <div className="text-right border-l border-stone-300 pl-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Quedaría en</p>
                  <p className={`text-2xl font-black ${newRemainingUSD <= 0.01 ? 'text-green-500' : 'text-orange-500'}`}>${newRemainingUSD.toFixed(2)}</p>
                  <p className="text-xs font-bold text-stone-400">Bs. {(newRemainingUSD * rateToUse).toFixed(2)}</p>
                </div>
              </div>
              
              {initialBalanceUSD > 0 && (
              <form id="admin-payment-form" onSubmit={handleRegisterPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Método</label>
                  <select required value={paymentForm.method} 
                    onChange={e => {
                      const newMethod = e.target.value;
                      const isBsMethod = ['Pago Móvil', 'Transferencia Bs'].includes(newMethod);
                      setPaymentForm({...paymentForm, method: newMethod, inputCurrency: isBsMethod ? 'BS' : 'USD', inputAmount: ''});
                    }} 
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm bg-stone-50 font-medium">
                    <option value="Pago Móvil">Pago Móvil (Bs)</option>
                    <option value="Transferencia Bs">Transferencia Bs</option>
                    <option value="Zelle">Zelle (USD)</option>
                    <option value="Zinli">Zinli (USD)</option>
                    <option value="Binance">Binance Pay (USDT)</option>
                    <option value="Efectivo Divisas">Efectivo Divisas</option>
                  </select>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl">
                  <div className="flex bg-stone-200 p-1 rounded-xl mb-3">
                    <button type="button" onClick={()=>setPaymentForm({...paymentForm, inputCurrency: 'USD', inputAmount: ''})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${paymentForm.inputCurrency==='USD'?'bg-white shadow-sm text-green-700':'text-stone-500 hover:bg-stone-100'}`}>Ingresar en Divisas ($)</button>
                    <button type="button" onClick={()=>setPaymentForm({...paymentForm, inputCurrency: 'BS', inputAmount: ''})} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${paymentForm.inputCurrency==='BS'?'bg-white shadow-sm text-blue-700':'text-stone-500 hover:bg-stone-100'}`}>Ingresar en Bolívares (Bs)</button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Monto a Pagar ({paymentForm.inputCurrency === 'USD' ? '$ USD' : 'Bs VES'})</label>
                    <input required type="number" step="0.01" max={maxInputAllowed} value={paymentForm.inputAmount} onChange={e => setPaymentForm({...paymentForm, inputAmount: e.target.value})} 
                      className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none text-sm font-black transition-colors ${paymentForm.inputCurrency === 'USD' ? 'bg-white focus:ring-2 focus:ring-green-500 text-green-700' : 'bg-white focus:ring-2 focus:ring-blue-500 text-blue-700'}`} 
                      placeholder={`Max ${paymentForm.inputCurrency === 'USD' ? '$' : 'Bs. '}${maxInputAllowed}`} 
                    />
                  </div>
                  
                  {paymentForm.inputCurrency === 'BS' && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Tasa BCV Aplicada</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-500">Bs.</span>
                        <input type="number" step="0.01" value={paymentForm.customBcvRate} onChange={e => setPaymentForm({...paymentForm, customBcvRate: e.target.value})} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg outline-none text-xs bg-white text-stone-700 font-bold focus:border-blue-500" />
                        <button type="button" onClick={()=>setPaymentForm({...paymentForm, customBcvRate: bcvRate})} className="text-[10px] bg-stone-200 hover:bg-stone-300 px-2 py-1.5 rounded-lg font-bold text-stone-600 shrink-0">Usar Tasa Actual</button>
                      </div>
                    </div>
                  )}
                  {paymentForm.inputAmount > 0 && (
                    <div className="mt-3 text-center text-[11px] font-bold text-stone-500 bg-white py-1.5 rounded-lg border border-stone-100 shadow-sm">
                      {paymentForm.inputCurrency === 'BS' ? `Al guardarse, se registrará como $${inputAmountConvertedUSD.toFixed(2)}` : `El cliente debería enviar Bs. ${(inputAmountConvertedUSD * rateToUse).toFixed(2)}`}
                    </div>
                  )}
                </div>

                {['Pago Móvil', 'Transferencia Bs'].includes(paymentForm.method) && (
                  <div className="space-y-4 pt-2 border-t border-stone-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Banco Origen</label>
                        <select required value={paymentForm.bank} onChange={e => setPaymentForm({...paymentForm, bank: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50">
                          {VENEZUELAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tlf Emisor</label>
                        <input required type="tel" value={paymentForm.phone} onChange={e => setPaymentForm({...paymentForm, phone: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Nº de Referencia</label>
                      <input required type="text" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm bg-stone-50" />
                    </div>
                  </div>
                )}
                {['Zelle', 'Zinli', 'Binance'].includes(paymentForm.method) && (
                  <div className="space-y-4 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Titular / Cuenta</label>
                      <input required type="text" value={paymentForm.accountName} onChange={e => setPaymentForm({...paymentForm, accountName: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm bg-stone-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Referencia</label>
                      <input required type="text" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm bg-stone-50" />
                    </div>
                  </div>
                )}
                {paymentForm.method === 'Efectivo Divisas' && (
                  <div className="space-y-4 pt-2 border-t border-stone-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Notas</label>
                      <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm bg-stone-50" />
                    </div>
                  </div>
                )}
              </form>
              )}
            </div>
            
            {initialBalanceUSD > 0 && (
            <div className="p-5 border-t border-stone-100 bg-white shrink-0">
              <button form="admin-payment-form" type="submit" className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm">
                Aprobar y Registrar Pago
              </button>
            </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* --- MODAL PARA VER Y ELIMINAR PAGOS --- */}
      {viewPaymentsModal.isOpen && (() => {
        const activeOrderView = orders.find(o => o.id === viewPaymentsModal.orderId);
        if (!activeOrderView) return null;

        return (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="text-lg font-bold text-gray-800">Historial de Pagos</h3>
              <button onClick={() => setViewPaymentsModal({ isOpen: false, orderId: null })} className="bg-white text-stone-400 hover:text-gray-800 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {activeOrderView.payments?.length > 0 ? (
                <div className="space-y-3">
                  {activeOrderView.payments.map((p, i) => (
                    <div key={i} className="p-4 border border-green-200 rounded-2xl bg-green-50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-green-900 bg-green-200 px-2 py-0.5 rounded-lg">{p.method}</span>
                        <div className="flex items-start gap-3 text-right">
                          <div>
                            <span className="font-black text-lg text-green-700 block leading-none">${Number(p.amountUSD).toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-green-600">Bs. {(Number(p.amountUSD) * bcvRate).toFixed(2)}</span>
                          </div>
                          <button onClick={() => handleDeletePayment(activeOrderView.id, i)} className="text-red-400 hover:text-red-600 bg-white hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-red-100 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {p.reference && <p className="text-xs text-stone-600 font-bold mt-1">Ref: {p.reference}</p>}
                      {p.details && <p className="text-xs text-stone-500 mt-0.5">{p.details}</p>}
                      <p className="text-[10px] text-stone-400 mt-2 font-medium uppercase tracking-wider">{p.date ? new Date(p.date).toLocaleString() : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-stone-500 text-sm font-medium py-8">Este pedido no tiene pagos registrados.</p>
              )}
            </div>
          </div>
        </div>
        );
      })()}
      
      {/* --- MODAL PARA CREAR / EDITAR PEDIDO --- */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {editOrderId ? <><Edit className="w-5 h-5 text-blue-600"/> Editar Pedido</> : <><Plus className="w-5 h-5 text-red-600"/> Crear Pedido Manual</>}
              </h3>
              <button onClick={closeOrderModal} className="bg-white text-stone-400 hover:text-gray-800 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow bg-white">
              <form id="manual-order-form" onSubmit={handleSaveOrder} className="space-y-6">
                
                {/* 1. Quien Envía */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-stone-700 uppercase tracking-wider"><User className="w-4 h-4"/> 1. Datos del Cliente (Quien Paga/Envía)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required type="text" placeholder="Nombre completo" value={manualOrder.senderName} onChange={e => setManualOrder({...manualOrder, senderName: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50" />
                    <input type="tel" placeholder="Teléfono" value={manualOrder.senderPhone} onChange={e => setManualOrder({...manualOrder, senderPhone: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50" />
                  </div>
                </div>

                {/* 2. Quien Recibe */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-stone-700 uppercase tracking-wider"><Heart className="w-4 h-4"/> 2. Datos de quien recibe</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required type="text" placeholder="Nombre de quien recibe" value={manualOrder.recipientName} onChange={e => setManualOrder({...manualOrder, recipientName: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50" />
                    <input required type="tel" placeholder="Teléfono del destinatario" value={manualOrder.recipientPhone} onChange={e => setManualOrder({...manualOrder, recipientPhone: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50" />
                  </div>
                </div>

                {/* 3. Entrega */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-stone-700 uppercase tracking-wider"><MapPin className="w-4 h-4"/> 3. Detalles de la Entrega</h4>
                  <textarea required placeholder="Dirección exacta de entrega (Punto de referencia, color de casa, etc.)" rows={2} value={manualOrder.deliveryAddress} onChange={e => setManualOrder({...manualOrder, deliveryAddress: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50 resize-none" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 ml-1">Fecha de Entrega</label>
                      <input required type="date" value={manualOrder.deliveryDate} onChange={e => setManualOrder({...manualOrder, deliveryDate: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50 text-stone-700" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1 ml-1">Bloque Horario</label>
                      <select required value={manualOrder.deliveryTimeSlot} onChange={e => setManualOrder({...manualOrder, deliveryTimeSlot: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-stone-50 text-stone-700">
                        <option value="Mañana (8:00 AM - 12:00 PM)">☀️ Mañana (8am - 12pm)</option>
                        <option value="Tarde (1:00 PM - 5:00 PM)">🌤️ Tarde (1pm - 5pm)</option>
                      </select>
                    </div>
                  </div>

                  <textarea placeholder="Dedicatoria (Opcional)" rows={2} value={manualOrder.dedication} onChange={e => setManualOrder({...manualOrder, dedication: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-blue-50/30 italic resize-none" />
                </div>

                {/* 4. Productos */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> 4. Añadir / Editar Productos</h4>
                  <div className="flex flex-col sm:flex-row gap-3 mb-2 items-end">
                    <div className="flex-1 w-full">
                      <select value={manualProduct} onChange={e => setManualProduct(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white font-medium">
                        <option value="">Seleccionar del catálogo...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.isExtra ? '🎈 Extra:' : ''} {p.name} - ${Number(p.price).toFixed(2)}</option>)}
                      </select>
                    </div>
                    <div className="w-full sm:w-24">
                      <input type="number" min="1" value={manualQty} onChange={e => setManualQty(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-center font-bold" />
                    </div>
                    <button type="button" onClick={handleAddManualItem} className="w-full sm:w-auto bg-stone-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors">Añadir</button>
                  </div>
                  
                  {manualOrder.items.length > 0 && (
                    <div className="mt-4 border-t border-stone-200 pt-3 space-y-2">
                      {manualOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white border border-stone-100 p-2.5 rounded-xl shadow-sm">
                          <div className="font-medium text-sm text-gray-800"><span className="font-black bg-stone-100 px-2 py-0.5 rounded mr-2">{item.quantity}x</span> {item.name}</div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-gray-900">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                            <button type="button" onClick={() => handleRemoveManualItem(idx)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-stone-100 bg-white shrink-0">
              <button form="manual-order-form" type="submit" className={`w-full text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg text-sm flex justify-center items-center gap-2 ${editOrderId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {editOrderId ? <><Save className="w-5 h-5"/> Guardar Cambios</> : <><ArrowUpRight className="w-5 h-5"/> Generar Pedido</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MÓDULO DE PRODUCTOS (ACTUALIZADO CON STOCK) ---
function AdminProducts({ products, categories }) {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentProduct, setCurrentProduct] = useState({ id: '', name: '', price: '', image: '', description: '', categoryId: '', badge: '', isExtra: false, emoji: '', isAvailable: true, stock: '' });
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!IMGBB_API_KEY || IMGBB_API_KEY.includes('PEGAR_AQUI')) return alert("Por favor, pon tu API Key de ImgBB en el código.");

    setUploadProgress(10); 
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      setUploadProgress(60); 
      const data = await response.json();
      
      if (data.success) {
        setCurrentProduct({...currentProduct, image: data.data.url});
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 1500);
      } else {
        alert("Error al subir imagen."); setUploadProgress(0);
      }
    } catch (error) {
      alert("Error de conexión."); setUploadProgress(0);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const productData = { 
      name: currentProduct.name,
      price: parseFloat(currentProduct.price),
      image: currentProduct.image || '',
      description: currentProduct.description || '',
      categoryId: currentProduct.categoryId || (categories[0]?.id || ''),
      badge: currentProduct.badge || '',
      isExtra: currentProduct.isExtra,
      emoji: currentProduct.emoji || '',
      isAvailable: currentProduct.isAvailable !== false,
      stock: currentProduct.stock === '' ? '' : parseInt(currentProduct.stock)
    };
    
    if (currentProduct.id) await updateDoc(doc(db, 'products', currentProduct.id), productData);
    else await addDoc(collection(db, 'products'), productData);
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar este producto/extra?')) await deleteDoc(doc(db, 'products', id));
  };

  const filteredProducts = products.filter((p) => String(p.name).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catálogo de Productos y Extras</h2>
          <p className="text-stone-500">Gestiona tu oferta de arreglos e inventario</p>
        </div>
        <button onClick={() => { setCurrentProduct({ id: '', name: '', price: '', image: '', description: '', categoryId: categories[0]?.id || '', badge: '', isExtra: false, emoji: '', isAvailable: true, stock: '' }); setIsEditing(true); }}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg text-sm"
        >
          <Plus className="w-5 h-5" /> Nuevo Elemento
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-stone-200 relative animate-scale-in">
          <button onClick={()=>setIsEditing(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800"><X className="w-6 h-6"/></button>
          <h3 className="font-bold text-lg mb-6">Detalles del Producto/Extra</h3>
          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="md:col-span-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Tipo de Artículo</label>
              <select value={currentProduct.isExtra ? 'true' : 'false'} onChange={e => setCurrentProduct({...currentProduct, isExtra: e.target.value === 'true'})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-white font-bold shadow-sm">
                <option value="false">📦 Producto Normal (Arreglos, Cajas)</option>
                <option value="true">🎈 Extra Especial (Upsell en carrito)</option>
              </select>
            </div>

            <div className="md:col-span-2 bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase">Disponibilidad en Tienda</label>
                <p className="text-[10px] text-stone-500 mt-0.5">Si está apagado, los clientes no podrán verlo ni comprarlo.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={currentProduct.isAvailable !== false} onChange={e => setCurrentProduct({...currentProduct, isAvailable: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nombre</label>
              <input required type="text" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500" />
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Precio (USD)</label>
                <input required type="number" step="0.01" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500 font-black" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase" title="Dejar vacío para ilimitado">Stock</label>
                <input type="number" min="0" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: e.target.value})} placeholder="∞" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500 font-black text-center" />
              </div>
            </div>

            {currentProduct.isExtra ? (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Emoji Icono</label>
                <input required type="text" value={currentProduct.emoji} onChange={e => setCurrentProduct({...currentProduct, emoji: e.target.value})} placeholder="Ej: 🎈" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500 text-2xl" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Categoría</label>
                  <select required value={currentProduct.categoryId} onChange={e => setCurrentProduct({...currentProduct, categoryId: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Etiqueta Visual</label>
                  <select value={currentProduct.badge || ''} onChange={e => setCurrentProduct({...currentProduct, badge: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500">
                    <option value="">Ninguna</option>
                    <option value="🔥 Más Vendido">🔥 Más Vendido</option>
                    <option value="✨ Nuevo">✨ Nuevo</option>
                    <option value="⭐ Premium">⭐ Premium</option>
                  </select>
                </div>
              </>
            )}
            
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-3 uppercase">Imagen del Producto</label>
              <div className="flex gap-4 items-center">
                <label className="bg-stone-900 hover:bg-black text-white text-xs font-bold py-3 px-6 rounded-xl cursor-pointer transition-colors shadow-md">
                  + Subir Foto
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <input type="url" required={!currentProduct.isExtra} value={currentProduct.image} onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-white text-stone-500" placeholder="URL directa de la imagen" />
              </div>
              {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{width: `${uploadProgress}%`}}></div></div>}
              {currentProduct.image && <img src={currentProduct.image} alt="Preview" className="h-20 mt-4 rounded-xl object-cover shadow-sm border border-stone-200" />}
            </div>

            {!currentProduct.isExtra && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Descripción</label>
                <textarea required value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500" rows={3} />
              </div>
            )}
            
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="submit" className="px-8 py-3 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all">Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative w-full sm:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input 
          type="text" 
          placeholder="Buscar producto por nombre..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl outline-none focus:border-red-500 text-sm shadow-sm transition-colors"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 font-bold">Elemento</th>
                <th className="p-4 font-bold text-center">Disponibilidad / Stock</th>
                <th className="p-4 font-bold text-right">Precio</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="p-4 flex items-center gap-4">
                    {product.isExtra ? (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0 border border-blue-100">{product.emoji || '✨'}</div>
                    ) : (
                      <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover bg-stone-200 shrink-0 border border-stone-100" />
                    )}
                    <div>
                      <span className="font-bold text-gray-900 block">{product.name}</span>
                      {product.badge && <span className="text-[10px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">{product.badge}</span>}
                      {product.isExtra && <span className="text-[10px] text-blue-600 font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-100 ml-1 inline-block">Extra</span>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                       {product.isAvailable !== false ? (
                         <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Visible</span>
                       ) : (
                         <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-flex items-center gap-1"><X className="w-3 h-3"/> Oculto</span>
                       )}
                       <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">Stock: {product.stock !== '' && product.stock !== undefined ? product.stock : '∞'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-black text-gray-900">${Number(product.price).toFixed(2)}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => {setCurrentProduct({ ...product, stock: product.stock !== undefined ? product.stock : '' }); setIsEditing(true); window.scrollTo({top:0, behavior:'smooth'});}} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-xl transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 bg-red-50 hover:bg-red-100 p-2.5 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-stone-500 font-medium">No se encontraron productos en el catálogo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminCategories({ categories }) {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if(newCategory.trim()) {
      await addDoc(collection(db, 'categories'), { name: newCategory.trim() });
      setNewCategory('');
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Eliminar esta categoría?')) await deleteDoc(doc(db, 'categories', id));
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Categorías de Menú</h2>
        <p className="text-stone-500">Organiza cómo los clientes ven tus arreglos</p>
      </div>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input required type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Ej: Cumpleaños, Desayunos..." className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 bg-stone-50" />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md">Agregar</button>
        </form>
        
        <ul className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden bg-stone-50/30">
          {categories.map((cat) => (
            <li key={cat.id} className="py-4 px-5 flex justify-between items-center group hover:bg-white transition-colors">
              <span className="font-bold text-gray-700 flex items-center gap-3"><Tag className="w-4 h-4 text-stone-400" /> {cat.name}</span>
              <button onClick={() => handleDelete(cat.id)} className="text-stone-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
            </li>
          ))}
          {categories.length === 0 && <li className="py-8 text-center text-stone-500">Sin categorías creadas.</li>}
        </ul>
      </div>
    </div>
  );
}

// --- CLIENT COMPONENTS (Storefront) ---
function ClientStorefront({ products, categories, cart, setCart, user, bcvRate, searchQuery, coupons }) {
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');
  const [showToast, setShowToast] = useState(false);
  
  const [previewProduct, setPreviewProduct] = useState(null);
  
  // RASTREADOR DE PEDIDOS
  const [trackingModal, setTrackingModal] = useState({ isOpen: false, orderId: '', result: null, loading: false });

  // CUPONES DE DESCUENTO
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  
  const [deliveryInfo, setDeliveryInfo] = useState({ 
    senderName: user?.name || '', 
    senderPhone: user?.phone || '', 
    recipientName: '', 
    recipientPhone: '', 
    deliveryAddress: user?.address || '', 
    deliveryDate: '', 
    deliveryTimeSlot: 'Mañana (8:00 AM - 12:00 PM)', 
    dedication: '' 
  });

  const [clientPayments, setClientPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({ method: 'Zelle', reference: '', amountUSD: '', bank: VENEZUELAN_BANKS[0], phone: '' });

  const addToCart = (product) => {
    const isOutOfStock = product.stock !== '' && product.stock !== undefined && Number(product.stock) <= 0;
    if (isOutOfStock) return alert('Lo sentimos, este producto está agotado.');

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (product.stock !== '' && product.stock !== undefined && existing.quantity >= Number(product.stock)) {
         return alert(`Solo tenemos ${product.stock} unidades disponibles.`);
      }
      setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
    setPreviewProduct(null);
  };

  const handleQuickBuy = (product) => {
    const isOutOfStock = product.stock !== '' && product.stock !== undefined && Number(product.stock) <= 0;
    if (isOutOfStock) return alert('Lo sentimos, este producto está agotado.');
    addToCart(product);
    setTimeout(() => {
      setCheckoutStep(true);
      window.scrollTo(0, 0);
    }, 100);
  }

  const updateQuantity = (product, delta) => {
    setCart(cart.map((item) => {
      if (item.id === product.id) {
        const newQty = item.quantity + delta;
        if (delta > 0 && product.stock !== '' && product.stock !== undefined && newQty > Number(product.stock)) {
          alert(`Solo tenemos ${product.stock} unidades disponibles.`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const applyCoupon = () => {
    if (!couponCode) return;
    const found = coupons.find(c => c.code === couponCode.toUpperCase() && c.active);
    if (!found) {
      setAppliedCoupon(null);
      return alert('Cupón no válido o expirado.');
    }
    setAppliedCoupon(found);
  };
  
  const subtotalUSD = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  let discountUSD = 0;
  if (appliedCoupon) {
    discountUSD = appliedCoupon.type === 'percent' ? subtotalUSD * (appliedCoupon.value / 100) : appliedCoupon.value;
  }
  const totalUSD = Math.max(0, subtotalUSD - discountUSD);
  
  const totalPaidUSD = clientPayments.reduce((sum, p) => sum + Number(p.amountUSD), 0);
  const balanceUSD = totalUSD - totalPaidUSD;

  const handleAddPayment = () => {
    const amount = Number(currentPayment.amountUSD);
    if (!amount || amount <= 0) return alert("Monto inválido");
    if (amount > balanceUSD + 0.01) return alert("Supera la deuda");
    
    setClientPayments([...clientPayments, { 
      ...currentPayment, 
      amountUSD: amount,
      details: (currentPayment.method === 'Pago Móvil' || currentPayment.method === 'Transferencia Bs') ? `Banco: ${currentPayment.bank} - Tlf: ${currentPayment.phone}` : ''
    }]);
    setCurrentPayment({ method: 'Zelle', reference: '', amountUSD: '', bank: VENEZUELAN_BANKS[0], phone: '' });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    const phone = "584125296272";
    const orderDisplayId = `PED-${Math.floor(Math.random() * 10000)}`;
    
    await addDoc(collection(db, 'orders'), {
      displayId: orderDisplayId,
      ...deliveryInfo,
      items: cart,
      subtotalUSD: subtotalUSD,
      discountUSD: discountUSD,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      totalUSD: totalUSD,
      status: clientPayments.length > 0 ? (totalPaidUSD >= totalUSD ? 'Pagado' : 'Abonado') : 'Pendiente',
      payments: clientPayments.map(p => ({ ...p, date: new Date().toISOString() })),
      date: new Date().toISOString()
    });

    // --- ACTUALIZAR INVENTARIO ---
    for (const item of cart) {
      if (item.stock !== '' && item.stock !== undefined) {
        const newStock = Math.max(0, Number(item.stock) - item.quantity);
        await updateDoc(doc(db, 'products', item.id), { stock: newStock });
      }
    }

    // --- GUARDAR CLIENTE Y PUNTOS DE FIDELIDAD ---
    const cleanPhone = String(deliveryInfo.senderPhone).replace(/\D/g, '');
    if (cleanPhone) {
      const clientRef = doc(db, 'clients', cleanPhone);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        await updateDoc(clientRef, { 
          totalOrders: (clientSnap.data().totalOrders || 0) + 1, 
          points: (clientSnap.data().points || 0) + Math.floor(totalUSD),
          name: deliveryInfo.senderName || clientSnap.data().name, 
          address: deliveryInfo.deliveryAddress || clientSnap.data().address 
        });
      } else {
        await setDoc(clientRef, { 
          name: deliveryInfo.senderName || 'Sin Nombre', 
          phone: deliveryInfo.senderPhone, 
          address: deliveryInfo.deliveryAddress || '', 
          totalOrders: 1, 
          points: Math.floor(totalUSD),
          dateAdded: new Date().toISOString() 
        });
      }
    }

    let text = `*¡Hola Decomer Frutas! Nuevo Pedido Web* 🍓🍫\n\n*Orden:* #${orderDisplayId}\n\n`;
    text += `*📤 QUIEN ENVÍA:*\n`;
    text += `▪️ Nombre: ${deliveryInfo.senderName}\n`;
    text += `▪️ Teléfono: ${deliveryInfo.senderPhone}\n\n`;
    text += `*📥 QUIEN RECIBE:*\n`;
    text += `▪️ Nombre: ${deliveryInfo.recipientName}\n`;
    text += `▪️ Teléfono: ${deliveryInfo.recipientPhone}\n\n`;
    text += `*📍 DETALLES DE ENTREGA:*\n`;
    text += `▪️ Dirección: ${deliveryInfo.deliveryAddress}\n`;
    text += `▪️ Fecha: ${deliveryInfo.deliveryDate}\n`;
    text += `▪️ Horario: ${deliveryInfo.deliveryTimeSlot}\n\n`;
    
    if(deliveryInfo.dedication) {
      text += `*📝 DEDICATORIA:*\n_"${deliveryInfo.dedication}"_\n\n`;
    }
    
    text += `*📦 PRODUCTOS:*\n`;
    cart.forEach((item) => { 
      text += `▪️ ${item.quantity}x ${item.isExtra && item.emoji ? item.emoji : ''} ${item.name} ($${Number(item.price).toFixed(2)})\n`; 
    });
    
    text += `\n*💰 SUBTOTAL:* $${subtotalUSD.toFixed(2)}\n`;
    if (appliedCoupon) {
      text += `🎟️ *CUPÓN (${appliedCoupon.code}):* -$${discountUSD.toFixed(2)}\n`;
    }
    text += `*🔥 TOTAL:* $${totalUSD.toFixed(2)} (Bs. ${(totalUSD * bcvRate).toFixed(2)})\n`;
    
    text += `\n*💳 FORMAS DE PAGO:*\n`;
    if (clientPayments.length === 0) {
      text += `▪️ Pendiente por pagar\n`;
    } else {
       clientPayments.forEach(p => { 
         text += `▪️ ${p.method}: $${Number(p.amountUSD).toFixed(2)} ${p.reference ? `(Ref: ${p.reference})` : ''}\n`; 
       });
       if (balanceUSD > 0) text += `*Saldo Restante:* $${balanceUSD.toFixed(2)}\n`;
       else text += `*Estado:* PAGADO COMPLETO ✅\n`;
    }
    text += `\n⭐ *Has acumulado ${Math.floor(totalUSD)} Puntos Decomer con esta compra.*`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    setCart([]); setClientPayments([]); setCheckoutStep(false); setAppliedCoupon(null); setCouponCode('');
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    if (!trackingModal.orderId) return;
    setTrackingModal({ ...trackingModal, loading: true, result: null });
    
    try {
      const q = query(collection(db, 'orders'), where('displayId', '==', trackingModal.orderId.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setTrackingModal({ ...trackingModal, loading: false, result: 'NOT_FOUND' });
      } else {
        setTrackingModal({ ...trackingModal, loading: false, result: querySnapshot.docs[0].data() });
      }
    } catch (error) {
      setTrackingModal({ ...trackingModal, loading: false, result: 'ERROR' });
    }
  };

  const availableProducts = products.filter(p => p.isAvailable !== false);
  const mainProducts = availableProducts.filter((p) => !p.isExtra);
  const extraProducts = availableProducts.filter((p) => p.isExtra);

  let filteredProducts = mainProducts.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch = String(p.name).toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchPrice = true;
    if (priceFilter === 'under20') matchPrice = Number(p.price) < 20;
    if (priceFilter === '20to40') matchPrice = Number(p.price) >= 20 && Number(p.price) <= 40;
    if (priceFilter === 'premium') matchPrice = Number(p.price) > 40;

    return matchCategory && matchSearch && matchPrice;
  });

  if (sortOrder === 'price-asc') {
    filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortOrder === 'price-desc') {
    filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 animate-fade-in relative w-full">
      <a href="https://wa.me/584125296272" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1ebd5a] transition-transform hover:scale-110 z-40 flex items-center justify-center print:hidden group">
        <MessageCircle className="w-7 h-7" />
      </a>

      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-stone-900/95 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 pointer-events-none ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="font-medium text-sm">Agregado al carrito</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl p-8 sm:p-10 text-white mb-6 shadow-lg relative overflow-hidden flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6">
          <div className="relative z-10 w-full sm:w-auto text-center sm:text-left">
            <h1 className="text-3xl sm:text-5xl font-black mb-3 font-serif drop-shadow-md">Regala dulzura y amor</h1>
            <p className="text-red-50 text-base sm:text-lg max-w-lg leading-relaxed font-medium mb-6">Descubre nuestros hermosos arreglos frutales y fresas con chocolate. 🍓🍫</p>
            <button onClick={() => setTrackingModal({ isOpen: true, orderId: '', result: null, loading: false })} className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 backdrop-blur-sm transition-all shadow-sm w-max mx-auto sm:mx-0">
              <Search className="w-4 h-4"/> Rastrear mi Pedido
            </button>
          </div>
          <Heart className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-stone-100">
            <div className="bg-red-50 text-red-500 p-3 rounded-xl"><MousePointer2 className="w-6 h-6"/></div>
            <div><p className="text-sm font-bold text-gray-800">1. Eliges tu regalo</p><p className="text-xs text-stone-500">Añade al carrito</p></div>
          </div>
          <div className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-stone-100">
            <div className="bg-pink-50 text-pink-500 p-3 rounded-xl"><Gift className="w-6 h-6"/></div>
            <div><p className="text-sm font-bold text-gray-800">2. Lo preparamos</p><p className="text-xs text-stone-500">Con frutas frescas</p></div>
          </div>
          <div className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-stone-100">
            <div className="bg-green-50 text-green-500 p-3 rounded-xl"><Truck className="w-6 h-6"/></div>
            <div><p className="text-sm font-bold text-gray-800">3. ¡Entregamos!</p><p className="text-xs text-stone-500">Sorpresa garantizada</p></div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6 w-full min-w-0">
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full min-w-0">
            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 ${selectedCategory === 'all' ? 'bg-red-600 text-white' : 'bg-white text-stone-600 hover:bg-red-50'}`}>Todos</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 whitespace-nowrap ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-white text-stone-600 hover:bg-red-50'}`}>{cat.name}</button>
            ))}
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full min-w-0">
            <button onClick={() => setPriceFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${priceFilter === 'all' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Cualquier Precio</button>
            <button onClick={() => setPriceFilter('under20')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${priceFilter === 'under20' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Menos de $20</button>
            <button onClick={() => setPriceFilter('20to40')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${priceFilter === '20to40' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>$20 - $40</button>
            <button onClick={() => setPriceFilter('premium')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${priceFilter === 'premium' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Premium</button>
            
            <div className="ml-auto flex items-center gap-2 pl-2 border-l border-stone-200 shrink-0">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-red-500 transition-colors shadow-sm cursor-pointer">
                <option value="default">✨ Relevantes</option>
                <option value="price-asc">📈 Menor a Mayor Precio</option>
                <option value="price-desc">📉 Mayor a Menor Precio</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock !== '' && product.stock !== undefined && Number(product.stock) <= 0;

            return (
            <div key={product.id} className={`bg-white rounded-2xl shadow-sm hover:shadow-xl border border-stone-100 overflow-hidden flex flex-col transition-all duration-300 relative ${isOutOfStock ? 'opacity-70 grayscale-[30%]' : 'group'}`}>
              {product.badge && !isOutOfStock && (
                <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-yellow-100">
                  <span className="text-xs font-black text-gray-800">{product.badge}</span>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white px-3 py-1.5 rounded shadow-lg border border-red-700">
                  <span className="text-xs font-black tracking-widest">AGOTADO</span>
                </div>
              )}
              
              <div className="h-56 bg-stone-100 overflow-hidden relative cursor-pointer" onClick={() => setPreviewProduct(product)}>
                <img src={product.image} className={`w-full h-full object-cover transform transition-transform duration-500 ${!isOutOfStock && 'group-hover:scale-105'}`} alt={product.name} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-stone-800 text-xs font-bold px-3 py-2 rounded-full shadow-lg backdrop-blur-sm transition-all flex items-center gap-1"><Eye className="w-4 h-4"/> Ver Detalle</span>
                </div>
              </div>
              
              <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                <p className="text-stone-500 text-sm mb-4 mt-1 flex-grow line-clamp-2 leading-relaxed">{product.description}</p>
                <div className="flex flex-wrap items-center justify-between mt-auto pt-4 border-t border-stone-100 gap-2">
                  <div className="min-w-0">
                    <div className="text-xl sm:text-2xl font-black text-gray-900">${Number(product.price).toFixed(2)}</div>
                    <div className="text-[10px] sm:text-xs text-stone-500 font-medium">Bs. {(Number(product.price) * bcvRate).toFixed(2)}</div>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2 shrink-0 ml-auto">
                    <button disabled={isOutOfStock} onClick={() => handleQuickBuy(product)} title="Comprar Ahora" className="bg-gray-100 text-gray-600 hover:bg-stone-800 hover:text-white disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed p-2.5 rounded-xl transition-colors shrink-0"><Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></button>
                    <button disabled={isOutOfStock} onClick={() => addToCart(product)} title="Añadir al carrito" className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white disabled:bg-red-50 disabled:text-red-200 disabled:cursor-not-allowed p-2.5 rounded-xl transition-colors shrink-0"><Plus className="w-4 h-4 sm:w-5 sm:h-5 font-bold" /></button>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
          {filteredProducts.length === 0 && (
             <div className="col-span-full py-20 text-center text-stone-500">
               <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p className="font-medium">No encontramos arreglos con esos filtros.</p>
             </div>
          )}
        </div>
      </div>

      <div id="cart-section" className="w-full lg:w-80 xl:w-[400px] shrink-0">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Mi Pedido</h3>
            <span className="bg-stone-800 text-stone-300 text-xs font-bold px-2 py-1 rounded-md">{cart.reduce((a,c)=>a+c.quantity,0)} items</span>
          </div>
          
          <div className="p-6 flex-grow overflow-y-auto bg-stone-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 py-10 opacity-70">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="font-medium text-center">Tu carrito está vacío.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4 items-center mb-5 bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
                  {item.isExtra ? (
                    <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center text-3xl shrink-0">{item.emoji || '✨'}</div>
                  ) : (
                    <img src={item.image || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-xl object-cover bg-stone-100 text-[8px] text-center" alt={item.name} />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                    <p className="text-red-600 font-black text-sm mt-0.5">${Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center bg-stone-100 rounded-lg p-1 shrink-0">
                    <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-md transition-all">-</button>
                    <span className="w-6 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-md transition-all">+</button>
                  </div>
                </div>
              ))
            )}

            {cart.length > 0 && extraProducts.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Star className="w-3 h-3"/> Agrega un Extra</p>
                <div className="grid grid-cols-2 gap-2">
                  {extraProducts.map((extra) => {
                    const isOutOfStock = extra.stock !== '' && extra.stock !== undefined && Number(extra.stock) <= 0;
                    return (
                    <button disabled={isOutOfStock} key={extra.id} onClick={() => addToCart(extra)} className="bg-white border border-stone-200 hover:border-pink-300 disabled:opacity-50 disabled:hover:border-stone-200 p-2 rounded-xl flex items-center gap-2 text-left transition-all hover:shadow-sm group">
                      <div className="bg-stone-50 w-8 h-8 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0">{extra.emoji || '✨'}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-800 leading-tight truncate">{extra.name}</p>
                        <p className="text-[10px] text-red-500 font-bold">{isOutOfStock ? 'Agotado' : `+$${Number(extra.price).toFixed(2)}`}</p>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {cart.length > 0 && (
              <div className="mt-6 pt-6 border-t border-stone-200">
                <p className="text-xs font-bold text-stone-600 uppercase mb-2 flex items-center gap-1"><Ticket className="w-3 h-3"/> Cupón de Descuento</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ej: MAMA20" value={couponCode} onChange={e=>setCouponCode(e.target.value)} disabled={!!appliedCoupon} className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none font-bold uppercase disabled:bg-stone-100" />
                  {!appliedCoupon ? (
                    <button onClick={applyCoupon} className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">Aplicar</button>
                  ) : (
                    <button onClick={() => {setAppliedCoupon(null); setCouponCode('');}} className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm"><X className="w-4 h-4"/></button>
                  )}
                </div>
                {appliedCoupon && <p className="text-[10px] font-bold text-green-600 mt-1.5 ml-1">✓ Cupón {appliedCoupon.code} activado</p>}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-stone-100">
              <div className="space-y-1 mb-4">
                <div className="flex justify-between items-center text-sm text-stone-500">
                  <span>Subtotal</span>
                  <span>${subtotalUSD.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm text-pink-500 font-bold">
                    <span>Descuento</span>
                    <span>-${discountUSD.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2 border-t border-stone-100 mt-2">
                  <span className="text-stone-500 font-bold">Total a Pagar</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900">${totalUSD.toFixed(2)}</div>
                    <div className="text-[10px] font-bold text-stone-400">Bs. {(totalUSD * bcvRate).toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => setCheckoutStep(true)} className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
                Ir a Pagar
              </button>
            </div>
          )}
        </div>
      </div>

      {previewProduct && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
            <button onClick={() => setPreviewProduct(null)} className="absolute top-4 right-4 z-10 bg-white/50 backdrop-blur hover:bg-white p-2 rounded-full text-stone-800 transition-colors"><X className="w-5 h-5"/></button>
            
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-stone-100 relative">
              <img src={previewProduct.image} className="w-full h-full object-cover" alt={previewProduct.name} />
              {previewProduct.badge && (
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-yellow-100">
                  <span className="text-sm font-black text-gray-800">{previewProduct.badge}</span>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center bg-white">
              <div className="mb-2 flex justify-between items-center">
                <div className="text-xs font-bold text-red-500 uppercase tracking-widest">{categories.find((c)=>c.id === previewProduct.categoryId)?.name || 'Arreglo Especial'}</div>
                {previewProduct.stock !== '' && previewProduct.stock !== undefined && (
                  <div className={`text-[10px] font-black px-2 py-1 rounded ${Number(previewProduct.stock) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {Number(previewProduct.stock) > 0 ? `${previewProduct.stock} Disponibles` : 'AGOTADO'}
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{previewProduct.name}</h2>
              <p className="text-stone-500 text-base mb-8 leading-relaxed whitespace-pre-wrap">{previewProduct.description}</p>
              
              <div className="mb-8 p-5 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="text-sm text-stone-500 font-medium mb-1">Precio</div>
                <div className="text-4xl font-black text-red-600">${Number(previewProduct.price).toFixed(2)}</div>
                <div className="text-sm font-bold text-stone-400 mt-1">Equivalente: Bs. {(Number(previewProduct.price) * bcvRate).toFixed(2)}</div>
              </div>
              
              <div className="flex gap-3">
                <button disabled={previewProduct.stock !== '' && previewProduct.stock !== undefined && Number(previewProduct.stock) <= 0} onClick={() => addToCart(previewProduct)} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-xl shadow-red-200 transition-transform hover:-translate-y-1">
                  <ShoppingCart className="w-5 h-5" /> {(previewProduct.stock !== '' && previewProduct.stock !== undefined && Number(previewProduct.stock) <= 0) ? 'No Disponible' : 'Agregar al Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CHECKOUT --- */}
      {checkoutStep && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-gray-800">Detalles de Entrega</h3>
                <p className="text-xs text-stone-500 font-medium mt-1">Por favor completa todos los campos para tu pedido</p>
              </div>
              <button onClick={() => setCheckoutStep(false)} className="bg-stone-200 hover:bg-stone-300 p-2 rounded-full text-stone-600 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white">
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
                
                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-red-600 uppercase tracking-wider"><User className="w-4 h-4"/> 1. Datos de quien envía (Tú)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nombre completo" value={deliveryInfo.senderName} onChange={e=>setDeliveryInfo({...deliveryInfo, senderName:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"/>
                    <input required type="tel" placeholder="Teléfono" value={deliveryInfo.senderPhone} onChange={e=>setDeliveryInfo({...deliveryInfo, senderPhone:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"/>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-red-600 uppercase tracking-wider"><Heart className="w-4 h-4"/> 2. Datos de quien recibe la Sorpresa</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nombre de quien recibe" value={deliveryInfo.recipientName} onChange={e=>setDeliveryInfo({...deliveryInfo, recipientName:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"/>
                    <input required type="tel" placeholder="Teléfono del destinatario" value={deliveryInfo.recipientPhone} onChange={e=>setDeliveryInfo({...deliveryInfo, recipientPhone:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"/>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-red-600 uppercase tracking-wider"><MapPin className="w-4 h-4"/> 3. Detalles de la Entrega</h4>
                  <textarea required placeholder="Dirección exacta de entrega (Punto de referencia, color de casa, etc.)" rows={2} value={deliveryInfo.deliveryAddress} onChange={e=>setDeliveryInfo({...deliveryInfo, deliveryAddress:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none"/>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Fecha de Entrega</label>
                      <input required type="date" value={deliveryInfo.deliveryDate} onChange={e=>setDeliveryInfo({...deliveryInfo, deliveryDate:e.target.value})} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 text-stone-700"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Bloque Horario</label>
                      <select required value={deliveryInfo.deliveryTimeSlot} onChange={e=>setDeliveryInfo({...deliveryInfo, deliveryTimeSlot:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 text-stone-700 bg-white">
                        <option value="Mañana (8:00 AM - 12:00 PM)">☀️ Mañana (8am - 12pm)</option>
                        <option value="Tarde (1:00 PM - 5:00 PM)">🌤️ Tarde (1pm - 5pm)</option>
                      </select>
                    </div>
                  </div>

                  <textarea placeholder="Dedicatoria (Escribe el mensaje que llevará tu tarjeta)" rows={2} value={deliveryInfo.dedication} onChange={e=>setDeliveryInfo({...deliveryInfo, dedication:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none bg-red-50/50 italic"/>
                </div>

                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-blue-600 uppercase tracking-wider"><CreditCard className="w-4 h-4"/> 4. Forma de Pago</h4>
                  {balanceUSD > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select value={currentPayment.method} onChange={e=>setCurrentPayment({...currentPayment, method:e.target.value})} className="w-full px-3 py-3 border border-stone-200 rounded-xl text-sm bg-white outline-none">
                          <option value="Zelle">Zelle</option>
                          <option value="Pago Móvil">Pago Móvil</option>
                          <option value="Efectivo Divisas">Efectivo Divisas</option>
                          <option value="Zinli">Zinli</option>
                          <option value="Binance">Binance Pay</option>
                        </select>
                        <input type="number" step="0.01" max={balanceUSD} placeholder={`Monto USD (Deuda: $${balanceUSD.toFixed(2)})`} value={currentPayment.amountUSD} onChange={e=>setCurrentPayment({...currentPayment, amountUSD:e.target.value})} className="w-full px-3 py-3 border border-stone-200 rounded-xl text-sm outline-none"/>
                      </div>
                      {currentPayment.method === 'Pago Móvil' && currentPayment.amountUSD && <p className="text-[11px] text-blue-600 font-bold bg-blue-50 p-2 rounded-lg">Monto en Bolívares: Bs. {(Number(currentPayment.amountUSD) * bcvRate).toFixed(2)}</p>}
                      <button type="button" onClick={handleAddPayment} className="w-full bg-stone-800 hover:bg-black text-white text-sm py-3 rounded-xl font-bold transition-all shadow-md">Registrar este pago</button>
                    </div>
                  )}
                  {clientPayments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {clientPayments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-green-50 rounded-xl text-sm text-green-900 border border-green-200">
                          <span className="font-bold">${p.amountUSD} - {p.method}</span>
                          <button type="button" onClick={() => setClientPayments(clientPayments.filter((_, idx) => idx !== i))} className="text-red-500 bg-white p-1 rounded-md shadow-sm"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 bg-white">
              <p className="text-center text-xs font-bold text-pink-600 mb-3"><Award className="w-3 h-3 inline relative -top-0.5"/> Sumarás {Math.floor(totalUSD)} Puntos Decomer al completar esta compra.</p>
              <button form="checkout-form" type="submit" className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-xl transition-all hover:-translate-y-1">
                <Send className="w-5 h-5" /> Confirmar y Enviar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL RASTREO DE PEDIDO --- */}
      {trackingModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
             <div className="p-5 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Search className="w-5 h-5"/> Rastrear Pedido</h3>
              <button onClick={() => setTrackingModal({ isOpen: false, orderId: '', result: null, loading: false })} className="text-stone-400 hover:text-gray-800 bg-white p-1 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6">
               <form onSubmit={handleTrackOrder} className="flex flex-col gap-3 mb-6">
                 <p className="text-xs text-stone-500 font-bold mb-1">Ingresa el ID de tu pedido (Ej: PED-1234)</p>
                 <input autoFocus required type="text" placeholder="PED-..." value={trackingModal.orderId} onChange={e=>setTrackingModal({...trackingModal, orderId: e.target.value})} className="px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-lg outline-none focus:border-red-500 font-black uppercase text-center" />
                 <button type="submit" disabled={trackingModal.loading} className="w-full bg-stone-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-md disabled:bg-stone-300">
                   {trackingModal.loading ? 'Buscando...' : 'Buscar Pedido'}
                 </button>
               </form>

               {trackingModal.result === 'NOT_FOUND' && (
                 <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                   <p className="text-red-600 font-bold text-sm">No encontramos ningún pedido con ese ID.</p>
                   <p className="text-red-400 text-xs mt-1">Revisa que esté bien escrito.</p>
                 </div>
               )}
               {trackingModal.result === 'ERROR' && (
                 <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                   <p className="text-red-600 font-bold text-sm">Ocurrió un error al buscar.</p>
                 </div>
               )}

               {trackingModal.result && trackingModal.result !== 'NOT_FOUND' && trackingModal.result !== 'ERROR' && (
                 <div className="bg-white border-2 border-stone-100 p-5 rounded-2xl shadow-sm">
                   <div className="flex justify-between items-center mb-4 pb-4 border-b border-stone-100">
                     <div>
                       <span className="text-xs font-bold text-stone-400 uppercase">Orden</span>
                       <p className="text-xl font-black text-gray-900">{trackingModal.result.displayId}</p>
                     </div>
                     <div className="text-right">
                       <span className="text-[10px] font-bold text-stone-400 uppercase">Fecha</span>
                       <p className="text-sm font-bold text-gray-800">{trackingModal.result.deliveryDate || 'N/A'}</p>
                     </div>
                   </div>

                   <p className="text-xs font-bold text-stone-400 uppercase mb-2">Estado del Pedido:</p>
                   {trackingModal.result.status === 'Pendiente' && <div className="bg-orange-100 text-orange-700 p-3 rounded-xl font-black text-center flex items-center justify-center gap-2"><Clock className="w-5 h-5"/> Pendiente (Por Confirmar/Pagar)</div>}
                   {trackingModal.result.status === 'Abonado' && <div className="bg-yellow-100 text-yellow-700 p-3 rounded-xl font-black text-center flex items-center justify-center gap-2"><DollarSign className="w-5 h-5"/> Abonado (Pago Incompleto)</div>}
                   {trackingModal.result.status === 'Pagado' && <div className="bg-blue-100 text-blue-700 p-3 rounded-xl font-black text-center flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/> Pagado y en Cola</div>}
                   {trackingModal.result.status === 'En Preparación' && <div className="bg-purple-100 text-purple-700 p-3 rounded-xl font-black text-center flex items-center justify-center gap-2"><Gift className="w-5 h-5"/> ¡En Preparación / En Camino!</div>}
                   {trackingModal.result.status === 'Completado' && <div className="bg-green-100 text-green-700 p-3 rounded-xl font-black text-center flex items-center justify-center gap-2"><Heart className="w-5 h-5"/> Entregado con Éxito</div>}
                   {trackingModal.result.status === 'Cancelado' && <div className="bg-red-100 text-red-700 p-3 rounded-xl font-black text-center flex items-center justify-center gap-2"><X className="w-5 h-5"/> Cancelado</div>}

                   <div className="mt-4 pt-4 border-t border-stone-100 text-center">
                     <p className="text-xs text-stone-500 font-bold mb-1">Entregando a:</p>
                     <p className="text-sm font-black text-gray-800">{trackingModal.result.recipientName || 'N/A'}</p>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}