import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { 
  ShoppingCart, User, Lock, Mail, Phone, MapPin, Plus, Trash2, Edit, LogOut, Instagram, Facebook,
  CheckCircle, X, Package, TrendingUp, DollarSign, List, Tag, ShoppingBag, CreditCard, Activity, Calendar, 
  Search, MessageCircle, Heart, Zap, Star, Gift, Truck, MousePointer2, Eye, Printer, Send, Users, ArrowUpRight, Clock,
  Map as MapIcon, ArrowUp, ArrowDown, Share2, AlertTriangle, Save, ShieldAlert,
  Download, Power, LayoutDashboard, GripVertical, Menu, SearchCode, ArrowDownUp,
  Receipt, Ticket, Percent, WalletCards, UploadCloud, ImagePlus, PieChart, Route, Store, BarChart3, Filter, StickyNote
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const VENEZUELAN_BANKS = [
  "Banesco", "Banco Mercantil", "Banco Provincial", "Banco Nacional de Crédito (BNC)", 
  "Bancaribe", "Banco de Venezuela", "Banco Bicentenario", "Banco del Tesoro", 
  "Banplus", "Banco Plaza", "Banco Activo", "Bancamiga", "100% Banco", 
  "Mi Banco", "Banco Caroní", "Banco Exterior"
];

// 🛡️ ESCUDO ANTI-COLAPSOS (Error Boundary)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); console.error("Error atrapado:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-600 rounded-3xl border border-red-200 mt-6 text-center shadow-sm w-full animate-fade-in">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="font-bold text-2xl mb-2 text-red-800">Error en este módulo</h2>
          <p className="text-sm font-medium mb-4 text-red-700">Se detectó un dato corrupto que impide mostrar esta sección.</p>
          <div className="bg-white p-4 rounded-xl border border-red-100 text-xs font-mono text-left overflow-auto text-red-800 max-w-3xl mx-auto shadow-inner max-h-48">
            <p className="font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
            <pre className="whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
          <button onClick={() => this.setState({ hasError: false })} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-red-700 transition-colors">Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]); 
  const [expenses, setExpenses] = useState([]); 
  const [coupons, setCoupons] = useState([]); 
  
  const [bcvRate, setBcvRate] = useState(36.50);
  const [storeSettings, setStoreSettings] = useState({ isOpen: true });
  const [loyaltySettings, setLoyaltySettings] = useState({ enabled: false, pointsPerDollar: 1, minPointsToRedeem: 100, discountPerPoint: 0.01 });
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const [view, setView] = useState('app');

  useEffect(() => {
    const unsubBcv = onSnapshot(doc(db, 'settings', 'bcv'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().rate) setBcvRate(Number(docSnap.data().rate));
    }, (err) => console.error(err));

    const unsubStore = onSnapshot(doc(db, 'settings', 'store'), (docSnap) => {
      if (docSnap.exists()) setStoreSettings(docSnap.data());
      else setDoc(doc(db, 'settings', 'store'), { isOpen: true }).catch(e => console.error(e));
    }, (err) => console.error(err));

    const unsubLoyalty = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
      if (docSnap.exists()) setLoyaltySettings(docSnap.data());
    }, (err) => console.error(err));

    return () => { unsubBcv(); unsubStore(); unsubLoyalty(); };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) setCurrentUser({ uid: user.uid, email: user.email, ...userDoc.data() });
          else setCurrentUser({ uid: user.uid, email: user.email, role: 'client' });
        } catch(e) {
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
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.warn(err));
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.warn(err));
    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.warn(err)); 

    let unsubOrders = () => {};
    let unsubUsers = () => {};
    let unsubExpenses = () => {};
    
    if (currentUser?.role && currentUser.role !== 'client') {
      unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
        const fetchedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedOrders.sort((a, b) => {
          const dA = a.date ? new Date(a.date).getTime() : 0;
          const dB = b.date ? new Date(b.date).getTime() : 0;
          return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
        });
        setOrders(fetchedOrders);
      }, (err) => console.warn(err));

      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setSystemUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.warn(err));
      
      unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
        const fetchedExp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedExp.sort((a, b) => {
          const dA = a.date ? new Date(a.date).getTime() : 0;
          const dB = b.date ? new Date(b.date).getTime() : 0;
          return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
        });
        setExpenses(fetchedExp);
      }, (err) => console.warn(err));
    }

    return () => { unsubProducts(); unsubCategories(); unsubCoupons(); unsubOrders(); unsubUsers(); unsubExpenses(); };
  }, [currentUser]);

  const handleLogout = async () => { await signOut(auth); setCart([]); setIsCartOpen(false); };
  const handleSaveBcvRate = async (newRate) => { if (newRate && !isNaN(newRate)) await setDoc(doc(db, 'settings', 'bcv'), { rate: Number(newRate) }, { merge: true }).catch(e=>console.error(e)); };
  const handleToggleStore = async () => await setDoc(doc(db, 'settings', 'store'), { isOpen: !storeSettings.isOpen }, { merge: true }).catch(e=>console.error(e));

  if (loadingAuth) return <div className="min-h-screen bg-stone-50 flex items-center justify-center font-bold text-red-600">Cargando plataforma...</div>;
  if (view === 'login' || view === 'register') return <AuthScreen view={view} setView={setView} />;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans overflow-x-hidden">
      {!storeSettings.isOpen && (
        <div className="bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md z-50 sticky top-0">
          ⚠️ NUESTRA TIENDA ESTÁ CERRADA TEMPORALMENTE. No recibimos pedidos en este momento. ⚠️
        </div>
      )}
      
      <Navbar 
        user={currentUser} onLogout={handleLogout} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
        bcvRate={bcvRate} setBcvRate={setBcvRate} onSaveBcv={handleSaveBcvRate} 
        onLoginClick={() => setView('login')} onCartClick={() => setIsCartOpen(true)} onTrackClick={() => setIsTrackModalOpen(true)}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} isSearchExpanded={isSearchExpanded} setIsSearchExpanded={setIsSearchExpanded}
      />

      <main className="flex-grow container mx-auto px-4 py-8 relative">
        {currentUser && currentUser.role !== 'client' ? (
          <AdminDashboard 
            products={products} categories={categories} orders={orders} systemUsers={systemUsers} 
            expenses={expenses} coupons={coupons} loyaltySettings={loyaltySettings}
            bcvRate={bcvRate} currentUser={currentUser} storeSettings={storeSettings} handleToggleStore={handleToggleStore}
          />
        ) : (
          <ClientStorefront 
            products={products} categories={categories} coupons={coupons}
            cart={cart} setCart={setCart} user={currentUser} 
            bcvRate={bcvRate} searchQuery={searchQuery} storeIsOpen={storeSettings.isOpen}
            isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} loyaltySettings={loyaltySettings}
          />
        )}
      </main>

      <Footer />

      {isTrackModalOpen && <OrderTrackingModal onClose={() => setIsTrackModalOpen(false)} />}
    </div>
  );
}

function Navbar({ user, onLogout, cartCount, bcvRate, setBcvRate, onSaveBcv, onLoginClick, onCartClick, onTrackClick, searchQuery, setSearchQuery, isSearchExpanded, setIsSearchExpanded }) {
  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-[0px] z-40 print:hidden transition-all">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src="/logo.png" alt="Decomer Frutas" className="h-10 sm:h-14 w-auto drop-shadow-sm hover:scale-105 transition-transform" />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-4">
          <div className={`items-center gap-1 sm:gap-2 bg-green-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-green-200 shadow-inner transition-opacity ${user?.role === 'client' && isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            <span className="hidden sm:inline text-xs font-bold text-green-800">Tasa BCV:</span>
            <span className="sm:hidden text-[10px] font-bold text-green-800">BCV:</span>
            {user?.role === 'admin' ? (
              <input type="number" step="0.01" value={bcvRate} onChange={(e) => setBcvRate(Number(e.target.value))} onBlur={(e) => onSaveBcv(Number(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && onSaveBcv(Number(e.target.value))} className="w-12 sm:w-16 text-[10px] sm:text-xs px-1 border-b border-green-300 bg-transparent outline-none font-bold text-green-900 focus:border-green-500" />
            ) : (
              <span className="text-[10px] sm:text-xs font-bold text-green-900">Bs. {bcvRate}</span>
            )}
          </div>

          {user && user.role !== 'client' ? (
            <>
              <div className="text-sm text-gray-600 hidden md:block">Rol: <span className="font-bold text-gray-800 uppercase">{user.role}</span></div>
              <button onClick={onLogout} className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors p-2 bg-stone-100 rounded-xl"><LogOut className="w-5 h-5" /><span className="hidden sm:block text-sm font-medium">Salir</span></button>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-0">
              <button onClick={onTrackClick} title="Rastrear Mi Pedido" className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-blue-600 bg-stone-100 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"><SearchCode className="w-4 h-4"/> Rastrear</button>
              <button onClick={onTrackClick} title="Rastrear Mi Pedido" className="sm:hidden p-2 text-stone-600 hover:text-blue-600 transition-colors"><SearchCode className="w-5 h-5"/></button>

              <div className={`relative flex items-center transition-all duration-300 ${isSearchExpanded ? 'w-36 sm:w-64' : 'w-8 sm:w-10'}`}>
                {isSearchExpanded ? (
                  <div className="w-full relative animate-fade-in">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input autoFocus type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => { if(!searchQuery) setIsSearchExpanded(false); }} className="w-full pl-9 pr-8 sm:pl-10 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-red-400 rounded-full outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all"/>
                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <button onClick={() => setIsSearchExpanded(true)} className="w-full h-full flex items-center justify-center text-stone-600 hover:text-red-600 transition-colors p-1 sm:p-2"><Search className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                )}
              </div>

              <div className="relative text-stone-600 hover:text-red-600 transition-colors cursor-pointer group p-1 sm:p-2" onClick={onCartClick}>
                <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-bounce shadow-md">{cartCount}</span>}
              </div>
              
              <button onClick={onLoginClick} title="Ingreso Administrativo" className="flex items-center gap-2 text-stone-300 hover:text-stone-800 transition-colors ml-1 sm:ml-2"><User className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function OrderTrackingModal({ onClose }) {
  const [queryInput, setQueryInput] = useState('');
  const [foundOrder, setFoundOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    setLoading(true); setErrorMsg(''); setFoundOrder(null);
    try {
      const qId = query(collection(db, 'orders'), where('displayId', '==', queryInput.trim().toUpperCase()));
      let snapshot = await getDocs(qId);
      if (snapshot.empty) {
        const qPhone = query(collection(db, 'orders'), where('senderPhone', '==', queryInput.trim()));
        snapshot = await getDocs(qPhone);
      }
      if (snapshot.empty) {
        const qPhone2 = query(collection(db, 'orders'), where('phone', '==', queryInput.trim()));
        snapshot = await getDocs(qPhone2);
      }
      if (!snapshot.empty) {
        const orderData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})).sort((a,b)=> {
          const dA = a.date ? new Date(a.date).getTime() : 0;
          const dB = b.date ? new Date(b.date).getTime() : 0;
          return (isNaN(dB)?0:dB) - (isNaN(dA)?0:dA);
        })[0];
        setFoundOrder(orderData);
      } else {
        setErrorMsg('No encontramos ningún pedido con este código o teléfono. Verifica e intenta de nuevo.');
      }
    } catch (err) { setErrorMsg('Error al buscar el pedido. Intenta más tarde.'); }
    setLoading(false);
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'Pendiente': return { text: 'Recibido / Pendiente de Pago', icon: <Clock className="w-8 h-8 text-orange-500"/>, color: 'text-orange-600', bg: 'bg-orange-50', bar: 'w-1/4 bg-orange-400' };
      case 'Abonado': return { text: 'Abono Registrado', icon: <DollarSign className="w-8 h-8 text-blue-500"/>, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'w-2/4 bg-blue-400' };
      case 'Pagado': return { text: 'Pago Confirmado', icon: <CheckCircle className="w-8 h-8 text-blue-500"/>, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'w-2/4 bg-blue-400' };
      case 'En Preparación': return { text: 'Armando tu Sorpresa', icon: <Gift className="w-8 h-8 text-purple-500 animate-pulse"/>, color: 'text-purple-600', bg: 'bg-purple-50', bar: 'w-3/4 bg-purple-500' };
      case 'Completado': return { text: 'Entregado / Retirado', icon: <Package className="w-8 h-8 text-green-500"/>, color: 'text-green-600', bg: 'bg-green-50', bar: 'w-full bg-green-500' };
      case 'Cancelado': return { text: 'Pedido Cancelado', icon: <X className="w-8 h-8 text-red-500"/>, color: 'text-red-600', bg: 'bg-red-50', bar: 'w-full bg-red-500' };
      default: return { text: status, icon: <Activity className="w-8 h-8 text-gray-500"/>, color: 'text-gray-600', bg: 'bg-gray-50', bar: 'w-1/4 bg-gray-400' };
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 bg-stone-100 hover:bg-stone-200 p-2 rounded-full text-stone-600 transition-colors z-10"><X className="w-5 h-5"/></button>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2"><SearchCode className="w-6 h-6 text-blue-600"/> Rastrear Pedido</h2>
          <p className="text-sm text-stone-500 mb-6">Ingresa tu número de pedido (Ej: PED-1234) o el número de teléfono con el que compraste.</p>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input type="text" placeholder="Ej: PED-1234 o 0414..." value={queryInput} onChange={e => setQueryInput(e.target.value)} className="flex-1 px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium uppercase" />
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md">{loading ? '...' : 'Buscar'}</button>
          </form>
          {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 font-medium">{errorMsg}</div>}
          {foundOrder && (
            <div className="mt-6 border-t border-stone-100 pt-6 animate-scale-in">
              <div className="text-center mb-6">
                <span className="inline-block bg-stone-100 text-stone-800 font-black px-4 py-1.5 rounded-full text-sm mb-4 border border-stone-200 shadow-sm">{foundOrder.displayId}</span>
                <div className={`p-6 rounded-2xl ${getStatusInfo(foundOrder.status).bg} border flex flex-col items-center justify-center transition-all`}>
                  {getStatusInfo(foundOrder.status).icon}
                  <h3 className={`mt-3 font-black text-xl ${getStatusInfo(foundOrder.status).color}`}>{getStatusInfo(foundOrder.status).text}</h3>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full mt-4 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${getStatusInfo(foundOrder.status).bar}`}></div></div>
              </div>
              <div className="bg-stone-50 p-4 rounded-xl space-y-2 text-sm border border-stone-100">
                <p className="flex justify-between"><span className="text-stone-500 font-bold">Método:</span> <span className="font-bold text-gray-800">{foundOrder.deliveryMethod === 'Pickup' ? '🏪 Retiro en Tienda' : '🛵 Delivery'}</span></p>
                <p className="flex justify-between"><span className="text-stone-500 font-bold">Fecha:</span> <span className="font-medium text-gray-800">{foundOrder.date && !isNaN(new Date(foundOrder.date).getTime()) ? new Date(foundOrder.date).toLocaleDateString() : 'N/A'}</span></p>
                <p className="flex justify-between"><span className="text-stone-500 font-bold">Para el:</span> <span className="font-medium text-gray-800">{foundOrder.deliveryDate || 'N/A'}</span></p>
                <p className="flex justify-between pt-2 border-t border-stone-200 mt-2"><span className="text-stone-500 font-bold">Total Pagado:</span> <span className="font-black text-gray-900">${(Number(foundOrder.totalUSD)||0).toFixed(2)}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ view, setView }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', address: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setErrorMsg(''); setIsLoading(true);
    try {
      if (view === 'login') { await signInWithEmailAndPassword(auth, formData.email, formData.password); } 
      else {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        let newRole = 'client'; const emailLower = formData.email.toLowerCase();
        if (emailLower.includes('admin')) newRole = 'admin'; else if (emailLower.includes('motorizado')) newRole = 'motorizado'; else if (emailLower.includes('preparador')) newRole = 'preparador';
        await setDoc(doc(db, 'users', userCred.user.uid), { name: formData.name, phone: formData.phone, address: formData.address, email: formData.email, role: newRole });
      }
    } catch (error) {
      if(error.code === 'auth/invalid-credential') setErrorMsg("Correo o contraseña incorrectos."); else if(error.code === 'auth/email-already-in-use') setErrorMsg("Este correo ya está registrado."); else setErrorMsg(error.message);
    }
    setIsLoading(false);
  };
  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="bg-white p-6 text-center border-b border-stone-100 flex flex-col items-center">
          <img src="/logo.png" alt="Decomer Frutas" className="h-32 w-auto object-contain" />
          <p className="text-stone-500 font-medium mt-2">Acceso a la Plataforma</p>
        </div>
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">{view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
          {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 font-medium">{errorMsg}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'register' && <div className="relative"><User className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input required type="text" name="name" placeholder="Nombre completo" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>}
            <div className="relative"><Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input required type="email" name="email" placeholder="Correo electrónico" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>
            <div className="relative"><Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input required type="password" name="password" placeholder="Contraseña" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>
            {view === 'register' && (
              <>
                <div className="relative"><Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input required type="tel" name="phone" placeholder="Teléfono" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>
                <div className="relative"><MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" /><input required type="text" name="address" placeholder="Dirección" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>
              </>
            )}
            <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg mt-6">{isLoading ? 'Cargando...' : (view === 'login' ? 'Ingresar al Panel' : 'Registrarme')}</button>
          </form>
          <button onClick={() => setView('app')} className="mt-6 flex items-center justify-center gap-2 text-stone-400 hover:text-stone-600 font-medium text-sm w-full transition-colors"><X className="w-4 h-4" /> Volver al Catálogo Público</button>
        </div>
      </div>
    </div>
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
          <a href="https://www.instagram.com/decomerfrutas/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-400 hover:text-pink-300 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg"><Instagram className="w-5 h-5" /><span className="font-medium text-sm">Instagram</span></a>
          <a href="https://www.facebook.com/DecomerFrutasMCBO" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg"><Facebook className="w-5 h-5" /><span className="font-medium text-sm">Facebook</span></a>
        </div>
      </div>
    </footer>
  );
}

// --- ADMIN COMPONENTS ---
function AdminDashboard({ products, categories, orders, systemUsers, expenses, coupons, loyaltySettings, bcvRate, currentUser, storeSettings, handleToggleStore }) {
  const getInitialTab = () => {
    if (currentUser?.role === 'motorizado') return 'delivery';
    if (currentUser?.role === 'preparador') return 'kanban';
    return 'orders';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const isAdmin = currentUser?.role === 'admin';
  const isPreparador = currentUser?.role === 'preparador' || isAdmin;
  const isMotorizado = currentUser?.role === 'motorizado' || isAdmin;

  const handleTabChange = (tab) => { 
    setActiveTab(tab); 
    if(window.innerWidth <= 768) setIsSidebarOpen(false); 
  };

  return (
    <div className="animate-fade-in flex flex-col relative min-h-[80vh]">
      {/* 🔴 BARRA SUPERIOR UNIVERSAL (HAMBURGUESA A LA IZQUIERDA) */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-200 w-full mb-6 print:hidden">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all active:scale-95 text-stone-700">
          <Menu className="w-6 h-6"/>
        </button>
        <span className="font-bold text-gray-800 flex items-center gap-2 text-lg">
          <Star className="w-6 h-6 text-red-500"/> Panel Administrativo
        </span>
      </div>

      <div className="flex flex-col md:flex-row relative flex-grow overflow-hidden">
        
        {/* FONDO OSCURO EN MÓVILES CUANDO ESTÁ ABIERTO */}
        {isSidebarOpen && <div className="fixed inset-0 bg-stone-900/60 z-[60] md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* 🔴 MENÚ LATERAL (SIDEBAR) CON ANIMACIÓN DE DESLIZAMIENTO SUAVE */}
        <div className={`
          fixed inset-y-0 left-0 z-[70] bg-white shadow-2xl transition-transform duration-300 ease-in-out transform
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:shadow-none md:bg-transparent md:transition-all md:duration-300
          ${isSidebarOpen ? 'md:w-72 md:opacity-100 md:mr-6' : 'md:w-0 md:opacity-0 md:mr-0 md:overflow-hidden'}
          print:hidden shrink-0
        `}>
          <div className="w-72 bg-white h-full md:rounded-3xl md:border border-stone-200 p-5 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-6 px-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><Star className="w-5 h-5" /></div>
                <div><h3 className="font-bold text-gray-800 leading-tight">Menú Principal</h3><p className="text-[10px] text-stone-500 uppercase tracking-widest">{currentUser?.role}</p></div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 bg-stone-100 rounded-full text-stone-500 hover:text-red-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <nav className="space-y-1.5 flex-grow">
              {isAdmin && <button onClick={() => handleTabChange('kpis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'kpis' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><BarChart3 className="w-5 h-5" /> Dashboard & Reportes</button>}
              {isAdmin && <button onClick={() => handleTabChange('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'orders' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><ShoppingBag className="w-5 h-5" /> Tabla de Pedidos {orders.filter((o)=>o.status==='Pendiente').length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{orders.filter((o)=>o.status==='Pendiente').length}</span>}</button>}
              {isPreparador && <button onClick={() => handleTabChange('kanban')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'kanban' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><LayoutDashboard className="w-5 h-5" /> Producción (Kanban)</button>}
              {isMotorizado && <button onClick={() => handleTabChange('delivery')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'delivery' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><MapIcon className="w-5 h-5" /> Rutas de Entrega</button>}
              
              {isAdmin && (
                <>
                  <button onClick={() => handleTabChange('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'customers' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Users className="w-5 h-5" /> Mis Clientes</button>
                  
                  <div className="pt-4 mt-4 border-t border-stone-100"></div>
                  
                  <button onClick={() => handleTabChange('expenses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'expenses' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-stone-600 hover:bg-stone-100'}`}><Receipt className="w-5 h-5" /> Gastos y Egresos</button>
                  <button onClick={() => handleTabChange('coupons')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'coupons' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-stone-600 hover:bg-stone-100'}`}><Ticket className="w-5 h-5" /> Promos y Cupones</button>
                  <button onClick={() => handleTabChange('loyalty')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'loyalty' ? 'bg-pink-50 text-pink-700 shadow-sm border border-pink-100' : 'text-stone-600 hover:bg-stone-100'}`}><Heart className="w-5 h-5" /> Puntos Fidelización</button>

                  <div className="pt-4 mt-4 border-t border-stone-100"></div>
                  
                  <button onClick={() => handleTabChange('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'products' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><Tag className="w-5 h-5" /> Catálogo / Extras</button>
                  <button onClick={() => handleTabChange('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-sm ${activeTab === 'categories' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}><List className="w-5 h-5" /> Categorías</button>
                  
                  <div className="pt-4 mt-4 border-t border-stone-100"></div>
                  <button onClick={handleToggleStore} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-bold text-sm border ${storeSettings.isOpen ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200 shadow-inner'}`}>
                    <span className="flex items-center gap-2"><Power className="w-4 h-4"/> Tienda: {storeSettings.isOpen ? 'ABIERTA' : 'CERRADA'}</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* 🔴 CONTENIDO PRINCIPAL */}
        <div className="flex-1 min-w-0 transition-all duration-300 w-full">
          <ErrorBoundary>
            {activeTab === 'kpis' && isAdmin && <AdminKPIs orders={orders} products={products} expenses={expenses} bcvRate={bcvRate} />}
            {activeTab === 'orders' && isAdmin && <AdminOrders orders={orders} bcvRate={bcvRate} products={products} />}
            {activeTab === 'kanban' && isPreparador && <AdminKanban orders={orders} />}
            {activeTab === 'delivery' && isMotorizado && <AdminDeliveryRoute orders={orders} bcvRate={bcvRate} />}
            {activeTab === 'customers' && isAdmin && <AdminCustomers orders={orders} systemUsers={systemUsers} />}
            {activeTab === 'expenses' && isAdmin && <AdminExpenses expenses={expenses} />}
            {activeTab === 'coupons' && isAdmin && <AdminCoupons coupons={coupons} />}
            {activeTab === 'loyalty' && isAdmin && <AdminLoyalty settings={loyaltySettings} />}
            {activeTab === 'products' && isAdmin && <AdminProducts products={products} categories={categories} />}
            {activeTab === 'categories' && isAdmin && <AdminCategories categories={categories} />}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// --- ADMIN FIDELIZACIÓN (PUNTOS) ---
function AdminLoyalty({ settings }) {
  const [form, setForm] = useState(settings || { enabled: false, pointsPerDollar: 1, minPointsToRedeem: 100, discountPerPoint: 0.01 });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await setDoc(doc(db, 'settings', 'loyalty'), {
      enabled: form.enabled,
      pointsPerDollar: Number(form.pointsPerDollar),
      minPointsToRedeem: Number(form.minPointsToRedeem),
      discountPerPoint: Number(form.discountPerPoint)
    }).catch(err => alert("Error al guardar: " + err.message));
    setIsSaving(false);
    alert("Configuración de puntos guardada correctamente.");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Heart className="w-6 h-6 text-pink-500"/> Puntos de Fidelización</h2>
        <p className="text-stone-500 text-sm mt-1">Configura cuántos puntos ganan tus clientes por sus compras para fidelizarlos.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-stone-100">
          <input type="checkbox" id="loyaltyEnabled" checked={form.enabled} onChange={(e) => setForm({...form, enabled: e.target.checked})} className="w-5 h-5 accent-pink-600" />
          <label htmlFor="loyaltyEnabled" className="font-bold text-gray-800 text-lg cursor-pointer">Habilitar Sistema de Puntos</label>
        </div>

        <div className={`space-y-6 transition-opacity ${!form.enabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">¿Cuántos puntos se ganan por cada 1$ gastado?</label>
            <input type="number" min="0.1" step="0.1" value={form.pointsPerDollar} onChange={(e) => setForm({...form, pointsPerDollar: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none font-bold text-gray-800 bg-stone-50" />
            <p className="text-[10px] text-stone-400 mt-1">Ej: Si pones 10, por una compra de $5, el cliente ganará 50 puntos.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">¿Cuánto dinero ($) equivale cada 1 punto al canjear?</label>
            <input type="number" min="0.001" step="0.001" value={form.discountPerPoint} onChange={(e) => setForm({...form, discountPerPoint: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none font-bold text-gray-800 bg-stone-50" />
            <p className="text-[10px] text-stone-400 mt-1">Ej: Si pones 0.01, 100 puntos = $1.00 de descuento.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-1">Mínimo de puntos requeridos para poder usarlos</label>
            <input type="number" min="1" value={form.minPointsToRedeem} onChange={(e) => setForm({...form, minPointsToRedeem: e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none font-bold text-gray-800 bg-stone-50" />
            <p className="text-[10px] text-stone-400 mt-1">Ej: 100. El cliente no podrá descontar puntos hasta que acumule al menos 100.</p>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-8">
          {isSaving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}

// --- MÓDULO MIS CLIENTES ---
function AdminCustomers({ orders, systemUsers }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    const safeString = (val) => {
      try {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        return 'Dato Formateado'; 
      } catch (e) { return ''; }
    };

    const safeNumber = (val) => { const num = Number(val); return isNaN(num) ? 0 : num; };
    const clientMap = new Map();

    if (Array.isArray(systemUsers)) {
      systemUsers.forEach(u => {
        if (u && typeof u === 'object' && u.role === 'client') {
          const phone = safeString(u.phone) || 'Sin Teléfono';
          const name = safeString(u.name) || 'Usuario Web';
          const key = phone !== 'Sin Teléfono' ? phone : name.toLowerCase();
          clientMap.set(key, { name, phone, address: safeString(u.address), totalOrders: 0, totalSpent: 0, lastOrderTime: 0, isRegistered: true });
        }
      });
    }

    if (Array.isArray(orders)) {
      orders.forEach(o => {
        if (!o || typeof o !== 'object' || o.status === 'Cancelado') return;
        const phone = safeString(o.senderPhone || o.phone || o.recipientPhone) || 'Sin Teléfono';
        const name = safeString(o.senderName || o.customerName || o.name || o.recipientName) || 'Cliente Desconocido';
        const address = safeString(o.deliveryAddress || o.address);
        const spent = safeNumber(o.totalUSD);

        let orderTime = 0;
        if (o.date) {
          const d = new Date(o.date);
          if (!isNaN(d.getTime())) orderTime = d.getTime();
        }

        const key = phone !== 'Sin Teléfono' ? phone : name.toLowerCase();

        if (!clientMap.has(key)) {
          clientMap.set(key, { name, phone, address, totalOrders: 0, totalSpent: 0, lastOrderTime: 0, isRegistered: false });
        }

        const client = clientMap.get(key);
        if (client) {
          client.totalOrders += 1;
          client.totalSpent += spent;
          if (orderTime > client.lastOrderTime) {
            client.lastOrderTime = orderTime;
            if (!client.isRegistered && name !== 'Cliente Desconocido' && name !== 'Dato Formateado') {
              client.name = name;
            }
          }
        }
      });
    }

    const allCustomers = Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    const sTerm = safeString(searchTerm).toLowerCase();
    if (!sTerm) return allCustomers;

    return allCustomers.filter(c => {
      const cName = safeString(c.name).toLowerCase();
      const cPhone = safeString(c.phone).toLowerCase();
      return cName.includes(sTerm) || cPhone.includes(sTerm);
    });
  }, [orders, systemUsers, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-blue-600"/> Directorio de Clientes</h2>
          <p className="text-stone-500 text-sm mt-1">Sincronizado de forma segura con tu base de datos</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input type="text" placeholder="Buscar cliente o tlf..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl outline-none focus:border-blue-500 text-sm shadow-sm bg-white" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 font-bold">Cliente</th>
                <th className="p-4 font-bold text-center">Pedidos</th>
                <th className="p-4 font-bold">Inversión</th>
                <th className="p-4 font-bold hidden sm:table-cell">Última Compra</th>
                <th className="p-4 font-bold text-right">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers?.map((client, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-gray-900 flex items-center flex-wrap gap-2">{client.name} {client.isRegistered && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-200 uppercase">Web</span>}</p>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">{client.phone}</p>
                  </td>
                  <td className="p-4 text-center"><span className="bg-stone-100 text-stone-700 font-bold px-3 py-1 rounded-full text-xs">{client.totalOrders}</span></td>
                  <td className="p-4"><p className="font-black text-green-600">${client.totalSpent.toFixed(2)}</p></td>
                  <td className="p-4 hidden sm:table-cell text-sm text-stone-500">
                    {client.lastOrderTime > 0 && !isNaN(new Date(client.lastOrderTime).getTime()) ? new Date(client.lastOrderTime).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    {client.phone && client.phone !== 'Sin Teléfono' && (
                      <a href={`https://wa.me/${String(client.phone).replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366]/10 text-[#1ebd5a] hover:bg-[#25D366] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><MessageCircle className="w-4 h-4" /> Escribir</a>
                    )}
                  </td>
                </tr>
              ))}
              {(!filteredCustomers || filteredCustomers.length === 0) && <tr><td colSpan="5" className="p-8 text-center text-stone-500">No se encontraron clientes.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- ADMIN ORDERS (PEDIDOS Y PAGOS) ---
function AdminOrders({ orders, bcvRate, products }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, orderId: null });
  const [paymentForm, setPaymentForm] = useState({ method: 'Pago Móvil', inputAmount: '', inputCurrency: 'BS', customBcvRate: bcvRate, reference: '', bank: VENEZUELAN_BANKS[0], phone: '', accountName: '', notes: '' });
  const [viewPaymentsModal, setViewPaymentsModal] = useState({ isOpen: false, orderId: null });
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, order: null });
  const [labelModal, setLabelModal] = useState({ isOpen: false, order: null }); // 🔴 MODAL PARA ETIQUETA
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);
  
  const [manualOrder, setManualOrder] = useState({ deliveryMethod: 'Delivery', senderName: '', senderPhone: '', recipientName: '', recipientPhone: '', deliveryAddress: '', deliveryDate: '', deliveryTimeSlot: 'Mañana (8:00 AM - 12:00 PM)', dedication: '', items: [] });
  const [manualProduct, setManualProduct] = useState('');
  const [manualQty, setManualQty] = useState(1);

  const handleStatusChange = async (id, newStatus) => { await updateDoc(doc(db, 'orders', id), { status: newStatus }).catch(e=>console.error(e)); };

  const openPaymentModal = (order) => { setPaymentForm({ method: 'Pago Móvil', inputAmount: '', inputCurrency: 'BS', customBcvRate: bcvRate, reference: '', bank: VENEZUELAN_BANKS[0], phone: '', accountName: '', notes: '' }); setPaymentModal({ isOpen: true, orderId: order.id }); };
  const handleRegisterPayment = async (e) => {
    e.preventDefault(); const order = orders.find((o) => o.id === paymentModal.orderId); if (!order) return;
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
    if (totalPaid >= orderTotal) newStatus = 'Pagado'; else if (totalPaid > 0 && totalPaid < orderTotal && order.status === 'Pendiente') newStatus = 'Abonado';
    await updateDoc(doc(db, 'orders', order.id), { status: newStatus, payments: updatedPayments }).catch(e=>console.error(e));
    setPaymentModal({ isOpen: false, orderId: null });
  };
  
  const handleDeletePayment = async (orderId, paymentIndex) => {
    const order = orders.find(o => o.id === orderId); if (!order) return; if (!window.confirm("¿Seguro?")) return;
    const updatedPayments = [...(order.payments || [])]; updatedPayments.splice(paymentIndex, 1);
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0); const orderTotal = Number(order.totalUSD) || 0;
    let newStatus = order.status;
    if (updatedPayments.length === 0) newStatus = 'Pendiente'; else if (totalPaid >= orderTotal) newStatus = 'Pagado'; else newStatus = 'Abonado';
    await updateDoc(doc(db, 'orders', order.id), { payments: updatedPayments, status: newStatus }).catch(e=>console.error(e));
  };

  const openCreateModal = () => { setEditOrderId(null); setManualOrder({ deliveryMethod: 'Delivery', senderName: '', senderPhone: '', recipientName: '', recipientPhone: '', deliveryAddress: '', deliveryDate: '', deliveryTimeSlot: 'Mañana (8:00 AM - 12:00 PM)', dedication: '', items: [] }); setIsOrderModalOpen(true); };
  const openEditModal = (order) => { setEditOrderId(order.id); setManualOrder({ deliveryMethod: order.deliveryMethod || 'Delivery', senderName: order.senderName || order.customerName || '', senderPhone: order.senderPhone || order.phone || '', recipientName: order.recipientName || '', recipientPhone: order.recipientPhone || '', deliveryAddress: order.deliveryAddress || order.address || '', deliveryDate: order.deliveryDate || '', deliveryTimeSlot: order.deliveryTimeSlot || 'Mañana (8:00 AM - 12:00 PM)', dedication: order.dedication || '', items: order.items || [] }); setIsOrderModalOpen(true); };
  const closeOrderModal = () => { setIsOrderModalOpen(false); setEditOrderId(null); };
  
  const handleAddManualItem = () => {
    const productId = manualProduct || (products.length > 0 ? products[0].id : null); if (!productId) return; const product = products.find((p) => p.id === productId); if (!product) return;
    const existingIndex = manualOrder.items.findIndex(i => i.id === product.id); let newItems = [...manualOrder.items];
    if (existingIndex >= 0) newItems[existingIndex].quantity += Number(manualQty); else newItems.push({ ...product, quantity: Number(manualQty) });
    setManualOrder({ ...manualOrder, items: newItems }); setManualQty(1);
  };
  const handleRemoveManualItem = (index) => { const newItems = [...manualOrder.items]; newItems.splice(index, 1); setManualOrder({ ...manualOrder, items: newItems }); };
  
  const handleSaveOrder = async (e) => {
    e.preventDefault(); if (manualOrder.items.length === 0) return alert("Agrega al menos un producto.");
    const totalUSD = manualOrder.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const finalAddress = manualOrder.deliveryMethod === 'Pickup' ? 'Retiro en Tienda (Pickup)' : manualOrder.deliveryAddress;

    const orderData = { 
      deliveryMethod: manualOrder.deliveryMethod,
      senderName: manualOrder.senderName, senderPhone: manualOrder.senderPhone, recipientName: manualOrder.recipientName, recipientPhone: manualOrder.recipientPhone, deliveryAddress: finalAddress, deliveryDate: manualOrder.deliveryDate, deliveryTimeSlot: manualOrder.deliveryTimeSlot, dedication: manualOrder.dedication, items: manualOrder.items, totalUSD: totalUSD, customerName: manualOrder.senderName, phone: manualOrder.senderPhone, address: finalAddress 
    };

    if (editOrderId) {
      const existingOrder = orders.find(o => o.id === editOrderId); const totalPaid = (existingOrder.payments || []).reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0); let newStatus = existingOrder.status;
      if (totalPaid >= totalUSD && totalUSD > 0) newStatus = 'Pagado'; else if (totalPaid > 0 && totalPaid < totalUSD) newStatus = 'Abonado'; else if (totalPaid === 0 && newStatus === 'Pagado') newStatus = 'Pendiente';
      await updateDoc(doc(db, 'orders', editOrderId), { ...orderData, status: newStatus }).catch(e=>console.error(e));
    } else {
      await addDoc(collection(db, 'orders'), { ...orderData, displayId: `PED-M${Math.floor(Math.random() * 10000)}`, status: 'Pendiente', payments: [], date: new Date().toISOString() }).catch(e=>console.error(e));
    }
    closeOrderModal();
  };

  const filteredOrders = orders.filter((order) => { 
    const matchesSearch = String(order.displayId || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(order.customerName || order.senderName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(order.phone || order.senderPhone || '').includes(searchTerm); 
    const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter; 
    return matchesSearch && matchesStatus; 
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div><h2 className="text-2xl font-bold text-gray-800">Control de Pedidos</h2><p className="text-stone-500">Gestiona entregas y cobros</p></div>
        <button onClick={openCreateModal} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg text-sm"><Plus className="w-5 h-5" /> Nuevo Pedido</button>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
        <div className="flex bg-stone-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {['Todos', 'Pendiente', 'Pagado', 'En Preparación', 'Completado'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === status ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{status}</button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input type="text" placeholder="Buscar ID, Nombre, Tlf..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-red-500 text-sm transition-colors" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-x-auto print:hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead><tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200"><th className="p-4 font-bold">ID / Fecha</th><th className="p-4 font-bold">Cliente</th><th className="p-4 font-bold">Monto</th><th className="p-4 font-bold">Estado del Pago</th><th className="p-4 font-bold text-center">Acciones</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {filteredOrders.map((order) => {
              const totalPaid = (order.payments || []).reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0); const orderTotal = Number(order.totalUSD) || 0; const balance = orderTotal - totalPaid;
              return (
              <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-black text-gray-900">{order.displayId || 'PED-WEB'}</div>
                  <div className="text-xs text-stone-500 font-medium">{order.date && !isNaN(new Date(order.date).getTime()) ? new Date(order.date).toLocaleDateString() : 'N/A'}</div>
                  {order.deliveryMethod === 'Pickup' ? <span className="inline-block mt-1 text-[9px] bg-purple-100 text-purple-700 font-black px-2 py-0.5 rounded uppercase">🏪 Pickup</span> : <span className="inline-block mt-1 text-[9px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded uppercase">🛵 Delivery</span>}
                </td>
                <td className="p-4 text-sm text-gray-700"><div className="font-bold flex items-center gap-1"><User className="w-3 h-3 text-stone-400"/> {order.senderName || order.customerName || 'N/A'}</div><div className="text-stone-500 text-xs mt-0.5">📞 {order.senderPhone || order.phone || 'N/A'}</div></td>
                <td className="p-4"><div className="font-black text-gray-900">${orderTotal.toFixed(2)}</div><div className="text-[10px] text-stone-500 font-bold bg-stone-100 inline-block px-2 py-0.5 rounded mt-1">Bs. {(orderTotal * bcvRate).toFixed(2)}</div></td>
                <td className="p-4 text-sm">
                  {totalPaid > 0 ? ( <div className="mb-1"><span className="text-green-600 font-black">${totalPaid.toFixed(2)} Pagado</span>{balance > 0 && <span className="text-red-500 ml-2 text-xs font-bold bg-red-50 px-1 rounded block w-max mt-1">Deuda: ${balance.toFixed(2)}</span>}<button onClick={() => setViewPaymentsModal({ isOpen: true, orderId: order.id })} className="block text-[10px] font-bold text-blue-600 hover:underline mt-1">Ver/Borrar pagos</button></div> ) : ( <span className="text-orange-500 font-bold text-xs bg-orange-50 px-2 py-1 rounded">Por Cobrar</span> )}
                  {balance > 0 && order.status !== 'Cancelado' && <button onClick={() => openPaymentModal(order)} className="mt-2 block text-xs bg-stone-900 text-white hover:bg-black px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm">+ Añadir Pago</button>}
                </td>
                <td className="p-4 flex items-center justify-center gap-2">
                  <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)} className="text-xs font-black uppercase tracking-wider px-2 py-2 rounded-xl border-0 outline-none cursor-pointer shadow-sm bg-stone-100"><option value="Pendiente">Pendiente</option><option value="Abonado">Abonado</option><option value="Pagado">Pagado</option><option value="En Preparación">En Preparación</option><option value="Completado">Completado</option><option value="Cancelado">Cancelado</option></select>
                  <button onClick={() => openEditModal(order)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors shadow-sm" title="Editar"><Edit className="w-5 h-5" /></button>
                  <button onClick={() => setLabelModal({ isOpen: true, order })} className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl transition-colors shadow-sm" title="Imprimir Etiqueta para Caja"><StickyNote className="w-5 h-5" /></button>
                  <button onClick={() => setReceiptModal({ isOpen: true, order })} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors shadow-sm" title="Nota de Entrega / Recibo"><Printer className="w-5 h-5" /></button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Modales de pagos y edición de orden */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Añadir Pago</h3>
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="flex gap-2">
                <select value={paymentForm.inputCurrency} onChange={e=>setPaymentForm({...paymentForm, inputCurrency:e.target.value, inputAmount:''})} className="px-4 py-3 border rounded-xl font-bold outline-none bg-stone-50"><option value="BS">Bs.</option><option value="USD">USD</option></select>
                <input required type="number" step="0.01" placeholder={`Monto en ${paymentForm.inputCurrency}`} value={paymentForm.inputAmount} onChange={e=>setPaymentForm({...paymentForm, inputAmount:e.target.value})} className="flex-1 px-4 py-3 border rounded-xl outline-none" />
              </div>
              {paymentForm.inputCurrency === 'BS' && <div><label className="text-xs font-bold text-stone-500 mb-1 block">Tasa a usar (Por defecto BCV: {bcvRate})</label><input type="number" step="0.01" value={paymentForm.customBcvRate} onChange={e=>setPaymentForm({...paymentForm, customBcvRate:e.target.value})} className="w-full px-4 py-3 border rounded-xl outline-none" /></div>}
              <select value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm, method:e.target.value})} className="w-full px-4 py-3 border rounded-xl outline-none"><option value="Pago Móvil">Pago Móvil</option><option value="Transferencia Bs">Transferencia Bs</option><option value="Zelle">Zelle</option><option value="Zinli">Zinli</option><option value="Binance">Binance</option><option value="Efectivo Divisas">Efectivo Divisas</option></select>
              {['Pago Móvil', 'Transferencia Bs'].includes(paymentForm.method) && (<div className="flex gap-2"><select value={paymentForm.bank} onChange={e=>setPaymentForm({...paymentForm, bank:e.target.value})} className="flex-1 px-3 py-3 border rounded-xl text-sm">{VENEZUELAN_BANKS.map(b=><option key={b} value={b}>{b}</option>)}</select><input required type="text" placeholder="Teléfono" value={paymentForm.phone} onChange={e=>setPaymentForm({...paymentForm, phone:e.target.value})} className="flex-1 px-3 py-3 border rounded-xl text-sm" /></div>)}
              {['Zelle', 'Zinli', 'Binance'].includes(paymentForm.method) && <input required type="text" placeholder="Nombre Titular o Correo" value={paymentForm.accountName} onChange={e=>setPaymentForm({...paymentForm, accountName:e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />}
              {paymentForm.method !== 'Efectivo Divisas' && <input required type="text" placeholder="Referencia / Recibo" value={paymentForm.reference} onChange={e=>setPaymentForm({...paymentForm, reference:e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />}
              {paymentForm.method === 'Efectivo Divisas' && <input type="text" placeholder="Notas (Ej: Billete de 20)" value={paymentForm.notes} onChange={e=>setPaymentForm({...paymentForm, notes:e.target.value})} className="w-full px-4 py-3 border rounded-xl text-sm" />}
              <div className="flex gap-3 pt-4"><button type="button" onClick={()=>setPaymentModal({isOpen:false, orderId:null})} className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold text-stone-600 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-md">Registrar Pago</button></div>
            </form>
          </div>
        </div>
      )}

      {viewPaymentsModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">Historial de Pagos</h3><button onClick={() => setViewPaymentsModal({ isOpen: false, orderId: null })} className="text-stone-400 hover:text-stone-600"><X className="w-6 h-6"/></button></div>
            <div className="space-y-3">
              {orders.find(o => o.id === viewPaymentsModal.orderId)?.payments?.map((p, i) => (
                <div key={i} className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex justify-between items-center">
                  <div><p className="font-bold text-green-700">${Number(p.amountUSD).toFixed(2)} <span className="text-xs text-stone-500 font-medium ml-1">({p.method})</span></p><p className="text-[10px] text-stone-500 mt-1">{p.details} {p.reference ? ` | Ref: ${p.reference}` : ''}</p></div>
                  <button onClick={() => handleDeletePayment(viewPaymentsModal.orderId, i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              {(!orders.find(o => o.id === viewPaymentsModal.orderId)?.payments || orders.find(o => o.id === viewPaymentsModal.orderId)?.payments.length === 0) && <p className="text-center text-stone-500 text-sm py-4">No hay pagos registrados.</p>}
            </div>
          </div>
        </div>
      )}

      {/* 🔴 NOTA DE ENTREGA / RECIBO CLÁSICO */}
      {receiptModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0">
          <div className="bg-white p-8 w-full max-w-md shadow-2xl relative print:shadow-none print:w-full border border-stone-200 rounded-3xl print:rounded-none">
            <button onClick={() => setReceiptModal({ isOpen: false, order: null })} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 print:hidden"><X className="w-6 h-6"/></button>
            
            <div className="text-center mb-6 border-b border-stone-200 pb-6">
              <h2 className="text-3xl font-black font-serif text-gray-900">Decomer Frutas</h2>
              <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest font-bold">Nota de Entrega</p>
            </div>
            
            <div className="space-y-5 text-sm text-gray-800">
              <div className="flex justify-between items-end"><span className="font-bold text-stone-500">Orden No.</span> <span className="font-black text-lg">{receiptModal.order.displayId}</span></div>
              <div className="flex justify-between items-end"><span className="font-bold text-stone-500">Fecha de Emisión:</span> <span className="font-medium">{receiptModal.order.date && !isNaN(new Date(receiptModal.order.date).getTime()) ? new Date(receiptModal.order.date).toLocaleDateString() : ''}</span></div>
              <div className="flex justify-between items-end"><span className="font-bold text-stone-500">Cliente (Remitente):</span> <span className="font-bold">{receiptModal.order.senderName || receiptModal.order.customerName}</span></div>
              <div className="flex justify-between items-end"><span className="font-bold text-stone-500">Teléfono:</span> <span className="font-medium">{receiptModal.order.senderPhone || receiptModal.order.phone}</span></div>
              <div className="flex justify-between items-end"><span className="font-bold text-stone-500">Método de Entrega:</span> <span className="font-bold uppercase bg-stone-100 px-2 py-0.5 rounded">{receiptModal.order.deliveryMethod === 'Pickup' ? 'Retiro en Tienda' : 'Delivery'}</span></div>
              
              <div className="pt-4 border-t border-stone-200 border-dashed">
                <p className="font-bold text-stone-500 mb-3 uppercase tracking-wider text-xs">Detalle de Productos</p>
                {receiptModal.order.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-2 font-medium">
                    <span>{i.quantity}x {i.name}</span>
                    <span className="font-bold">${(Number(i.price)*i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-stone-200 border-dashed flex justify-between font-black text-xl">
                <span>TOTAL USD:</span> 
                <span>${Number(receiptModal.order.totalUSD).toFixed(2)}</span>
              </div>
            </div>
            
            <button onClick={() => window.print()} className="mt-8 w-full bg-stone-900 hover:bg-black text-white font-bold py-3.5 rounded-xl print:hidden flex justify-center gap-2 items-center transition-colors shadow-md"><Printer className="w-5 h-5"/> Imprimir Recibo</button>
          </div>
        </div>
      )}

      {/* 🔴 ETIQUETA PARA CAJA (NUEVO) */}
      {labelModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0">
          <div className="bg-white p-8 w-full max-w-lg shadow-2xl relative print:shadow-none print:w-full border-2 border-stone-800 border-dashed rounded-3xl print:border-solid print:rounded-none">
            <button onClick={() => setLabelModal({ isOpen: false, order: null })} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 print:hidden"><X className="w-6 h-6"/></button>
            
            <div className="text-center mb-6 border-b-2 border-stone-800 pb-6">
              <h2 className="text-4xl font-black font-serif text-gray-900 flex justify-center items-center gap-3"><Gift className="w-8 h-8"/> Decomer Frutas</h2>
              <p className="text-sm font-bold mt-2 uppercase tracking-widest">{labelModal.order.displayId}</p>
            </div>
            
            <div className="space-y-6 text-lg text-gray-900">
              <div><p className="text-sm font-bold text-stone-500 mb-1">DE (Remitente):</p><p className="font-black text-2xl uppercase leading-tight">{labelModal.order.senderName || labelModal.order.customerName || 'Anónimo'}</p></div>
              <div><p className="text-sm font-bold text-stone-500 mb-1">PARA (Destinatario):</p><p className="font-black text-2xl uppercase leading-tight">{labelModal.order.recipientName || 'Anónimo'}</p></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm font-bold text-stone-500 mb-1">FECHA:</p><p className="font-bold">{labelModal.order.deliveryDate || 'N/A'}</p></div>
                <div><p className="text-sm font-bold text-stone-500 mb-1">TURNO:</p><p className="font-bold">{labelModal.order.deliveryTimeSlot || 'N/A'}</p></div>
              </div>

              {labelModal.order.deliveryMethod === 'Delivery' && (
                <div><p className="text-sm font-bold text-stone-500 mb-1">DIRECCIÓN DE ENTREGA:</p><p className="font-bold leading-snug">{labelModal.order.deliveryAddress || 'Retiro en Tienda'}</p></div>
              )}

              {labelModal.order.dedication && (
                <div className="p-5 bg-stone-100 rounded-2xl border border-stone-200 mt-4">
                  <p className="text-sm font-bold text-stone-500 mb-2 flex items-center gap-2"><StickyNote className="w-4 h-4"/> DEDICATORIA:</p>
                  <p className="italic font-medium text-lg leading-relaxed">"{labelModal.order.dedication}"</p>
                </div>
              )}
            </div>
            
            <button onClick={() => window.print()} className="mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl print:hidden flex justify-center gap-2 items-center transition-colors shadow-md"><Printer className="w-5 h-5"/> Imprimir Etiqueta</button>
          </div>
        </div>
      )}

      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center"><h3 className="font-bold text-xl text-gray-800">{editOrderId ? 'Editar Pedido' : 'Nuevo Pedido Manual'}</h3><button onClick={closeOrderModal} className="bg-stone-200 hover:bg-stone-300 p-2 rounded-full"><X className="w-5 h-5"/></button></div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <label className="block text-xs font-bold mb-2 text-blue-800 uppercase">Método de Entrega</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setManualOrder({...manualOrder, deliveryMethod: 'Delivery'})} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border transition-all ${manualOrder.deliveryMethod === 'Delivery' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-stone-600 border-stone-200'}`}><Truck className="w-4 h-4"/> Delivery</button>
                  <button type="button" onClick={() => setManualOrder({...manualOrder, deliveryMethod: 'Pickup'})} className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border transition-all ${manualOrder.deliveryMethod === 'Pickup' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-stone-600 border-stone-200'}`}><Store className="w-4 h-4"/> Retiro (Pickup)</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold mb-1 text-stone-500 uppercase">Cliente (Emisor)</label><input required type="text" placeholder="Nombre" value={manualOrder.senderName} onChange={e=>setManualOrder({...manualOrder, senderName:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm mb-2"/><input type="text" placeholder="Teléfono" value={manualOrder.senderPhone} onChange={e=>setManualOrder({...manualOrder, senderPhone:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm"/></div>
                <div><label className="block text-xs font-bold mb-1 text-stone-500 uppercase">Destinatario</label><input type="text" placeholder="Nombre" value={manualOrder.recipientName} onChange={e=>setManualOrder({...manualOrder, recipientName:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm mb-2"/><input type="text" placeholder="Teléfono" value={manualOrder.recipientPhone} onChange={e=>setManualOrder({...manualOrder, recipientPhone:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm"/></div>
              </div>

              {manualOrder.deliveryMethod === 'Delivery' && (
                <div><label className="block text-xs font-bold mb-1 text-stone-500 uppercase">Dirección de Entrega</label><input type="text" value={manualOrder.deliveryAddress} onChange={e=>setManualOrder({...manualOrder, deliveryAddress:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm"/></div>
              )}
              
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold mb-1 text-stone-500 uppercase">Fecha de Entrega/Retiro</label><input type="date" value={manualOrder.deliveryDate} onChange={e=>setManualOrder({...manualOrder, deliveryDate:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm"/></div><div><label className="block text-xs font-bold mb-1 text-stone-500 uppercase">Turno</label><select value={manualOrder.deliveryTimeSlot} onChange={e=>setManualOrder({...manualOrder, deliveryTimeSlot:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm"><option value="Mañana (8:00 AM - 12:00 PM)">Mañana</option><option value="Tarde (1:00 PM - 5:00 PM)">Tarde</option></select></div></div>
              <div><label className="block text-xs font-bold mb-1 text-stone-500 uppercase">Dedicatoria</label><textarea value={manualOrder.dedication} onChange={e=>setManualOrder({...manualOrder, dedication:e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" rows="2"></textarea></div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <label className="block text-xs font-bold mb-3 text-stone-500 uppercase">Agregar Productos</label>
                <div className="flex gap-2 mb-4">
                  <select value={manualProduct} onChange={e=>setManualProduct(e.target.value)} className="flex-1 px-3 py-2 border rounded-xl text-sm">{products.map(p=><option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toFixed(2)}</option>)}</select>
                  <input type="number" min="1" value={manualQty} onChange={e=>setManualQty(e.target.value)} className="w-20 px-3 py-2 border rounded-xl text-sm text-center"/>
                  <button type="button" onClick={handleAddManualItem} className="bg-stone-800 text-white px-4 rounded-xl font-bold text-sm">Agregar</button>
                </div>
                {manualOrder.items.length > 0 && (
                  <div className="space-y-2">
                    {manualOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm text-sm"><span>{item.quantity}x {item.name} <span className="text-red-500 font-bold ml-2">${(item.price * item.quantity).toFixed(2)}</span></span><button onClick={()=>handleRemoveManualItem(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button></div>
                    ))}
                    <div className="text-right font-black text-lg pt-2 border-t mt-2">Total: ${manualOrder.items.reduce((s,i)=>s+(i.price*i.quantity),0).toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-stone-100 bg-white"><button onClick={handleSaveOrder} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">{editOrderId ? 'Guardar Cambios' : 'Crear Pedido'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ADMIN PRODUCTOS (CATÁLOGO Y EXTRAS CON MODAL) ---
function AdminProducts({ products, categories }) {
  const [form, setForm] = useState({ name: '', description: '', price: '', categoryId: '', image: '', stock: '', badge: '', isExtra: false, emoji: '' });
  const [isEditing, setIsEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=19641e99aad23c4e7f45f6540efa1f50`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) setForm({ ...form, image: data.data.url });
      else alert("Error al subir imagen");
    } catch (error) { alert("Error de red al subir imagen"); }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = { ...form, price: Number(form.price) };
    if (isEditing) await updateDoc(doc(db, 'products', isEditing), productData).catch(e=>console.error(e));
    else await addDoc(collection(db, 'products'), productData).catch(e=>console.error(e));
    closeModal();
  };

  const handleEdit = (product) => {
    setForm({ name: product.name, description: product.description, price: product.price, categoryId: product.categoryId || '', image: product.image || '', stock: product.stock || '', badge: product.badge || '', isExtra: product.isExtra || false, emoji: product.emoji || '' });
    setIsEditing(product.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setForm({ name: '', description: '', price: '', categoryId: '', image: '', stock: '', badge: '', isExtra: false, emoji: '' });
  };

  const handleDelete = async (id) => { if (window.confirm("¿Seguro de eliminar este producto?")) await deleteDoc(doc(db, 'products', id)).catch(e=>console.error(e)); };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Tag className="w-6 h-6 text-red-500"/> Catálogo de Productos
        </h2>
        <button onClick={() => { setIsEditing(null); setIsModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
          <Plus className="w-5 h-5" /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-stone-100 overflow-hidden flex flex-col relative transition-shadow">
            {p.badge && <span className="absolute top-2 right-2 bg-stone-900 text-white text-[10px] font-black px-2 py-1 rounded z-10">{p.badge}</span>}
            {p.isExtra ? <div className="h-32 bg-stone-50 flex items-center justify-center text-5xl border-b border-stone-100">{p.emoji || '✨'}</div> : <img src={p.image} className="h-32 w-full object-cover bg-stone-100" alt={p.name} />}
            <div className="p-4 flex-grow flex flex-col">
              <h4 className="font-bold text-gray-800 line-clamp-1">{p.name}</h4>
              <p className="font-black text-red-600">${Number(p.price).toFixed(2)}</p>
              <p className="text-xs text-stone-500 mt-1">{p.isExtra ? 'Extra Adicional' : categories.find(c=>c.id===p.categoryId)?.name || 'Sin Categoría'}</p>
              <div className="flex gap-2 mt-auto pt-4">
                <button onClick={() => handleEdit(p)} className="flex-1 bg-stone-100 hover:bg-stone-200 py-1.5 rounded-lg text-sm font-bold transition-colors">Editar</button>
                <button onClick={() => handleDelete(p.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="col-span-full py-12 text-center text-stone-400 font-medium bg-white rounded-3xl border border-dashed border-stone-300">No hay productos en el catálogo. ¡Agrega el primero!</div>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><Tag className="w-5 h-5 text-red-500"/> {isEditing ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
              <button onClick={closeModal} className="bg-stone-200 hover:bg-stone-300 p-2 rounded-full text-stone-600 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white">
              <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-stone-500 mb-1">Nombre del Producto</label><input required type="text" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-red-500" /></div>
                  <div><label className="block text-xs font-bold text-stone-500 mb-1">Precio (USD $)</label><input required type="number" step="0.01" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-red-500 font-bold" /></div>
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1">Descripción</label><textarea required value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-red-500" rows="3"></textarea></div>
                  <div><label className="block text-xs font-bold text-stone-500 mb-1">Categoría</label><select value={form.categoryId} onChange={e=>setForm({...form, categoryId:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-red-500"><option value="">Seleccione Categoría</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-stone-500 mb-1">Stock (Dejar vacío si es infinito)</label><input type="number" placeholder="Ej: 10" value={form.stock} onChange={e=>setForm({...form, stock:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-red-500" /></div>
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1">Etiqueta Resaltada (Opcional, Ej: NUEVO, 50% OFF)</label><input type="text" placeholder="Ej: MÁS VENDIDO" value={form.badge} onChange={e=>setForm({...form, badge:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 outline-none focus:border-red-500" /></div>
                  
                  <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl mt-2 flex items-center gap-3">
                    <input type="checkbox" id="isExtra" checked={form.isExtra} onChange={e=>setForm({...form, isExtra:e.target.checked})} className="w-5 h-5 accent-blue-600"/>
                    <label htmlFor="isExtra" className="text-sm font-bold text-blue-900 cursor-pointer">Marcar como Extra / Adicional (Ej: Globo, Topping)</label>
                  </div>
                  
                  {form.isExtra ? (
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1">Emoji Representativo (Se mostrará en vez de foto)</label><input type="text" value={form.emoji} onChange={e=>setForm({...form, emoji:e.target.value})} placeholder="Ej: ✨🎈🍫" className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-2xl text-center shadow-inner" /></div>
                  ) : (
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-stone-500 mb-1">Imagen del Producto (JPG/PNG)</label>
                      <div className="flex items-center gap-4 bg-stone-50 p-4 border border-stone-200 rounded-2xl">
                        <label className="cursor-pointer bg-white hover:bg-stone-100 px-5 py-3 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors border shadow-sm"><UploadCloud className="w-5 h-5 text-stone-500"/> {uploading ? 'Subiendo...' : 'Seleccionar Imagen'}<input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading}/></label>
                        {form.image && <div className="relative"><img src={form.image} alt="Preview" className="h-16 w-16 object-cover rounded-xl border shadow-sm"/></div>}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 bg-white shrink-0 flex gap-3">
              <button type="button" onClick={closeModal} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3.5 rounded-xl transition-colors">Cancelar</button>
              <button form="product-form" type="submit" disabled={uploading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ADMIN CATEGORÍAS ---
function AdminCategories({ categories }) {
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) await updateDoc(doc(db, 'categories', isEditing), { name }).catch(e=>console.error(e));
    else await addDoc(collection(db, 'categories'), { name }).catch(e=>console.error(e));
    setName(''); setIsEditing(null);
  };

  const handleEdit = (cat) => { setName(cat.name); setIsEditing(cat.id); };
  const handleDelete = async (id) => { if (window.confirm("¿Seguro?")) await deleteDoc(doc(db, 'categories', id)).catch(e=>console.error(e)); };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><List className="w-6 h-6 text-blue-500"/> Categorías</h2></div>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex gap-4 items-end">
        <div className="flex-1"><label className="block text-xs font-bold text-stone-500 mb-1">Nombre de la Categoría</label><input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-blue-500" /></div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all">{isEditing ? 'Actualizar' : 'Añadir'}</button>
        {isEditing && <button type="button" onClick={()=>{setIsEditing(null); setName('');}} className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-2.5 px-4 rounded-xl transition-colors">Cancelar</button>}
      </form>
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left"><tbody className="divide-y divide-stone-100">
          {categories.map(c => (
            <tr key={c.id} className="hover:bg-stone-50 transition-colors"><td className="p-4 font-bold text-gray-800">{c.name}</td><td className="p-4 text-right"><button onClick={()=>handleEdit(c)} className="p-2 text-stone-400 hover:text-blue-600"><Edit className="w-4 h-4"/></button><button onClick={()=>handleDelete(c.id)} className="p-2 text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

// --- ADMIN GASTOS (EGRESOS) ---
function AdminExpenses({ expenses }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Insumos');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount || amount <= 0) return alert("Ingresa una descripción y un monto válido.");
    await addDoc(collection(db, 'expenses'), { description, amountUSD: Number(amount), category, date: date + 'T12:00:00Z', createdAt: new Date().toISOString() }).catch(e=>console.error(e));
    setDescription(''); setAmount('');
  };

  const handleDelete = async (id) => { if (window.confirm('¿Seguro que deseas eliminar este gasto?')) await deleteDoc(doc(db, 'expenses', id)).catch(e=>console.error(e)); };
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amountUSD), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Receipt className="w-6 h-6 text-red-500"/> Control de Gastos</h2></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
            <h3 className="font-bold text-gray-800 mb-4">Registrar Nuevo Gasto</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Fecha del Gasto</label><input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Descripción</label><input required type="text" placeholder="Ej: Fresas y Chocolate..." value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50"><option value="Insumos">🍓 Insumos (Frutas, Chocolates)</option><option value="Empaque">📦 Empaques (Cajas, Globos)</option><option value="Logística">🛵 Logística (Gasolina, Delivery)</option><option value="Servicios">💡 Servicios (Luz, Internet)</option><option value="Nómina">👥 Nómina (Pago ayudantes)</option><option value="Otros">📝 Otros Gastos</option></select>
              </div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Monto ($ USD)</label><input required type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 font-black text-red-600" /></div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-md mt-2">Guardar Gasto</button>
            </form>
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex justify-between items-center shrink-0"><div><p className="text-sm font-bold text-red-800">Total Gastos Registrados</p></div><p className="text-3xl font-black text-red-700">-${totalExpenses.toFixed(2)}</p></div>
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 flex-grow overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-grow max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200 sticky top-0"><th className="p-4 font-bold">Fecha / Categoría</th><th className="p-4 font-bold">Descripción</th><th className="p-4 font-bold text-right">Monto</th><th className="p-4 font-bold text-center">Acción</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-4"><div className="text-sm font-bold text-gray-900">{exp.date && !isNaN(new Date(exp.date).getTime()) ? new Date(exp.date).toLocaleDateString() : 'N/A'}</div><div className="text-xs text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded inline-block mt-1">{exp.category}</div></td>
                      <td className="p-4 text-sm text-gray-700 font-medium">{exp.description}</td><td className="p-4 text-right font-black text-red-600">-${Number(exp.amountUSD).toFixed(2)}</td>
                      <td className="p-4 text-center"><button onClick={() => handleDelete(exp.id)} className="text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ADMIN CUPONES ---
function AdminCoupons({ coupons }) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');

  const handleAddCoupon = async (e) => {
    e.preventDefault(); const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !discountValue || discountValue <= 0) return alert("Rellena todos los campos.");
    if (coupons.find(c => c.code === cleanCode)) return alert("Ese código ya existe.");
    await addDoc(collection(db, 'coupons'), { code: cleanCode, discountType, discountValue: Number(discountValue), isActive: true, createdAt: new Date().toISOString() }).catch(e=>console.error(e));
    setCode(''); setDiscountValue('');
  };

  const handleToggleActive = async (id, currentStatus) => await updateDoc(doc(db, 'coupons', id), { isActive: !currentStatus }).catch(e=>console.error(e));
  const handleDelete = async (id) => { if (window.confirm('¿Eliminar cupón?')) await deleteDoc(doc(db, 'coupons', id)).catch(e=>console.error(e)); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Ticket className="w-6 h-6 text-blue-500"/> Promociones y Cupones</h2></div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
        <form onSubmit={handleAddCoupon} className="flex flex-col md:flex-row gap-4 items-end mb-8 border-b border-stone-100 pb-8">
          <div className="flex-1 w-full"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Código de Cupón</label><input required type="text" placeholder="Ej: MAMA20" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 uppercase font-black text-blue-800" /></div>
          <div className="w-full md:w-48"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tipo</label><select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50"><option value="percentage">Porcentaje (%)</option><option value="fixed">Monto Fijo ($)</option></select></div>
          <div className="w-full md:w-32"><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Valor</label><input required type="number" step="0.01" min="0" placeholder="Ej: 10" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-stone-50 font-black text-center" /></div>
          <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md">Crear</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider border-b border-stone-200"><th className="p-4 font-bold">Código</th><th className="p-4 font-bold">Descuento</th><th className="p-4 font-bold text-center">Estado</th><th className="p-4 font-bold text-center">Acciones</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4"><span className="font-black text-lg text-blue-900 bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 tracking-widest">{coupon.code}</span></td>
                  <td className="p-4 font-bold text-gray-800 text-base">{coupon.discountType === 'percentage' ? <span className="flex items-center gap-1"><Percent className="w-4 h-4 text-stone-400"/> {coupon.discountValue}% OFF</span> : <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-stone-400"/> ${coupon.discountValue} OFF</span>}</td>
                  <td className="p-4 text-center"><button onClick={() => handleToggleActive(coupon.id, coupon.isActive)} className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${coupon.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>{coupon.isActive ? 'ACTIVO' : 'INACTIVO'}</button></td>
                  <td className="p-4 text-center"><button onClick={() => handleDelete(coupon.id)} className="text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- ADMIN KPIs REORGANIZADO Y MEJORADO ---
function AdminKPIs({ orders, products, expenses, bcvRate }) {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const validOrders = orders.filter((o) => o.status !== 'Cancelado');
  
  const totalHistoricoVentasUSD = validOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  const totalHistoricoGastosUSD = expenses.reduce((sum, e) => sum + (Number(e.amountUSD) || 0), 0);

  const monthOrders = validOrders.filter((o) => { 
    if(!o.date) return false; 
    try { const d = new Date(o.date); return !isNaN(d.getTime()) && d.getMonth() === filterMonth && d.getFullYear() === filterYear; } catch { return false; } 
  });
  
  const monthExpensesList = expenses.filter(e => { 
    if(!e.date && !e.createdAt) return false; 
    try { const d = new Date(e.date || e.createdAt); return !isNaN(d.getTime()) && d.getMonth() === filterMonth && d.getFullYear() === filterYear; } catch { return false; } 
  });

  const monthSalesUSD = monthOrders.reduce((sum, o) => sum + (Number(o.totalUSD) || 0), 0);
  const monthExpensesUSD = monthExpensesList.reduce((sum, e) => sum + Number(e.amountUSD), 0);
  const netProfitUSD = monthSalesUSD - monthExpensesUSD;

  const expensesByCategory = monthExpensesList.reduce((acc, exp) => {
    const cat = exp.category || 'Otros';
    acc[cat] = (acc[cat] || 0) + Number(exp.amountUSD);
    return acc;
  }, {});

  const topProducts = useMemo(() => {
    const counts = {};
    monthOrders.forEach(o => o.items?.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.quantity; }));
    return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
  }, [monthOrders]);

  const handleDownloadReport = () => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let csv = `REPORTE FINANCIERO DECOMER FRUTAS - ${monthNames[filterMonth]} ${filterYear}\n\n`;
    
    csv += 'RESUMEN DEL MES\n';
    csv += `Ventas Brutas Totales,$${monthSalesUSD.toFixed(2)}\n`;
    csv += `Gastos Totales,-$${monthExpensesUSD.toFixed(2)}\n`;
    csv += `Ganancia Neta Libre,$${netProfitUSD.toFixed(2)}\n\n`;

    csv += 'DETALLE DE VENTAS (INGRESOS)\n';
    csv += 'Fecha,ID Pedido,Cliente,Monto USD\n';
    monthOrders.forEach(o => {
      const dateStr = o.date ? new Date(o.date).toLocaleDateString() : '';
      const client = o.customerName || o.senderName || 'Web';
      csv += `${dateStr},${o.displayId},"${client}",$${Number(o.totalUSD).toFixed(2)}\n`;
    });

    csv += '\nDETALLE DE EGRESOS (GASTOS)\n';
    csv += 'Fecha,Categoria,Descripcion,Monto USD\n';
    monthExpensesList.forEach(e => {
      const dateStr = e.date ? new Date(e.date).toLocaleDateString() : '';
      csv += `${dateStr},${e.category},"${e.description}",-$${Number(e.amountUSD).toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Decomer_${monthNames[filterMonth]}_${filterYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* 🔴 HEADER CON FILTROS ORDENADOS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-indigo-600"/> Rendimiento Mensual</h2>
          <p className="text-stone-500 text-sm mt-1">Analíticas financieras y volumen de ventas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 p-1.5 rounded-xl">
            <Filter className="w-4 h-4 text-stone-400 ml-2"/>
            <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="bg-transparent font-bold text-sm outline-none px-2 py-1 cursor-pointer text-stone-700">
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <span className="text-stone-300">|</span>
            <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="bg-transparent font-bold text-sm outline-none px-2 py-1 cursor-pointer text-stone-700">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={handleDownloadReport} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ml-auto lg:ml-0">
            <Download className="w-4 h-4"/> Descargar CSV
          </button>
        </div>
      </div>

      {/* 🔴 TARJETAS DE RESUMEN (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp className="w-32 h-32 text-blue-500"/></div>
          <p className="text-stone-500 text-xs font-black mb-1 uppercase tracking-widest relative z-10 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Ingresos (Ventas)</p>
          <p className="text-4xl font-black text-gray-900 relative z-10 mt-2">${monthSalesUSD.toFixed(2)}</p>
          <p className="text-sm text-stone-500 mt-2 font-medium relative z-10 bg-stone-50 inline-block px-3 py-1 rounded-lg border border-stone-100">{monthOrders.length} pedidos pagados</p>
        </div>
        
        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Receipt className="w-32 h-32 text-red-500"/></div>
          <p className="text-stone-500 text-xs font-black mb-1 uppercase tracking-widest relative z-10 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Egresos (Gastos)</p>
          <p className="text-4xl font-black text-red-600 relative z-10 mt-2">-${monthExpensesUSD.toFixed(2)}</p>
          <p className="text-sm text-stone-500 mt-2 font-medium relative z-10 bg-stone-50 inline-block px-3 py-1 rounded-lg border border-stone-100">{monthExpensesList.length} registros</p>
        </div>
        
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign className="w-32 h-32 text-green-400"/></div>
          <p className="text-stone-400 text-xs font-black mb-1 uppercase tracking-widest relative z-10 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400"></div> Ganancia Neta Real</p>
          <p className={`text-5xl font-black relative z-10 mt-2 ${netProfitUSD >= 0 ? 'text-white' : 'text-red-400'}`}>${netProfitUSD.toFixed(2)}</p>
          <p className="text-sm text-stone-400 mt-2 font-medium relative z-10 bg-stone-800 inline-block px-3 py-1 rounded-lg border border-stone-700">Libre de gastos</p>
        </div>
      </div>

      {/* 🔴 SECCIÓN DE LISTAS/GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Desglose de Gastos */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-col h-full">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-stone-100 pb-4"><PieChart className="w-5 h-5 text-red-500"/> Distribución de Gastos</h3>
          {Object.keys(expensesByCategory).length > 0 ? (
            <div className="space-y-5 flex-grow">
              {Object.entries(expensesByCategory).sort((a,b)=>b[1]-a[1]).map(([cat, amount]) => (
                <div key={cat} className="group">
                  <div className="flex justify-between text-sm font-bold mb-2"><span className="text-stone-700">{cat}</span><span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">-${amount.toFixed(2)}</span></div>
                  <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden"><div className="bg-red-500 h-full rounded-full transition-all group-hover:bg-red-600" style={{ width: `${(amount / monthExpensesUSD) * 100}%` }}></div></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-stone-400 py-10">
              <Receipt className="w-12 h-12 mb-3 opacity-20"/>
              <p className="text-sm font-medium">Todo limpio. No hay gastos este mes.</p>
            </div>
          )}
        </div>

        {/* Top 5 Productos */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 flex flex-col h-full">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-stone-100 pb-4"><Star className="w-5 h-5 text-yellow-500"/> Productos Más Vendidos</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3 flex-grow">
              {topProducts.map(([name, qty], idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : idx === 1 ? 'bg-stone-200 text-stone-600 border border-stone-300' : idx === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-white text-stone-400 border border-stone-200'}`}>
                      {idx + 1}
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{name}</span>
                  </div>
                  <span className="bg-white border border-stone-200 text-stone-700 font-black px-3 py-1.5 rounded-lg text-xs shadow-sm">{qty} uds.</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-stone-400 py-10">
              <Package className="w-12 h-12 mb-3 opacity-20"/>
              <p className="text-sm font-medium">Aún no hay ventas registradas este mes.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 🔴 RESUMEN HISTÓRICO GLOBALES */}
      <div className="bg-gradient-to-r from-stone-100 to-stone-50 p-6 rounded-3xl border border-stone-200 flex flex-wrap gap-6 justify-around text-center items-center mt-6">
        <div className="flex flex-col items-center"><p className="text-stone-500 font-bold uppercase text-[10px] tracking-widest mb-1">Ventas Históricas (De por vida)</p><p className="font-black text-gray-900 text-xl">${totalHistoricoVentasUSD.toFixed(2)}</p></div>
        <div className="w-px h-10 bg-stone-300 hidden md:block"></div>
        <div className="flex flex-col items-center"><p className="text-stone-500 font-bold uppercase text-[10px] tracking-widest mb-1">Gastos Históricos (De por vida)</p><p className="font-black text-red-600 text-xl">-${totalHistoricoGastosUSD.toFixed(2)}</p></div>
        <div className="w-px h-10 bg-stone-300 hidden md:block"></div>
        <div className="flex flex-col items-center"><p className="text-stone-500 font-bold uppercase text-[10px] tracking-widest mb-1">Ganancia Neta Global</p><p className="font-black text-green-600 text-2xl">${(totalHistoricoVentasUSD - totalHistoricoGastosUSD).toFixed(2)}</p></div>
      </div>
    </div>
  );
}

// --- ADMIN KANBAN ---
function AdminKanban({ orders }) {
  const validOrders = orders.filter(o => o.status !== 'Cancelado');
  const cols = [
    { id: 'Pendiente', title: 'Nuevos / Pendientes', color: 'border-orange-500 bg-orange-50/50', icon: <Clock className="w-5 h-5 text-orange-500"/> },
    { id: 'En Preparación', title: 'Armando Arreglo', color: 'border-purple-500 bg-purple-50/50', icon: <Gift className="w-5 h-5 text-purple-500"/> },
    { id: 'Listos', title: 'Listos', color: 'border-green-500 bg-green-50/50', icon: <CheckCircle className="w-5 h-5 text-green-500"/> }
  ];
  const handleDragStart = (e, orderId) => { e.dataTransfer.setData('orderId', orderId); };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = async (e, newStatus) => { e.preventDefault(); const orderId = e.dataTransfer.getData('orderId'); if (!orderId) return; await updateDoc(doc(db, 'orders', orderId), { status: newStatus === 'Listos' ? 'Completado' : newStatus }).catch(e=>console.error(e)); };

  return (
    <div className="space-y-6 animate-fade-in w-full h-full">
      <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><LayoutDashboard className="w-6 h-6 text-purple-600"/> Tablero de Producción</h2></div>
      <div className="flex flex-col xl:flex-row gap-6 w-full min-h-[600px] pb-10">
        {cols.map(col => {
          const colOrders = validOrders.filter(o => { if (col.id === 'Pendiente') return ['Pendiente', 'Abonado', 'Pagado'].includes(o.status); if (col.id === 'En Preparación') return o.status === 'En Preparación'; return o.status === 'Completado'; });
          return (
            <div key={col.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className={`flex-1 flex flex-col bg-stone-100 rounded-3xl border-t-4 shadow-sm p-4 ${col.color}`}>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-200"><h3 className="font-bold text-gray-800 flex items-center gap-2">{col.icon} {col.title}</h3><span className="bg-white text-stone-600 font-bold px-2 py-0.5 rounded-full text-xs shadow-sm">{colOrders.length}</span></div>
              <div className="flex flex-col gap-3 flex-grow">
                {colOrders.map(order => (
                  <div key={order.id} draggable onDragStart={(e) => handleDragStart(e, order.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 cursor-grab relative group">
                    <div className="mb-2"><span className="font-black text-gray-900 block">{order.displayId}</span><span className="text-xs text-stone-500 font-medium">Para: {order.recipientName || order.customerName}</span></div>
                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-100 mb-3 space-y-1">{order.items.map((item, idx) => <p key={idx} className="text-xs font-bold text-gray-700 leading-tight"><span className="text-red-500 mr-1">{item.quantity}x</span> {item.name}</p>)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- ADMIN DELIVERY ---
function AdminDeliveryRoute({ orders, bcvRate }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllDates, setShowAllDates] = useState(false);
  const [routeIds, setRouteIds] = useState([]);

  useEffect(() => { setRouteIds([]); }, [showAllDates, selectedDate]);

  const availableOrders = orders.filter(o => {
    if (o.status === 'Cancelado' || o.status === 'Completado') return false; 
    if (o.deliveryMethod === 'Pickup') return false;
    if (routeIds.includes(o.id)) return false; 
    
    if (showAllDates) return true;

    let orderDate = o.deliveryDate || ''; 
    if (!orderDate && o.date) { 
      try { const d = new Date(o.date); if(!isNaN(d.getTime())) orderDate = d.toISOString().split('T')[0]; } catch(e) {} 
    } 
    return orderDate === selectedDate; 
  });

  const routeOrders = routeIds.map(id => orders.find(o => o.id === id)).filter(Boolean);

  const addToRoute = (id) => setRouteIds([...routeIds, id]);
  const removeFromRoute = (id) => setRouteIds(routeIds.filter(routeId => routeId !== id));

  const sendRouteWhatsApp = () => {
    if (routeOrders.length === 0) return alert("Añade pedidos a la ruta primero.");
    let text = `*🛵 RUTA DE ENTREGAS:*\n`;
    if (!showAllDates) text += `📅 Fecha: ${selectedDate}\n\n`;
    
    routeOrders.forEach((o, i) => {
      text += `*${i+1}. ${o.displayId} - ${o.recipientName}*\n`;
      text += `📍 ${o.deliveryAddress}\n`;
      text += `📞 ${o.recipientPhone}\n`;
      text += `🕒 ${o.deliveryTimeSlot || 'Sin turno'}\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Route className="w-6 h-6 text-red-600"/> Constructor de Rutas</h2><p className="text-stone-500 text-sm mt-1">Arma la ruta del motorizado y envíasela.</p></div>
        <button onClick={sendRouteWhatsApp} className="bg-[#25D366] hover:bg-[#1ebd5a] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-colors"><Send className="w-5 h-5"/> Enviar Ruta al Motorizado</button>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200 flex flex-wrap items-center gap-6">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">Filtrar por Fecha de Entrega</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={showAllDates} className={`px-4 py-2 border rounded-xl outline-none transition-opacity ${showAllDates ? 'bg-stone-100 opacity-50' : 'bg-white border-stone-300 focus:border-red-500'}`} />
        </div>
        <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
          <input type="checkbox" id="showAll" checked={showAllDates} onChange={(e) => setShowAllDates(e.target.checked)} className="w-5 h-5 accent-red-600 cursor-pointer" />
          <label htmlFor="showAll" className="text-sm font-bold text-stone-700 cursor-pointer">Ignorar fecha (Mostrar todos los pendientes por entregar)</label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 flex flex-col h-[600px]">
          <div className="p-4 bg-stone-50 border-b border-stone-200 rounded-t-3xl flex justify-between items-center">
            <h3 className="font-bold text-stone-700 text-sm flex items-center gap-2"><Package className="w-4 h-4"/> Disponibles ({availableOrders.length})</h3>
          </div>
          <div className="overflow-y-auto p-4 space-y-3 bg-stone-50/50 flex-grow">
            {availableOrders.length === 0 && <p className="text-center text-stone-400 text-sm py-10 font-medium">No hay pedidos disponibles con estos filtros.</p>}
            {availableOrders.map(order => (
              <div key={order.id} className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <span className="font-black text-gray-900 block">{order.displayId}</span>
                    <span className="text-sm font-bold text-gray-700 line-clamp-1">{order.recipientName || 'Sin destinatario'}</span>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-tight">📍 {order.deliveryAddress}</p>
                    <span className="inline-block mt-2 text-[10px] bg-stone-100 px-2 py-0.5 rounded font-bold">{order.deliveryTimeSlot?.includes('Mañana') ? '🌅 Mañana' : '🌇 Tarde'}</span>
                  </div>
                  <button onClick={() => addToRoute(order.id)} className="bg-stone-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"><Plus className="w-4 h-4" /> Añadir</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border-2 border-green-500 flex flex-col h-[600px] relative overflow-hidden">
          <div className="p-4 bg-green-50 border-b border-green-200 flex justify-between items-center">
            <h3 className="font-black text-green-800 flex items-center gap-2 text-lg"><Truck className="w-5 h-5"/> Ruta del Día ({routeOrders.length})</h3>
            {routeOrders.length > 0 && <span className="bg-green-600 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">LISTA PARA ENVIAR</span>}
          </div>
          <div className="overflow-y-auto p-4 space-y-3 flex-grow bg-white relative">
            {routeOrders.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-8 text-center">
                <Route className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">No has añadido pedidos a la ruta.</p><p className="text-xs mt-1">Usa el botón "Añadir" en la lista de la izquierda.</p>
              </div>
            ) : (
              routeOrders.map((order, index) => (
                <div key={order.id} className="p-4 bg-green-50/30 border border-green-100 rounded-2xl flex gap-4 items-center animate-scale-in">
                  <div className="w-8 h-8 flex items-center justify-center font-black text-green-700 bg-green-100 rounded-xl text-sm shrink-0 border border-green-200">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <span className="font-black block text-gray-900">{order.displayId} <span className="text-xs font-bold text-stone-500 font-normal ml-1">({order.recipientName})</span></span>
                    <p className="text-xs text-stone-600 mt-1 truncate">📍 {order.deliveryAddress}</p>
                  </div>
                  <button onClick={() => removeFromRoute(order.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0" title="Quitar de la ruta"><X className="w-5 h-5"/></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- STOREFRONT DEL CLIENTE ---
function ClientStorefront({ products, categories, coupons, cart, setCart, user, bcvRate, searchQuery, storeIsOpen, isCartOpen, setIsCartOpen, loyaltySettings }) {
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('default'); 
  const [showToast, setShowToast] = useState(false);
  
  const [previewProduct, setPreviewProduct] = useState(null);
  
  const [deliveryInfo, setDeliveryInfo] = useState({ deliveryMethod: 'Delivery', senderName: user?.name || '', senderPhone: user?.phone || '', recipientName: '', recipientPhone: '', deliveryAddress: user?.address || '', deliveryDate: '', deliveryTimeSlot: 'Mañana (8:00 AM - 12:00 PM)', dedication: '' });
  
  const [clientPayments, setClientPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({ method: 'Zelle', reference: '', amountUSD: '', bank: VENEZUELAN_BANKS[0], phone: '' });

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  const addToCart = (product) => {
    if (!storeIsOpen) return alert("La tienda está cerrada.");
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (product.stock !== '' && product.stock !== undefined && existing.quantity >= Number(product.stock)) return alert(`Solo tenemos ${product.stock} unidades.`);
      setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else { setCart([...cart, { ...product, quantity: 1 }]); }
    
    setShowToast(true); setTimeout(() => setShowToast(false), 2500); setPreviewProduct(null); setIsCartOpen(true);
  };

  const handleQuickBuy = (product) => { if (!storeIsOpen) return; addToCart(product); setTimeout(() => { setCheckoutStep(true); setIsCartOpen(false); window.scrollTo(0, 0); }, 300); }

  const updateQuantity = (product, delta) => {
    setCart(cart.map((item) => {
      if (item.id === product.id) {
        const newQty = item.quantity + delta;
        if (delta > 0 && product.stock !== '' && product.stock !== undefined && newQty > Number(product.stock)) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };
  
  const rawTotalUSD = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  let discountUSD = 0;
  if (appliedCoupon) discountUSD = appliedCoupon.discountType === 'percentage' ? rawTotalUSD * (appliedCoupon.discountValue / 100) : appliedCoupon.discountValue;
  const totalUSD = Math.max(0, rawTotalUSD - discountUSD); 
  
  const totalPaidUSD = clientPayments.reduce((sum, p) => sum + Number(p.amountUSD), 0);
  const balanceUSD = totalUSD - totalPaidUSD;

  const earnedPoints = loyaltySettings?.enabled ? Math.floor(rawTotalUSD * (loyaltySettings.pointsPerDollar || 1)) : 0;

  const handleApplyCoupon = () => {
    setCouponError(''); if (!couponInput.trim()) return;
    const found = coupons.find(c => c.code === couponInput.trim().toUpperCase());
    if (!found) return setCouponError("Código inválido."); if (!found.isActive) return setCouponError("Cupón inactivo.");
    setAppliedCoupon(found); setCouponInput('');
  };

  const handleAddPayment = () => {
    const amount = Number(currentPayment.amountUSD);
    if (!amount || amount <= 0 || amount > balanceUSD + 0.01) return alert("Monto inválido");
    setClientPayments([...clientPayments, { ...currentPayment, amountUSD: amount, details: (currentPayment.method === 'Pago Móvil') ? `Banco: ${currentPayment.bank} - Tlf: ${currentPayment.phone}` : '' }]);
    setCurrentPayment({ method: 'Zelle', reference: '', amountUSD: '', bank: VENEZUELAN_BANKS[0], phone: '' });
  };

  const handleCheckout = async (e) => {
    e.preventDefault(); if (!storeIsOpen) return;
    const orderDisplayId = `PED-${Math.floor(Math.random() * 10000)}`;
    
    const finalAddress = deliveryInfo.deliveryMethod === 'Pickup' ? 'Retiro en Tienda (Pickup)' : deliveryInfo.deliveryAddress;

    await addDoc(collection(db, 'orders'), {
      displayId: orderDisplayId, ...deliveryInfo, deliveryAddress: finalAddress, items: cart, subtotalUSD: rawTotalUSD, discountUSD: discountUSD, totalUSD: totalUSD,
      earnedPoints: earnedPoints,
      appliedCoupon: appliedCoupon ? { code: appliedCoupon.code, value: appliedCoupon.discountValue, type: appliedCoupon.discountType } : null,
      status: clientPayments.length > 0 ? (totalPaidUSD >= totalUSD ? 'Pagado' : 'Abonado') : 'Pendiente',
      payments: clientPayments.map(p => ({ ...p, date: new Date().toISOString() })), date: new Date().toISOString()
    }).catch(e=>console.error(e));

    for (const item of cart) {
      if (item.stock !== '' && item.stock !== undefined) {
        const newStock = Math.max(0, Number(item.stock) - item.quantity);
        await updateDoc(doc(db, 'products', item.id), { stock: newStock }).catch(e=>console.error(e));
      }
    }

    let text = `*¡Hola Decomer! Nuevo Pedido Web* 🍓🍫\n\n*Orden:* #${orderDisplayId}\n\n`;
    
    text += `*📍 MÉTODO:* ${deliveryInfo.deliveryMethod === 'Pickup' ? '🏪 RETIRO EN TIENDA (Pickup)' : '🛵 DELIVERY'}\n\n`;
    text += `*📤 EMISOR (Quien envía):*\n▪️ ${deliveryInfo.senderName} (${deliveryInfo.senderPhone})\n\n`;
    
    if (deliveryInfo.deliveryMethod === 'Delivery') {
      text += `*📥 RECIBE (Destinatario):*\n▪️ ${deliveryInfo.recipientName} (${deliveryInfo.recipientPhone})\n\n`;
      text += `*📍 DIRECCIÓN DE ENTREGA:*\n▪️ ${deliveryInfo.deliveryAddress}\n▪️ ${deliveryInfo.deliveryDate} - ${deliveryInfo.deliveryTimeSlot}\n\n`;
    } else {
      text += `*📅 PARA RETIRAR EL:*\n▪️ ${deliveryInfo.deliveryDate} - ${deliveryInfo.deliveryTimeSlot}\n\n`;
    }

    if(deliveryInfo.dedication) text += `*📝 DEDICATORIA:*\n_"${deliveryInfo.dedication}"_\n\n`;
    text += `*📦 PRODUCTOS:*\n${cart.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n')}\n\n`;
    text += `*💰 SUBTOTAL:* $${rawTotalUSD.toFixed(2)}\n`;
    if (appliedCoupon) text += `*🎟️ CUPÓN (${appliedCoupon.code}):* -$${discountUSD.toFixed(2)}\n`;
    text += `*🔥 TOTAL A PAGAR:* $${totalUSD.toFixed(2)} (Bs. ${(totalUSD * bcvRate).toFixed(2)})\n`;
    
    window.open(`https://wa.me/584125296272?text=${encodeURIComponent(text)}`, '_blank');
    setCart([]); setClientPayments([]); setAppliedCoupon(null); setCheckoutStep(false); setIsCartOpen(false);
  };

  const mainProducts = products.filter((p) => !p.isExtra);
  const extraProducts = products.filter((p) => p.isExtra);

  let filteredProducts = mainProducts.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch = String(p.name).toLowerCase().includes(searchQuery.toLowerCase());
    let matchPrice = true;
    if (priceFilter === 'under20') matchPrice = Number(p.price) < 20;
    if (priceFilter === '20to40') matchPrice = Number(p.price) >= 20 && Number(p.price) <= 40;
    if (priceFilter === 'premium') matchPrice = Number(p.price) > 40;
    return matchCategory && matchSearch && matchPrice;
  });

  filteredProducts.sort((a, b) => {
    if (sortOrder === 'asc') return Number(a.price) - Number(b.price);
    if (sortOrder === 'desc') return Number(b.price) - Number(a.price);
    return 0;
  });

  return (
    <div className="flex flex-col gap-6 xl:gap-8 animate-fade-in relative w-full">
      <a href="https://wa.me/584125296272" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1ebd5a] transition-transform hover:scale-110 z-40 flex items-center justify-center print:hidden group"><MessageCircle className="w-7 h-7" /></a>
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-stone-900/95 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 pointer-events-none ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}><CheckCircle className="w-5 h-5 text-green-400" /><span className="font-medium text-sm">Agregado al carrito</span></div>

      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl p-8 sm:p-10 text-white mb-6 shadow-lg"><h1 className="text-3xl sm:text-5xl font-black mb-3 font-serif">Regala dulzura</h1><p className="text-red-50 text-base">Arreglos frutales y fresas con chocolate.</p></div>

      <div className="flex flex-col gap-3 mb-6 w-full min-w-0">
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full min-w-0">
          <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 ${selectedCategory === 'all' ? 'bg-red-600 text-white' : 'bg-white text-stone-600 hover:bg-red-50'}`}>Todos</button>
          {categories.map((cat) => (<button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 whitespace-nowrap ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-white text-stone-600 hover:bg-red-50'}`}>{cat.name}</button>))}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full border-t border-stone-200 pt-3">
          <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 no-scrollbar min-w-0">
            <button onClick={() => setPriceFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${priceFilter === 'all' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Cualquier Precio</button>
            <button onClick={() => setPriceFilter('under20')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${priceFilter === 'under20' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Menos de $20</button>
            <button onClick={() => setPriceFilter('20to40')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${priceFilter === '20to40' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>$20 - $40</button>
            <button onClick={() => setPriceFilter('premium')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${priceFilter === 'premium' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Premium</button>
          </div>
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-2 rounded-xl shrink-0"><ArrowDownUp className="w-4 h-4 text-stone-400"/><select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-transparent text-xs font-bold text-stone-600 outline-none cursor-pointer"><option value="default">Relevancia</option><option value="asc">Precio: Menor a Mayor</option><option value="desc">Precio: Mayor a Menor</option></select></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const isOutOfStock = product.stock !== '' && product.stock !== undefined && Number(product.stock) <= 0;
          return (
          <div key={product.id} className={`bg-white rounded-2xl shadow-sm hover:shadow-xl border border-stone-100 overflow-hidden flex flex-col group transition-all duration-300 relative ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`}>
            {product.badge && <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-yellow-100"><span className="text-xs font-black text-gray-800">{product.badge}</span></div>}
            {isOutOfStock && <div className="absolute top-3 left-3 z-10 bg-red-600 text-white px-3 py-1.5 rounded shadow-lg"><span className="text-xs font-black tracking-widest">AGOTADO</span></div>}
            <div className="h-56 bg-stone-100 overflow-hidden relative cursor-pointer" onClick={() => setPreviewProduct(product)}><img src={product.image} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" alt={product.name} /></div>
            <div className="p-4 sm:p-5 flex flex-col flex-grow">
              <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{product.name}</h3><p className="text-stone-500 text-sm mb-4 mt-1 flex-grow line-clamp-2 leading-relaxed">{product.description}</p>
              <div className="flex flex-wrap items-center justify-between mt-auto pt-4 border-t border-stone-100 gap-2">
                <div><div className="text-xl sm:text-2xl font-black text-gray-900">${Number(product.price).toFixed(2)}</div></div>
                <div className="flex gap-1.5 shrink-0 ml-auto">
                  <button disabled={!storeIsOpen || isOutOfStock} onClick={() => handleQuickBuy(product)} className="bg-gray-100 text-gray-600 hover:bg-stone-800 hover:text-white disabled:bg-stone-100 p-2.5 rounded-xl"><Zap className="w-5 h-5 fill-current" /></button>
                  <button disabled={!storeIsOpen || isOutOfStock} onClick={() => addToCart(product)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white disabled:bg-red-50 p-2.5 rounded-xl"><Plus className="w-5 h-5 font-bold" /></button>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* CARRITO SLIDE-OUT */}
      <div className={`fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 z-[70] w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-stone-900 p-5 text-white flex items-center justify-between shrink-0"><h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Mi Pedido</h3><button onClick={() => setIsCartOpen(false)} className="text-stone-400 hover:text-white"><X className="w-6 h-6"/></button></div>
        <div className="p-6 flex-grow overflow-y-auto bg-stone-50/50">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-4 items-center mb-5 bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
              {item.isExtra ? <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center text-3xl shrink-0">{item.emoji || '✨'}</div> : <img src={item.image} className="w-16 h-16 rounded-xl object-cover" alt="" />}
              <div className="flex-1"><h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4><p className="text-red-600 font-black text-sm mt-0.5">${Number(item.price).toFixed(2)}</p></div>
              <div className="flex items-center bg-stone-100 rounded-lg p-1"><button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center font-bold">-</button><span className="w-6 text-center text-sm font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center font-bold">+</button></div>
            </div>
          ))}
          {cart.length > 0 && extraProducts.length > 0 && (
            <div className="mt-8 border-t border-stone-200 pt-4">
              <p className="text-xs font-bold text-stone-400 uppercase mb-3 flex items-center gap-2"><Star className="w-3 h-3"/> Agrega un Extra</p>
              <div className="grid grid-cols-2 gap-2">
                {extraProducts.map((extra) => (
                  <button disabled={!storeIsOpen || (extra.stock !== '' && Number(extra.stock) <= 0)} key={extra.id} onClick={() => addToCart(extra)} className="bg-white border border-stone-200 p-2 rounded-xl flex items-center gap-2 text-left hover:shadow-sm">
                    <div className="bg-stone-50 w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0">{extra.emoji || '✨'}</div>
                    <div className="min-w-0"><p className="text-[10px] font-bold text-gray-800 truncate">{extra.name}</p><p className="text-[10px] text-red-500 font-bold">+${Number(extra.price).toFixed(2)}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-stone-100 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="mb-4 bg-stone-50 border border-stone-200 p-3 rounded-2xl">
              {appliedCoupon ? (
                <div className="flex justify-between items-center bg-green-50 p-2 rounded-xl border border-green-200"><div className="flex items-center gap-2 text-green-700"><Ticket className="w-4 h-4"/><span className="text-xs font-bold tracking-widest">{appliedCoupon.code}</span></div><button onClick={() => setAppliedCoupon(null)} className="text-stone-400 hover:text-red-500 p-1"><X className="w-4 h-4"/></button></div>
              ) : (
                <div className="flex gap-2"><input type="text" placeholder="Código de descuento" value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} className="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-xl outline-none uppercase font-bold text-stone-700"/><button onClick={handleApplyCoupon} className="bg-stone-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all">Aplicar</button></div>
              )}
            </div>
            {loyaltySettings?.enabled && earnedPoints > 0 && (
              <div className="mb-4 bg-pink-50 p-3 rounded-2xl border border-pink-100 flex items-center gap-3">
                <Heart className="w-5 h-5 text-pink-500" />
                <p className="text-xs font-bold text-pink-800">¡Con esta compra ganarás <span className="text-pink-600 font-black">{earnedPoints} puntos</span>!</p>
              </div>
            )}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-end pt-2 border-t border-stone-200"><span className="text-gray-900 font-bold">Total a Pagar</span><div className="text-right"><div className="text-2xl font-black text-gray-900">${totalUSD.toFixed(2)}</div></div></div>
            </div>
            <button onClick={() => { setIsCartOpen(false); setCheckoutStep(true); }} className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2">Continuar a Pagar</button>
          </div>
        )}
      </div>

      {previewProduct && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
            <button onClick={() => setPreviewProduct(null)} className="absolute top-4 right-4 z-10 bg-white/50 backdrop-blur hover:bg-white p-2 rounded-full text-stone-800"><X className="w-5 h-5"/></button>
            <div className="w-full md:w-1/2 h-64 md:h-auto bg-stone-100 relative"><img src={previewProduct.image} className="w-full h-full object-cover" alt="" /></div>
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center bg-white">
              <h2 className="text-3xl font-black text-gray-900 mb-4">{previewProduct.name}</h2>
              <p className="text-stone-500 text-base mb-8 whitespace-pre-wrap">{previewProduct.description}</p>
              <div className="mb-8 p-5 bg-stone-50 rounded-2xl"><div className="text-4xl font-black text-red-600">${Number(previewProduct.price).toFixed(2)}</div></div>
              <button disabled={!storeIsOpen || (previewProduct.stock !== '' && Number(previewProduct.stock) <= 0)} onClick={() => addToCart(previewProduct)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-xl"><ShoppingCart className="w-5 h-5" /> Agregar</button>
            </div>
          </div>
        </div>
      )}
      
      {checkoutStep && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-scale-in">
             <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center shrink-0">
               <h3 className="font-bold text-xl text-gray-800">Finalizar Pedido</h3>
               <button onClick={() => setCheckoutStep(false)} className="bg-stone-200 hover:bg-stone-300 p-2 rounded-full"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-6 overflow-y-auto bg-white">
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                  
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-2">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-stone-700 uppercase tracking-wider"><MapPin className="w-4 h-4"/> Método de Entrega</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setDeliveryInfo({...deliveryInfo, deliveryMethod: 'Delivery'})} className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all shadow-sm ${deliveryInfo.deliveryMethod === 'Delivery' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'}`}><Truck className="w-4 h-4"/> Delivery</button>
                      <button type="button" onClick={() => setDeliveryInfo({...deliveryInfo, deliveryMethod: 'Pickup'})} className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all shadow-sm ${deliveryInfo.deliveryMethod === 'Pickup' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'}`}><Store className="w-4 h-4"/> Pickup (Retiro)</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1">Tu Nombre</label><input required type="text" value={deliveryInfo.senderName} onChange={e=>setDeliveryInfo({...deliveryInfo, senderName:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"/></div>
                    <div><label className="block text-xs font-bold mb-1">Tu Teléfono</label><input required type="text" value={deliveryInfo.senderPhone} onChange={e=>setDeliveryInfo({...deliveryInfo, senderPhone:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"/></div>
                    
                    {deliveryInfo.deliveryMethod === 'Delivery' && (
                      <>
                        <div><label className="block text-xs font-bold mb-1">Nombre quien recibe</label><input required type="text" value={deliveryInfo.recipientName} onChange={e=>setDeliveryInfo({...deliveryInfo, recipientName:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"/></div>
                        <div><label className="block text-xs font-bold mb-1">Teléfono quien recibe</label><input required type="text" value={deliveryInfo.recipientPhone} onChange={e=>setDeliveryInfo({...deliveryInfo, recipientPhone:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"/></div>
                      </>
                    )}
                  </div>

                  {deliveryInfo.deliveryMethod === 'Delivery' ? (
                    <div><label className="block text-xs font-bold mb-1">Dirección de Entrega Exacta</label><textarea required value={deliveryInfo.deliveryAddress} onChange={e=>setDeliveryInfo({...deliveryInfo, deliveryAddress:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm" placeholder="Ej: Urb. La Estrella, Calle 2, Casa #14..."/></div>
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800 flex items-start gap-3">
                      <Store className="w-5 h-5 shrink-0 mt-0.5 text-yellow-600"/>
                      <div>
                        <span className="font-black block text-yellow-900 mb-1">Dirección de la Tienda (Pickup)</span>
                        Av. Principal, Local Decomer Frutas. <br/>Te notificaremos por WhatsApp cuando tu pedido esté listo para retirar.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1">{deliveryInfo.deliveryMethod === 'Pickup' ? 'Fecha de Retiro' : 'Fecha de Entrega'}</label><input required type="date" value={deliveryInfo.deliveryDate} onChange={e=>setDeliveryInfo({...deliveryInfo, deliveryDate:e.target.value})} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"/></div>
                    <div><label className="block text-xs font-bold mb-1">Turno</label><select required value={deliveryInfo.deliveryTimeSlot} onChange={e=>setDeliveryInfo({...deliveryInfo, deliveryTimeSlot:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm"><option value="Mañana (8:00 AM - 12:00 PM)">Mañana (8am - 12pm)</option><option value="Tarde (1:00 PM - 5:00 PM)">Tarde (1pm - 5pm)</option></select></div>
                  </div>
                  <div><label className="block text-xs font-bold mb-1">Dedicatoria (Tarjeta)</label><textarea value={deliveryInfo.dedication} onChange={e=>setDeliveryInfo({...deliveryInfo, dedication:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm italic" rows="2" placeholder="Escribe un mensaje bonito para la tarjeta..."></textarea></div>

                  <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-blue-600 uppercase tracking-wider"><CreditCard className="w-4 h-4"/> Forma de Pago</h4>
                    {balanceUSD > 0 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select value={currentPayment.method} onChange={e=>setCurrentPayment({...currentPayment, method:e.target.value})} className="w-full px-3 py-3 border border-stone-200 rounded-xl text-sm bg-white outline-none"><option value="Zelle">Zelle</option><option value="Pago Móvil">Pago Móvil</option></select>
                          <input type="number" step="0.01" max={balanceUSD} placeholder={`Monto USD ($${balanceUSD.toFixed(2)})`} value={currentPayment.amountUSD} onChange={e=>setCurrentPayment({...currentPayment, amountUSD:e.target.value})} className="w-full px-3 py-3 border border-stone-200 rounded-xl text-sm outline-none"/>
                        </div>
                        {currentPayment.method === 'Pago Móvil' && currentPayment.amountUSD && <p className="text-[11px] text-blue-600 font-bold bg-blue-50 p-2 rounded-lg">Monto en Bolívares a transferir: Bs. {(Number(currentPayment.amountUSD) * bcvRate).toFixed(2)}</p>}
                        <button type="button" onClick={handleAddPayment} className="w-full bg-stone-800 hover:bg-black text-white text-sm py-3 rounded-xl font-bold transition-all shadow-md">Añadir Pago a la Orden</button>
                      </div>
                    )}
                    {clientPayments.map((p, i) => (<div key={i} className="flex justify-between items-center p-3 bg-green-50 rounded-xl mt-2 border border-green-200"><span className="font-bold text-green-900">${p.amountUSD} - {p.method}</span><button type="button" onClick={() => setClientPayments(clientPayments.filter((_, idx) => idx !== i))} className="text-red-500 bg-white p-1 rounded-md shadow-sm"><Trash2 className="w-4 h-4"/></button></div>))}
                  </div>
                </form>
             </div>
             <div className="p-6 border-t border-stone-100 bg-white shrink-0"><button form="checkout-form" type="submit" className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg transition-all shadow-xl"><Send className="w-5 h-5"/> Enviar Pedido vía WhatsApp</button></div>
          </div>
        </div>
      )}
    </div>
  );
}