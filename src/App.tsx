import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { 
  ShoppingCart, User, Lock, Mail, Phone, MapPin, Plus, Trash2, Edit, LogOut, Instagram, Facebook,
  CheckCircle, X, Package, TrendingUp, DollarSign, List, Tag, ShoppingBag, CreditCard, Activity, Calendar, 
  Search, MessageCircle, Heart, Zap, Star, Gift, Truck, MousePointer2, Eye, Printer, Send, Users, ArrowUpRight, Clock,
  Map, ArrowUp, ArrowDown, Share2, AlertTriangle, Save
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
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

    let unsubOrders = () => {};
    if (currentUser?.role === 'admin') {
      unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
        const sortedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
          const timeA = a.date && !isNaN(new Date(a.date).getTime()) ? new Date(a.date).getTime() : 0;
          const timeB = b.date && !isNaN(new Date(b.date).getTime()) ? new Date(b.date).getTime() : 0;
          return timeB - timeA;
        });
        setOrders(sortedOrders);
      });
    }

    return () => {
      unsubProducts();
      unsubCategories();
      unsubOrders();
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
          <AdminDashboard products={products} categories={categories} orders={orders} bcvRate={bcvRate} />
        ) : (
          <ClientStorefront 
            products={products} 
            categories={categories} 
            cart={cart} 
            setCart={setCart} 
            user={currentUser} 
            bcvRate={bcvRate}
            searchQuery={searchQuery}
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
function AdminDashboard({ products, categories, orders, bcvRate }) {
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
            <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'orders' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}>
              <ShoppingBag className="w-5 h-5" /> Pedidos 
              {orders.filter((o)=>o.status==='Pendiente').length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{orders.filter((o)=>o.status==='Pendiente').length}</span>}
            </button>
            
            <button onClick={() => setActiveTab('delivery')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'delivery' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Map className="w-5 h-5" /> Rutas de Entrega</button>
            <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'customers' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Users className="w-5 h-5" /> Mis Clientes</button>
            
            <div className="pt-4 mt-4 border-t border-stone-100"></div>
            
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'products' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Tag className="w-5 h-5" /> Catálogo / Extras</button>
            <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'categories' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><List className="w-5 h-5" /> Categorías</button>
          </nav>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {activeTab === 'kpis' && <AdminKPIs orders={orders} bcvRate={bcvRate} />}
        {activeTab === 'orders' && <AdminOrders orders={orders} bcvRate={bcvRate} products={products} />}
        {activeTab === 'delivery' && <AdminDeliveryRoute orders={orders} bcvRate={bcvRate} />}
        {activeTab === 'customers' && <AdminCustomers orders={orders} />}
        {activeTab === 'products' && <AdminProducts products={products} categories={categories} />}
        {activeTab === 'categories' && <AdminCategories categories={categories} />}
      </div>
    </div>
  );
}

// --- MÓDULO REDISEÑADO: RUTAS DE ENTREGA DINÁMICO ---
function AdminDeliveryRoute({ orders, bcvRate }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('Todos');
  const [routeIds, setRouteIds] = useState([]); // Array para mantener el orden de los IDs seleccionados

  // Limpiar la ruta en construcción si cambias de día o turno
  useEffect(() => {
    setRouteIds([]);
  }, [selectedDate, selectedShift]);

  // Filtrar todos los pedidos que aplican para este día y turno (excluyendo cancelados)
  const filteredOrders = orders.filter(o => {
    if (o.status === 'Cancelado') return false; 
    
    const orderDate = o.deliveryDate || (o.date ? o.date.split('T')[0] : '');
    if (orderDate !== selectedDate) return false;

    if (selectedShift !== 'Todos') {
      const orderShift = o.deliveryTimeSlot || '';
      if (selectedShift === 'Mañana' && !orderShift.includes('Mañana')) return false;
      if (selectedShift === 'Tarde' && !orderShift.includes('Tarde')) return false;
    }
    return true;
  });

  // Dividir los pedidos en dos grupos: Los que están en la ruta actual y los disponibles
  const routeOrders = routeIds.map(id => filteredOrders.find(o => o.id === id)).filter(Boolean);
  const availableOrders = filteredOrders.filter(o => !routeIds.includes(o.id));

  const addToRoute = (id) => {
    setRouteIds([...routeIds, id]);
  };

  const removeFromRoute = (id) => {
    setRouteIds(routeIds.filter(routeId => routeId !== id));
  };

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
    if (routeOrders.length === 0) {
      alert("No has añadido pedidos a la ruta actual.");
      return;
    }

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

      {/* Panel de Filtros */}
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
        
        {/* PANEL 1: PEDIDOS DISPONIBLES */}
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

        {/* PANEL 2: RUTA EN CONSTRUCCIÓN */}
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
                      
                      {/* Controles de Orden (Izquierda) */}
                      <div className="flex flex-col gap-1 shrink-0 bg-stone-50 p-1 rounded-xl h-fit border border-stone-100">
                        <button onClick={() => moveOrder(index, -1)} disabled={index === 0} className="p-1 text-stone-400 hover:bg-white hover:text-gray-800 disabled:opacity-30 rounded transition-colors"><ArrowUp className="w-4 h-4"/></button>
                        <div className="w-6 h-6 flex items-center justify-center font-black text-green-700 bg-green-100 rounded text-xs">{index + 1}</div>
                        <button onClick={() => moveOrder(index, 1)} disabled={index === routeOrders.length - 1} className="p-1 text-stone-400 hover:bg-white hover:text-gray-800 disabled:opacity-30 rounded transition-colors"><ArrowDown className="w-4 h-4"/></button>
                      </div>

                      {/* Info del Pedido (Centro) */}
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

function AdminKPIs({ orders, bcvRate }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toLocaleDateString();

  const validOrders = orders.filter((o) => o.status !== 'Cancelado');
  
  const monthOrders = validOrders.filter((o) => {
    if(!o.date) return false;
    const d = new Date(o.date);
    if(isNaN(d.getTime())) return false;
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const todayOrders = validOrders.filter((o) => {
    if(!o.date) return false;
    const d = new Date(o.date);
    if(isNaN(d.getTime())) return false;
    return d.toLocaleDateString() === todayStr;
  });

  const monthSalesUSD = monthOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  const todaySalesUSD = todayOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  const totalHistóricoUSD = validOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  
  const pendientes = orders.filter((o) => o.status === 'Pendiente').length;
  const enPrep = orders.filter((o) => o.status === 'En Preparación').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Métricas del Negocio</h2>
        <p className="text-stone-500">Analiza el rendimiento en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-stone-400 text-sm font-bold flex items-center gap-2 mb-1"><Calendar className="w-4 h-4"/> Ventas Este Mes</p>
            <p className="text-4xl font-black">${monthSalesUSD.toFixed(2)}</p>
            <p className="text-sm text-stone-400 mt-1">Bs. {(monthSalesUSD * bcvRate).toFixed(2)}</p>
            <div className="mt-4 pt-4 border-t border-stone-700/50 flex justify-between items-center text-sm">
              <span className="text-stone-300">{monthOrders.length} pedidos concretados</span>
            </div>
          </div>
          <Activity className="absolute -right-6 -bottom-6 w-32 h-32 text-stone-700 opacity-20" />
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <p className="text-stone-500 text-sm font-bold flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-yellow-500"/> Ventas Hoy</p>
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
          <h4 className="font-bold text-gray-800 text-sm">Ventas Históricas Totales</h4>
          <p className="text-xs text-stone-500">Desde el inicio de los registros</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-gray-900">${totalHistóricoUSD.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

// --- MÓDULO REDISEÑADO Y BLINDADO: MIS CLIENTES ---
function AdminCustomers({ orders }) {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Proteger la inicialización usando manejo de errores robusto
  let filteredCustomers = [];
  try {
    const clientMap = new Map();
    
    // Iterar sobre los pedidos asegurándose de que 'orders' sea un arreglo
    (orders || []).forEach((order) => {
      // Ignorar si el pedido fue cancelado o si el objeto está corrupto
      if (!order || order.status === 'Cancelado') return;

      // Usar String() evita que caiga si viene un objeto o valor inesperado
      const name = String(order.senderName || order.customerName || 'Cliente Anónimo').trim();
      const phone = String(order.senderPhone || order.phone || 'Sin Teléfono').trim();
      
      const key = phone !== 'Sin Teléfono' ? phone : name.toLowerCase();

      if (!clientMap.has(key)) {
        clientMap.set(key, { 
          name: name, 
          phone: phone, 
          totalOrders: 0, 
          totalSpent: 0, 
          lastOrder: order.date || null
        });
      }
      
      const client = clientMap.get(key);
      if (client) {
        client.totalOrders += 1;
        client.totalSpent += (Number(order.totalUSD) || 0);
        
        // Calcular de forma segura cuál es el último pedido
        if (order.date && client.lastOrder) {
          const newDate = new Date(order.date);
          const oldDate = new Date(client.lastOrder);
          
          // Solo comparar si ambas fechas son válidas (evita colapso de React)
          if (!isNaN(newDate.getTime()) && !isNaN(oldDate.getTime())) {
            if (newDate > oldDate) {
              client.lastOrder = order.date;
              client.name = name; 
            }
          }
        } else if (order.date && !client.lastOrder) {
          client.lastOrder = order.date;
        }
      }
    });

    // 2. Convertir el mapa a un array y ordenar (Asegurando que no se rompa si totalSpent es NaN)
    const allCustomers = Array.from(clientMap.values()).sort((a, b) => {
      const spentA = Number(a.totalSpent) || 0;
      const spentB = Number(b.totalSpent) || 0;
      return spentB - spentA;
    });

    // 3. Aplicar el filtro de búsqueda de forma segura
    filteredCustomers = allCustomers.filter(c => {
      const safeName = String(c.name || '').toLowerCase();
      const safePhone = String(c.phone || '').toLowerCase();
      const term = String(searchTerm || '').toLowerCase();
      return safeName.includes(term) || safePhone.includes(term);
    });

  } catch (error) {
    console.error("Error al renderizar el directorio de clientes:", error);
    // Si algo falla, dejamos la lista vacía para no romper la pantalla
    filteredCustomers = [];
  }

  // Helper seguro para renderizar las fechas
  const renderSafeDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600"/> Directorio de Clientes</h2>
          <p className="text-stone-500 text-sm mt-1">Generado automáticamente según el historial de compras</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text" 
            placeholder="Buscar cliente o tlf..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-blue-500 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold text-center">Pedidos</th>
                <th className="p-4 font-bold">Total Invertido</th>
                <th className="p-4 font-bold hidden sm:table-cell">Última Compra</th>
                <th className="p-4 font-bold text-right">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers.map((client, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-gray-900">{client.name}</p>
                    <p className="text-xs text-stone-500 font-medium">{client.phone}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-stone-100 text-stone-700 font-bold px-3 py-1 rounded-full text-xs">
                      {Number(client.totalOrders) || 0}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-black text-green-600">${(Number(client.totalSpent) || 0).toFixed(2)}</p>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-sm text-stone-500">
                    {renderSafeDate(client.lastOrder)}
                  </td>
                  <td className="p-4 text-right">
                    {client.phone && client.phone !== 'Sin Teléfono' && (
                      <a 
                        href={`https://wa.me/${String(client.phone).replace(/\D/g,'')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#25D366]/10 text-[#1ebd5a] hover:bg-[#25D366] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Escribir
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-stone-500">No se encontraron clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
              
              // Validación segura de fecha
              let dateStr = 'N/A';
              if (order.date) {
                 try {
                     const d = new Date(order.date);
                     if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString();
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
                  <div className="text-[10px] text-stone-500 font-bold bg-stone-100 inline-block px-2 py-0.5 rounded mt-1">Bs. {(orderTotal * bcvRate).toFixed(2)}</div>
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

function AdminProducts({ products, categories }) {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentProduct, setCurrentProduct] = useState({ id: '', name: '', price: '', image: '', description: '', categoryId: '', badge: '', isExtra: false, emoji: '' });
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
      emoji: currentProduct.emoji || ''
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
          <p className="text-stone-500">Gestiona tu oferta de arreglos</p>
        </div>
        <button onClick={() => { setCurrentProduct({ id: '', name: '', price: '', image: '', description: '', categoryId: categories[0]?.id || '', badge: '', isExtra: false, emoji: '' }); setIsEditing(true); }}
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nombre</label>
              <input required type="text" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Precio (USD)</label>
              <input required type="number" step="0.01" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 focus:bg-white focus:border-red-500 font-black" />
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
              <th className="p-4 font-bold">Elemento</th>
              <th className="p-4 font-bold text-center">Tipo</th>
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
                  </div>
                </td>
                <td className="p-4 text-center">
                   {product.isExtra ? <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Extra / Upsell</span> : <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">Catálogo</span>}
                </td>
                <td className="p-4 text-right font-black text-gray-900">${Number(product.price).toFixed(2)}</td>
                <td className="p-4 flex justify-center gap-2">
                  <button onClick={() => {setCurrentProduct(product); setIsEditing(true); window.scrollTo({top:0, behavior:'smooth'});}} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-xl transition-colors"><Edit className="w-4 h-4" /></button>
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
function ClientStorefront({ products, categories, cart, setCart, user, bcvRate, searchQuery }) {
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showToast, setShowToast] = useState(false);
  
  const [previewProduct, setPreviewProduct] = useState(null);
  
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
    const existing = cart.find((item) => item.id === product.id);
    if (existing) setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    else setCart([...cart, { ...product, quantity: 1 }]);
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
    setPreviewProduct(null);
  };

  const handleQuickBuy = (product) => {
    addToCart(product);
    setTimeout(() => {
      setCheckoutStep(true);
      window.scrollTo(0, 0);
    }, 100);
  }

  const updateQuantity = (id, delta) => setCart(cart.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  
  const totalUSD = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
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
      totalUSD: totalUSD,
      status: clientPayments.length > 0 ? (totalPaidUSD >= totalUSD ? 'Pagado' : 'Abonado') : 'Pendiente',
      payments: clientPayments.map(p => ({ ...p, date: new Date().toISOString() })),
      date: new Date().toISOString()
    });

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
    
    text += `\n*💰 TOTAL:* $${totalUSD.toFixed(2)} (Bs. ${(totalUSD * bcvRate).toFixed(2)})\n`;
    
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

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    setCart([]); setClientPayments([]); setCheckoutStep(false);
  };

  const mainProducts = products.filter((p) => !p.isExtra);
  const extraProducts = products.filter((p) => p.isExtra);

  const filteredProducts = mainProducts.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch = String(p.name).toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchPrice = true;
    if (priceFilter === 'under20') matchPrice = Number(p.price) < 20;
    if (priceFilter === '20to40') matchPrice = Number(p.price) >= 20 && Number(p.price) <= 40;
    if (priceFilter === 'premium') matchPrice = Number(p.price) > 40;

    return matchCategory && matchSearch && matchPrice;
  });

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
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl p-8 sm:p-10 text-white mb-6 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-5xl font-black mb-3 font-serif drop-shadow-md">Regala dulzura y amor</h1>
            <p className="text-red-50 text-base sm:text-lg max-w-lg leading-relaxed font-medium">Descubre nuestros hermosos arreglos frutales y fresas con chocolate. 🍓🍫</p>
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-stone-100 overflow-hidden flex flex-col group transition-all duration-300 relative">
              {product.badge && (
                <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-yellow-100">
                  <span className="text-xs font-black text-gray-800">{product.badge}</span>
                </div>
              )}
              
              <div className="h-56 bg-stone-100 overflow-hidden relative cursor-pointer" onClick={() => setPreviewProduct(product)}>
                <img src={product.image} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" alt={product.name} />
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
                    <button onClick={() => handleQuickBuy(product)} title="Comprar Ahora" className="bg-gray-100 text-gray-600 hover:bg-stone-800 hover:text-white p-2.5 rounded-xl transition-colors shrink-0"><Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></button>
                    <button onClick={() => addToCart(product)} title="Añadir al carrito" className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-xl transition-colors shrink-0"><Plus className="w-4 h-4 sm:w-5 sm:h-5 font-bold" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                    <p className="text-red-600 font-black text-sm mt-0.5">${Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center bg-stone-100 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-md transition-all">-</button>
                    <span className="w-6 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-md transition-all">+</button>
                  </div>
                </div>
              ))
            )}

            {cart.length > 0 && extraProducts.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Star className="w-3 h-3"/> Agrega un Extra</p>
                <div className="grid grid-cols-2 gap-2">
                  {extraProducts.map((extra) => (
                    <button key={extra.id} onClick={() => addToCart(extra)} className="bg-white border border-stone-200 hover:border-pink-300 p-2 rounded-xl flex items-center gap-2 text-left transition-all hover:shadow-sm group">
                      <div className="bg-stone-50 w-8 h-8 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0">{extra.emoji || '✨'}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-800 leading-tight truncate">{extra.name}</p>
                        <p className="text-[10px] text-red-500 font-bold">+${Number(extra.price).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-stone-100">
              <div className="flex justify-between items-end mb-4">
                <span className="text-stone-500 font-medium">Total</span>
                <div className="text-right">
                  <div className="text-2xl font-black text-gray-900">${totalUSD.toFixed(2)}</div>
                  <div className="text-xs font-bold text-stone-400">Bs. {(totalUSD * bcvRate).toFixed(2)}</div>
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
              <div className="mb-2 text-xs font-bold text-red-500 uppercase tracking-widest">{categories.find((c)=>c.id === previewProduct.categoryId)?.name || 'Arreglo Especial'}</div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{previewProduct.name}</h2>
              <p className="text-stone-500 text-base mb-8 leading-relaxed whitespace-pre-wrap">{previewProduct.description}</p>
              
              <div className="mb-8 p-5 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="text-sm text-stone-500 font-medium mb-1">Precio</div>
                <div className="text-4xl font-black text-red-600">${Number(previewProduct.price).toFixed(2)}</div>
                <div className="text-sm font-bold text-stone-400 mt-1">Equivalente: Bs. {(Number(previewProduct.price) * bcvRate).toFixed(2)}</div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => addToCart(previewProduct)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-xl shadow-red-200 transition-transform hover:-translate-y-1">
                  <ShoppingCart className="w-5 h-5" /> Agregar al Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <button form="checkout-form" type="submit" className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-xl transition-all hover:-translate-y-1">
                <Send className="w-5 h-5" /> Confirmar y Enviar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}