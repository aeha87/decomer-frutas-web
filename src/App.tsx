import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { 
  ShoppingCart, User, Lock, Mail, Phone, MapPin, Plus, Trash2, Edit, LogOut, Instagram, Facebook, Image as ImageIcon,
  CheckCircle, Menu, X, Package, TrendingUp, DollarSign, List, Tag, ShoppingBag, CreditCard, Activity, Calendar, Filter, MessageSquare, Send, Video, Printer,
  Search, MessageCircle, Heart
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

// --- LLAVE DE IMGBB YA CONFIGURADA ---
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bcvRate, setBcvRate] = useState(36.50);
  const [cart, setCart] = useState<any[]>([]);
  
  const [view, setView] = useState('app');

  useEffect(() => {
    const fetchBcv = async () => {
      try {
        const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv');
        const data = await res.json();
        if (data?.monitors?.bcv?.price) setBcvRate(data.monitors.bcv.price);
      } catch (e) {
        console.log("No se pudo conectar al servidor del BCV. Usando tasa de respaldo.");
      }
    };
    fetchBcv();
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
        const sortedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  if (loadingAuth) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center font-bold text-red-600">Cargando plataforma...</div>;
  }

  if (view === 'login' || view === 'register') {
    return <AuthScreen view={view} setView={setView} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <Navbar user={currentUser} onLogout={handleLogout} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} bcvRate={bcvRate} setBcvRate={setBcvRate} onLoginClick={() => setView('login')} />
      <main className="flex-grow container mx-auto px-4 py-8 relative">
        {currentUser?.role === 'admin' ? (
          <AdminDashboard products={products} categories={categories} orders={orders} bcvRate={bcvRate} />
        ) : (
          <ClientStorefront products={products} categories={categories} cart={cart} setCart={setCart} user={currentUser} bcvRate={bcvRate} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function AuthScreen({ view, setView }: any) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', address: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: any) => {
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
    } catch (error: any) {
      if(error.code === 'auth/invalid-credential') setErrorMsg("Correo o contraseña incorrectos.");
      else if(error.code === 'auth/email-already-in-use') setErrorMsg("Este correo ya está registrado.");
      else setErrorMsg(error.message);
    }
    setIsLoading(false);
  };

  const handleChange = (e: any) => setFormData({...formData, [e.target.name]: e.target.value});

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

function Navbar({ user, onLogout, cartCount, bcvRate, setBcvRate, onLoginClick }: any) {
  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 print:hidden transition-all">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src="/logo.png" alt="Decomer Frutas" className="h-14 w-auto drop-shadow-sm hover:scale-105 transition-transform" />
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden lg:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 shadow-inner">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-800">Tasa BCV:</span>
            {user?.role === 'admin' ? (
              <input type="number" step="0.01" value={bcvRate} onChange={(e) => setBcvRate(Number(e.target.value))} className="w-16 text-xs px-1 border-b border-green-300 bg-transparent outline-none font-bold text-green-900 focus:border-green-500" />
            ) : (
              <span className="text-xs font-bold text-green-900">Bs. {bcvRate}</span>
            )}
          </div>

          {user?.role === 'admin' ? (
            <>
              <div className="text-sm text-gray-600 hidden md:block">
                Hola, <span className="font-semibold text-gray-800">{user.name || 'Admin'}</span>
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 shadow-sm">Admin</span>
              </div>
              <button onClick={onLogout} className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:block text-sm font-medium">Salir</span>
              </button>
            </>
          ) : (
            <>
              <div className="relative text-stone-600 hover:text-red-600 transition-colors cursor-pointer group" onClick={() => document.getElementById('cart-section')?.scrollIntoView({behavior: 'smooth'})}>
                <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce shadow-md">
                    {cartCount}
                  </span>
                )}
              </div>
              
              <button onClick={onLoginClick} title="Ingreso Administrativo" className="flex items-center gap-2 text-stone-300 hover:text-stone-800 transition-colors ml-2">
                <User className="w-5 h-5" />
              </button>
            </>
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
          {/* INSTAGRAM */}
          <a href="https://www.instagram.com/decomerfrutas/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-transform hover:scale-110 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg">
            <Instagram className="w-5 h-5" />
            <span className="font-medium text-sm">Instagram</span>
          </a>
          
          {/* FACEBOOK */}
          <a href="https://www.facebook.com/DecomerFrutasMCBO" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-transform hover:scale-110 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg">
            <Facebook className="w-5 h-5" />
            <span className="font-medium text-sm">Facebook</span>
          </a>

          {/* TIKTOK */}
          <a href="https://www.tiktok.com/@decomer.frutas" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white hover:text-gray-200 transition-transform hover:scale-110 bg-stone-800 px-5 py-2.5 rounded-full shadow-lg">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            <span className="font-medium text-sm">TikTok</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function AdminDashboard({ products, categories, orders, bcvRate }: any) {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 shrink-0 print:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 sticky top-24">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 px-3">Gestión de Tienda</h3>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('kpis')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${activeTab === 'kpis' ? 'bg-red-50 text-red-600' : 'text-stone-600 hover:bg-stone-50'}`}>
              <TrendingUp className="w-5 h-5" /> Dashboard (KPIs)
            </button>
            <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${activeTab === 'orders' ? 'bg-red-50 text-red-600' : 'text-stone-600 hover:bg-stone-50'}`}>
              <ShoppingBag className="w-5 h-5" /> Control de Pedidos
            </button>
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${activeTab === 'products' ? 'bg-red-50 text-red-600' : 'text-stone-600 hover:bg-stone-50'}`}>
              <Tag className="w-5 h-5" /> Catálogo de Productos
            </button>
            <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${activeTab === 'categories' ? 'bg-red-50 text-red-600' : 'text-stone-600 hover:bg-stone-50'}`}>
              <List className="w-5 h-5" /> Categorías
            </button>
            <div className="pt-4 mt-2 border-t border-stone-100">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-3">Atención al Cliente</h3>
              <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${activeTab === 'messages' ? 'bg-red-50 text-red-600' : 'text-stone-600 hover:bg-stone-50'}`}>
                <div className="flex items-center gap-3"><MessageSquare className="w-5 h-5" /> Mensajería</div>
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'kpis' && <AdminKPIs orders={orders} bcvRate={bcvRate} />}
        {activeTab === 'orders' && <AdminOrders orders={orders} bcvRate={bcvRate} products={products} />}
        {activeTab === 'products' && <AdminProducts products={products} categories={categories} />}
        {activeTab === 'categories' && <AdminCategories categories={categories} />}
        {activeTab === 'messages' && <AdminMessages />}
      </div>
    </div>
  );
}

function AdminKPIs({ orders, bcvRate }: any) {
  const totalVentasUSD = orders.filter((o: any) => o.status !== 'Cancelado').reduce((sum: any, o: any) => sum + o.totalUSD, 0);
  const totalVentasBs = totalVentasUSD * bcvRate;
  const pedidosPendientes = orders.filter((o: any) => o.status === 'Pendiente').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Métricas de Ventas</h2>
        <p className="text-stone-500">Resumen del rendimiento de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-stone-500 font-medium">Ventas (USD)</p>
            <p className="text-2xl font-bold text-gray-800">${totalVentasUSD.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Activity className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-stone-500 font-medium">Ventas (Bs)</p>
            <p className="text-2xl font-bold text-gray-800">Bs. {totalVentasBs.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><ShoppingBag className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-stone-500 font-medium">Total Pedidos</p>
            <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><Calendar className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-stone-500 font-medium">Pendientes</p>
            <p className="text-2xl font-bold text-gray-800">{pedidosPendientes}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminOrders({ orders, bcvRate, products }: any) {
  const [paymentModal, setPaymentModal] = useState<any>({ isOpen: false, orderId: null });
  const [paymentForm, setPaymentForm] = useState({ method: 'Pago Móvil', reference: '', phone: '', bank: VENEZUELAN_BANKS[0], amountUSD: '' as string | number });
  const [viewPaymentsModal, setViewPaymentsModal] = useState<any>({ isOpen: false, order: null });
  const [receiptModal, setReceiptModal] = useState<any>({ isOpen: false, order: null });

  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualOrder, setManualOrder] = useState({ customerName: '', phone: '', address: '', notes: '', items: [] as any[] });
  const [manualProduct, setManualProduct] = useState('');
  const [manualQty, setManualQty] = useState<string | number>(1);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, 'orders', id), { status: newStatus });
  };

  const openPaymentModal = (order: any) => {
    const totalPaid = (order.payments || []).reduce((sum: number, p: any) => sum + p.amountUSD, 0);
    const balance = order.totalUSD - totalPaid;
    setPaymentForm({ method: 'Pago Móvil', reference: '', phone: '', bank: VENEZUELAN_BANKS[0], amountUSD: balance > 0 ? balance : 0 });
    setPaymentModal({ isOpen: true, orderId: order.id });
  };

  const handleRegisterPayment = async (e: any) => {
    e.preventDefault();
    const order = orders.find((o: any) => o.id === paymentModal.orderId);
    if (!order) return;

    const newPayment = {
      method: paymentForm.method,
      reference: paymentForm.reference,
      amountUSD: parseFloat(paymentForm.amountUSD as string),
      details: (paymentForm.method === 'Pago Móvil' || paymentForm.method === 'Transferencia Bs') 
               ? `Origen: ${paymentForm.bank} - Tlf: ${paymentForm.phone}` 
               : (paymentForm.bank && ['Zelle', 'Zinli', 'Binance'].includes(paymentForm.method) ? `Origen: ${paymentForm.bank}` : ''),
      date: new Date().toISOString()
    };
    
    const updatedPayments = [...(order.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum: number, p: any) => sum + p.amountUSD, 0);
    
    let newStatus = order.status;
    if (totalPaid >= order.totalUSD) newStatus = 'Pagado';
    else if (totalPaid > 0 && totalPaid < order.totalUSD && order.status === 'Pendiente') newStatus = 'Abonado';

    await updateDoc(doc(db, 'orders', order.id), { 
      status: newStatus, 
      payments: updatedPayments
    });
    
    const newBalance = order.totalUSD - totalPaid;
    if (newBalance > 0) {
      setPaymentForm({ ...paymentForm, reference: '', amountUSD: newBalance, phone: '', bank: VENEZUELAN_BANKS[0] });
    } else {
      setPaymentModal({ isOpen: false, orderId: null });
    }
  };

  const handleAddManualItem = () => {
    const productId = manualProduct || (products.length > 0 ? products[0].id : null);
    if (!productId) return;
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;
    
    const existingIndex = manualOrder.items.findIndex(i => i.id === product.id);
    let newItems = [...manualOrder.items];
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += parseInt(manualQty as string);
    } else {
      newItems.push({ ...product, quantity: parseInt(manualQty as string) });
    }
    setManualOrder({ ...manualOrder, items: newItems });
    setManualQty(1);
  };

  const handleRemoveManualItem = (index: number) => {
    setManualOrder({ ...manualOrder, items: manualOrder.items.filter((_, i) => i !== index) });
  }

  const handleCreateManualOrder = async (e: any) => {
    e.preventDefault();
    if (manualOrder.items.length === 0) return alert("Debes agregar al menos un producto.");
    
    const totalUSD = manualOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderDisplayId = `PED-M${Math.floor(Math.random() * 10000)}`;
    
    await addDoc(collection(db, 'orders'), {
      displayId: orderDisplayId,
      customerName: manualOrder.customerName,
      items: manualOrder.items,
      totalUSD: totalUSD,
      status: 'Pendiente',
      payments: [],
      date: new Date().toISOString(),
      notes: manualOrder.notes,
      phone: manualOrder.phone,
      address: manualOrder.address
    });
    
    setIsManualOrderOpen(false);
    setManualOrder({ customerName: '', phone: '', address: '', notes: '', items: [] });
  };

  const getStatusColor = (status: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Control de Pedidos</h2>
          <p className="text-stone-500">Gestiona y cruza pagos con pedidos</p>
        </div>
        <button onClick={() => setIsManualOrderOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nuevo Pedido Manual
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-x-auto print:hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-stone-50 text-stone-600 text-sm border-b border-stone-100">
              <th className="p-4 font-medium">ID Pedido</th>
              <th className="p-4 font-medium">Cliente</th>
              <th className="p-4 font-medium">Monto</th>
              <th className="p-4 font-medium">Pago</th>
              <th className="p-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orders.map((order: any) => {
              const totalPaid = (order.payments || []).reduce((sum: number, p: any) => sum + p.amountUSD, 0);
              const balance = order.totalUSD - totalPaid;
              
              return (
              <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="p-4 font-medium text-gray-800">{order.displayId || 'PED-WEB'}
                  <div className="text-xs text-stone-400 font-normal">{new Date(order.date).toLocaleDateString()}</div>
                </td>
                <td className="p-4 text-sm text-gray-700">{order.customerName}</td>
                <td className="p-4">
                  <div className="font-semibold text-gray-800">${order.totalUSD.toFixed(2)}</div>
                  <div className="text-xs text-stone-500">Bs. {(order.totalUSD * bcvRate).toFixed(2)}</div>
                </td>
                <td className="p-4 text-sm">
                  {totalPaid > 0 ? (
                    <div className="mb-1">
                      <span className="text-green-600 font-bold">Pagado: ${totalPaid.toFixed(2)}</span>
                      {balance > 0 && <span className="text-red-500 ml-2 block text-xs">Deuda: ${balance.toFixed(2)}</span>}
                      <button onClick={() => setViewPaymentsModal({ isOpen: true, order })} className="text-xs text-blue-600 hover:underline">Ver {order.payments?.length} pago(s)</button>
                    </div>
                  ) : (
                    <span className="text-stone-400 italic text-xs">Sin pagos</span>
                  )}
                  {balance > 0 && order.status !== 'Cancelado' && (
                    <button onClick={() => openPaymentModal(order)} className="mt-1 block text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-bold transition-colors">
                      + Añadir Pago
                    </button>
                  )}
                </td>
                <td className="p-4 flex items-center gap-2">
                  <select 
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`text-sm font-medium px-2.5 py-1.5 rounded-lg border-0 outline-none cursor-pointer ${getStatusColor(order.status)}`}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Abonado">Abonado</option>
                    <option value="Pagado">Pagado</option>
                    <option value="En Preparación">En Preparación</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  
                  <button 
                    onClick={() => setReceiptModal({ isOpen: true, order })}
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
                    title="Imprimir Nota de Entrega"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            )})}
            {orders.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-stone-500">No hay pedidos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {receiptModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] print:bg-white print:p-0">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-container, .print-container * { visibility: visible; }
              .print-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0; box-shadow: none; border: none; }
            }
          `}</style>
          
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print-container">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 print:hidden">
              <h3 className="text-lg font-bold text-gray-800">Nota de Entrega</h3>
              <button onClick={() => setReceiptModal({ isOpen: false, order: null })} className="text-stone-400 hover:text-gray-800"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white" id="receipt-content">
              <div className="text-center mb-6">
                <img src="/logo.png" alt="Decomer Frutas" className="h-20 mx-auto mb-3 object-contain" />
                <h2 className="font-serif font-bold text-2xl text-gray-900">Decomer Frutas</h2>
                <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Arreglos & Chocolates</p>
                <div className="mt-4 inline-block bg-stone-100 px-3 py-1 rounded text-sm font-bold text-gray-800">
                  ORDEN: {receiptModal.order.displayId}
                </div>
              </div>

              <div className="border-t border-b border-dashed border-stone-300 py-4 mb-4 space-y-1">
                <p className="text-sm text-gray-800"><strong className="text-gray-500">Fecha:</strong> {new Date(receiptModal.order.date).toLocaleString()}</p>
                <p className="text-sm text-gray-800"><strong className="text-gray-500">Cliente:</strong> {receiptModal.order.customerName}</p>
                <p className="text-sm text-gray-800"><strong className="text-gray-500">Teléfono:</strong> {receiptModal.order.phone}</p>
                <p className="text-sm text-gray-800"><strong className="text-gray-500">Dirección:</strong> {receiptModal.order.address}</p>
              </div>

              {receiptModal.order.notes && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-4">
                  <p className="text-xs font-bold text-red-800 mb-1 uppercase">📝 Dedicatoria / Notas:</p>
                  <p className="text-sm text-gray-800 italic">"{receiptModal.order.notes}"</p>
                </div>
              )}

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase text-xs">
                    <th className="text-left py-2 font-medium">Cant.</th>
                    <th className="text-left py-2 font-medium">Producto</th>
                    <th className="text-right py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {receiptModal.order.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 font-bold text-gray-700">{item.quantity}</td>
                      <td className="py-3 text-gray-800 pr-2">{item.name}</td>
                      <td className="text-right py-3 font-bold text-gray-800">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right border-t border-stone-300 pt-4 mb-6">
                <p className="text-sm text-stone-500 mb-1">Total a Pagar</p>
                <p className="font-black text-3xl text-gray-900">${receiptModal.order.totalUSD.toFixed(2)}</p>
                <p className="text-sm font-bold text-stone-500 mt-1">Bs. {(receiptModal.order.totalUSD * bcvRate).toFixed(2)}</p>
              </div>

              <div className="text-center mt-8 text-xs text-stone-400">
                <p>¡Gracias por preferir a Decomer Frutas!</p>
                <p className="mt-1">Instagram: @decomerfrutas</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-stone-100 bg-stone-50 print:hidden shrink-0">
              <button onClick={() => window.print()} className="w-full bg-stone-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Printer className="w-5 h-5" /> Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal.isOpen && orders.find((o: any) => o.id === paymentModal.orderId) && (() => {
        const activeOrder = orders.find((o: any) => o.id === paymentModal.orderId);
        const totalPaid = (activeOrder.payments || []).reduce((sum: number, p: any) => sum + p.amountUSD, 0);
        const balance = activeOrder.totalUSD - totalPaid;

        return (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Registrar Pago</h3>
              <button onClick={() => setPaymentModal({ isOpen: false, orderId: null })} className="text-stone-400 hover:text-gray-800"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="mb-4 bg-stone-50 p-3 rounded-lg border border-stone-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-stone-500">Deuda Restante</p>
                  <p className="text-xl font-bold text-red-600">${balance.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-500">Equivalente BCV</p>
                  <p className="text-xl font-bold text-blue-600">Bs. {(balance * bcvRate).toFixed(2)}</p>
                </div>
              </div>
              
              {activeOrder.payments?.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-gray-700 uppercase">Pagos Registrados:</p>
                  {activeOrder.payments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-green-50 border border-green-100 p-2 rounded text-sm">
                      <div>
                        <span className="font-bold text-green-800">${p.amountUSD.toFixed(2)}</span>
                        <span className="text-green-700 ml-2 text-xs">{p.method}</span>
                      </div>
                      <span className="text-xs text-green-600">Ref: {p.reference}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {balance > 0 && (
              <form id="admin-payment-form" onSubmit={handleRegisterPayment} className="space-y-4 border-t border-stone-100 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pago</label>
                    <select required value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Transferencia Bs">Transferencia Bs</option>
                      <option value="Zelle">Zelle (USD)</option>
                      <option value="Zinli">Zinli (USD)</option>
                      <option value="Binance">Binance Pay (USDT)</option>
                      <option value="Efectivo Divisas">Efectivo Divisas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monto Pagado (USD)</label>
                    <input required type="number" step="0.01" max={balance} value={paymentForm.amountUSD} onChange={e => setPaymentForm({...paymentForm, amountUSD: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                    {(paymentForm.method === 'Pago Móvil' || paymentForm.method === 'Transferencia Bs') && paymentForm.amountUSD && (
                      <p className="text-[11px] text-blue-600 font-bold mt-1 bg-blue-50 px-2 py-1 rounded">Equivalente: Bs. {(parseFloat(paymentForm.amountUSD as string) * bcvRate).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {paymentForm.method !== 'Efectivo Divisas' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
                    <input required type="text" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="Ej: 00123445" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                  </div>
                )}

                {(paymentForm.method === 'Pago Móvil' || paymentForm.method === 'Transferencia Bs') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Banco Origen</label>
                      <select required value={paymentForm.bank} onChange={e => setPaymentForm({...paymentForm, bank: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                        {VENEZUELAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                      <input required type="tel" value={paymentForm.phone} onChange={e => setPaymentForm({...paymentForm, phone: e.target.value})} placeholder="Ej: 04141234567" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                    </div>
                  </div>
                )}
              </form>
              )}
            </div>
            {balance > 0 && (
            <div className="p-5 border-t border-stone-100 bg-white shrink-0">
              <button form="admin-payment-form" type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2 text-sm">
                Añadir Pago a la Orden
              </button>
            </div>
            )}
          </div>
        </div>
        );
      })()}

      {viewPaymentsModal.isOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="text-lg font-bold text-gray-800">Historial de Pagos</h3>
              <button onClick={() => setViewPaymentsModal({ isOpen: false, order: null })} className="text-stone-400 hover:text-gray-800"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="space-y-3">
                {viewPaymentsModal.order.payments?.map((p: any, i: number) => (
                  <div key={i} className="p-3 border border-stone-200 rounded-lg bg-stone-50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-gray-800">{p.method}</span>
                      <span className="font-bold text-green-600">${p.amountUSD.toFixed(2)}</span>
                    </div>
                    {p.reference && <p className="text-xs text-stone-500">Ref: {p.reference}</p>}
                    {p.details && <p className="text-xs text-stone-500">{p.details}</p>}
                    <p className="text-[10px] text-stone-400 mt-1">{new Date(p.date).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isManualOrderOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Crear Pedido Manual</h3>
              <button onClick={() => setIsManualOrderOpen(false)} className="text-stone-400 hover:text-gray-800"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-grow">
              <form id="manual-order-form" onSubmit={handleCreateManualOrder} className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-4 h-4"/> Datos del Cliente</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                      <input required type="text" value={manualOrder.customerName} onChange={e => setManualOrder({...manualOrder, customerName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                      <input type="tel" value={manualOrder.phone} onChange={e => setManualOrder({...manualOrder, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4"/> Productos</h4>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4 items-end">
                    <div className="flex-1 w-full">
                      <select value={manualProduct} onChange={e => setManualProduct(e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                        <option value="">Selecciona un producto...</option>
                        {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
                      </select>
                    </div>
                    <div className="w-full sm:w-20">
                      <input type="number" min="1" value={manualQty} onChange={e => setManualQty(e.target.value)} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-xs" />
                    </div>
                    <button type="button" onClick={handleAddManualItem} className="w-full sm:w-auto bg-stone-800 hover:bg-stone-900 text-white px-3 py-2 rounded-lg text-xs font-bold h-[34px]">Añadir</button>
                  </div>
                  
                  {manualOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-stone-200 p-2 rounded-lg text-sm mb-2">
                      <div><span className="font-bold text-gray-800">{item.quantity}x</span> {item.name}</div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-600">${(item.price * item.quantity).toFixed(2)}</span>
                        <button type="button" onClick={() => handleRemoveManualItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-stone-100 bg-white shrink-0 flex gap-3">
              <button form="manual-order-form" type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Crear Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminProducts({ products, categories }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({ id: '', name: '', price: '', image: '', description: '', categoryId: '' });
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!IMGBB_API_KEY || IMGBB_API_KEY.includes('PEGAR_AQUI')) {
      alert("Por favor, pon tu API Key de ImgBB en el código primero.");
      return;
    }

    setUploadProgress(10); 
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      setUploadProgress(60); 
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentProduct({...currentProduct, image: data.data.url});
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 1500);
      } else {
        alert("Error al subir imagen. Revisa tu API Key de ImgBB.");
        setUploadProgress(0);
      }
    } catch (error) {
      console.error("Error upload:", error);
      alert("Error de conexión al subir la imagen.");
      setUploadProgress(0);
    }
  };

  const handleSaveProduct = async (e: any) => {
    e.preventDefault();
    const productData = { 
      name: currentProduct.name,
      price: parseFloat(currentProduct.price),
      image: currentProduct.image,
      description: currentProduct.description,
      categoryId: currentProduct.categoryId
    };
    
    if (currentProduct.id) {
      await updateDoc(doc(db, 'products', currentProduct.id), productData);
    } else {
      await addDoc(collection(db, 'products'), productData);
    }
    setIsEditing(false);
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('¿Seguro que deseas eliminar este producto?')) await deleteDoc(doc(db, 'products', id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catálogo de Productos</h2>
          <p className="text-stone-500">Añade o edita tus arreglos</p>
        </div>
        <button onClick={() => { setCurrentProduct({ id: '', name: '', price: '', image: '', description: '', categoryId: categories[0]?.id || '' }); setIsEditing(true); }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {isEditing && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input required type="text" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio (USD)</label>
              <input required type="number" step="0.01" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select required value={currentProduct.categoryId} onChange={e => setCurrentProduct({...currentProduct, categoryId: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm bg-white">
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <label className="block text-sm font-bold text-gray-700 mb-1">Imagen del Producto (Alojamiento Gratuito)</label>
              
              <div className="mb-2">
                <label className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold py-2 px-4 rounded cursor-pointer transition-colors inline-block">
                  + Subir Foto
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {uploadProgress > 0 && <span className="text-xs text-blue-600 ml-2 font-bold">Procesando... {Math.round(uploadProgress)}%</span>}
              </div>

              <input required type="url" placeholder="URL generada de ImgBB..." value={currentProduct.image} onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm bg-white text-stone-500" />
              {currentProduct.image && <img src={currentProduct.image} alt="Preview" className="h-16 mt-2 rounded object-cover" />}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea required value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" rows={2} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Guardar Producto</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 text-stone-600 text-sm border-b border-stone-100">
              <th className="p-4 font-medium">Producto</th>
              <th className="p-4 font-medium">Precio</th>
              <th className="p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {products.map((product: any) => (
              <tr key={product.id}>
                <td className="p-4 flex items-center gap-3">
                  <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0" />
                  <span className="font-medium text-gray-800 text-sm">{product.name}</span>
                </td>
                <td className="p-4 text-sm font-semibold text-gray-800">${parseFloat(product.price).toFixed(2)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => {setCurrentProduct(product); setIsEditing(true);}} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg mr-1"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCategories({ categories }: any) {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = async (e: any) => {
    e.preventDefault();
    if(newCategory.trim()) {
      await addDoc(collection(db, 'categories'), { name: newCategory.trim() });
      setNewCategory('');
    }
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('¿Eliminar esta categoría?')) await deleteDoc(doc(db, 'categories', id));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h2 className="text-2xl font-bold text-gray-800">Categorías</h2></div>
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input required type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nombre..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">Agregar</button>
        </form>
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {categories.map((cat: any) => (
            <li key={cat.id} className="py-3 flex justify-between items-center group">
              <span className="font-medium text-gray-700 flex items-center gap-2"><Tag className="w-4 h-4 text-stone-400" /> {cat.name}</span>
              <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AdminMessages() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 h-[calc(100vh-10rem)] min-h-[500px] flex items-center justify-center text-stone-400">
      <div className="text-center">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p>El módulo de mensajería omnicanal estará activo tras conectar las APIs de Meta.</p>
      </div>
    </div>
  );
}

function ClientStorefront({ products, categories, cart, setCart, user, bcvRate }: any) {
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState(''); // ESTADO PARA LA BARRA DE BÚSQUEDA
  const [showToast, setShowToast] = useState(false); // ESTADO PARA EL CARTEL DE FEEDBACK
  
  const [deliveryInfo, setDeliveryInfo] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '', notes: '' });
  const [clientPayments, setClientPayments] = useState<any[]>([]);
  const [currentPayment, setCurrentPayment] = useState({ method: 'Zelle', reference: '', amountUSD: '' as string | number, bank: VENEZUELAN_BANKS[0], phone: '' });

  const addToCart = (product: any) => {
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) setCart(cart.map((item: any) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    else setCart([...cart, { ...product, quantity: 1 }]);
    
    // MOSTRAR TOAST FEEDBACK
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const updateQuantity = (id: string, delta: number) => setCart(cart.map((item: any) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item: any) => item.quantity > 0));
  
  const totalUSD = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const totalPaidUSD = clientPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amountUSD), 0);
  const balanceUSD = totalUSD - totalPaidUSD;

  const handleAddPayment = () => {
    const amount = parseFloat(currentPayment.amountUSD as string);
    if (!amount || amount <= 0) return alert("Monto inválido");
    if (amount > balanceUSD + 0.01) return alert("Supera la deuda");
    
    setClientPayments([...clientPayments, { 
      ...currentPayment, 
      amountUSD: amount,
      details: (currentPayment.method === 'Pago Móvil' || currentPayment.method === 'Transferencia Bs') ? `Banco: ${currentPayment.bank} - Tlf: ${currentPayment.phone}` : ''
    }]);
    setCurrentPayment({ method: 'Zelle', reference: '', amountUSD: '', bank: VENEZUELAN_BANKS[0], phone: '' });
  };

  const handleCheckout = async (e: any) => {
    e.preventDefault();
    const phone = "584122190994";
    const orderDisplayId = `PED-${Math.floor(Math.random() * 10000)}`;
    
    await addDoc(collection(db, 'orders'), {
      displayId: orderDisplayId,
      customerName: deliveryInfo.name,
      items: cart,
      totalUSD: totalUSD,
      status: clientPayments.length > 0 ? (totalPaidUSD >= totalUSD ? 'Pagado' : 'Abonado') : 'Pendiente',
      payments: clientPayments.map(p => ({ ...p, date: new Date().toISOString() })),
      date: new Date().toISOString(),
      phone: deliveryInfo.phone,
      address: deliveryInfo.address,
      notes: deliveryInfo.notes
    });

    let text = `*¡Hola! Nuevo Pedido en Decomer Frutas* 🍓🍫\n\n*Orden:* #${orderDisplayId}\n*Mis Datos:*\n👤 Nombre: ${deliveryInfo.name}\n📱 Teléfono: ${deliveryInfo.phone}\n📍 Dirección: ${deliveryInfo.address}\n`;
    if(deliveryInfo.notes) text += `📝 Notas: ${deliveryInfo.notes}\n`;
    text += `\n*Mi Pedido:*\n`;
    cart.forEach((item: any) => { text += `▪️ ${item.quantity}x ${item.name} ($${parseFloat(item.price).toFixed(2)})\n`; });
    text += `\n*Total:* $${totalUSD.toFixed(2)} (Bs. ${(totalUSD * bcvRate).toFixed(2)})\n`;
    
    text += `\n*Pagos:*\n`;
    if (clientPayments.length === 0) text += `▪️ Pago pendiente\n`;
    else {
       clientPayments.forEach(p => { text += `▪️ ${p.method}: $${p.amountUSD.toFixed(2)} ${p.reference ? `(Ref: ${p.reference})` : ''}\n`; });
       if (balanceUSD > 0) text += `*Resta:* $${balanceUSD.toFixed(2)}\n`;
       else text += `*Estado:* Pagado ✅\n`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    setCart([]); setClientPayments([]); setCheckoutStep(false);
  };

  // FILTRO DOBLE: POR CATEGORÍA Y POR BÚSQUEDA
  const filteredProducts = products.filter((p: any) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-fade-in relative">
      
      {/* BOTÓN FLOTANTE WHATSAPP DE ATENCIÓN */}
      <a 
        href="https://wa.me/584122190994?text=Hola,%20necesito%20ayuda%20con%20un%20pedido%20en%20la%20página%20web" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1ebd5a] transition-transform hover:scale-110 z-40 flex items-center justify-center print:hidden group"
        title="Atención al Cliente por WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute right-full mr-3 bg-white text-stone-800 text-sm px-3 py-1.5 rounded-lg shadow-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          ¿Necesitas ayuda?
        </span>
      </a>

      {/* TOAST DE FEEDBACK AL AGREGAR AL CARRITO */}
      <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-stone-900/95 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 pointer-events-none ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="font-medium text-sm">Agregado al carrito</span>
      </div>

      <div className="flex-1">
        
        {/* HERO BANNER - Da una bienvenida visual atractiva */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl p-8 sm:p-10 text-white mb-8 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-5xl font-black mb-3 font-serif drop-shadow-md">Regala dulzura y amor</h1>
            <p className="text-red-50 text-base sm:text-lg max-w-lg leading-relaxed drop-shadow-sm font-medium">
              Descubre nuestros hermosos arreglos frutales, fresas con chocolate y desayunos sorpresa ideales para esa persona especial. 🍓🍫
            </p>
          </div>
          {/* Decoración de fondo en el banner */}
          <Heart className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          {/* CATEGORÍAS */}
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full md:w-auto flex-1">
            <button onClick={() => setSelectedCategory('all')} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${selectedCategory === 'all' ? 'bg-red-600 text-white scale-105' : 'bg-white text-stone-600 hover:bg-red-50 hover:text-red-600'}`}>Todos</button>
            {categories.map((cat: any) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm whitespace-nowrap ${selectedCategory === cat.id ? 'bg-red-600 text-white scale-105' : 'bg-white text-stone-600 hover:bg-red-50 hover:text-red-600'}`}>{cat.name}</button>
            ))}
          </div>

          {/* BARRA DE BÚSQUEDA */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-5 h-5 absolute left-4 top-3 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar arreglos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-stone-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition-shadow placeholder:text-stone-400 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product: any) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-stone-100 overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1">
              <div className="h-56 bg-stone-100 overflow-hidden relative">
                <img src={product.image} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" alt={product.name} />
                {/* Etiqueta de "Favorito" o "Más vendido" estético */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-red-600 text-xs font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" /> Decomer
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-red-600 transition-colors">{product.name}</h3>
                <p className="text-stone-500 text-sm mb-4 mt-1 flex-grow line-clamp-2 leading-relaxed">{product.description}</p>
                <div className="flex items-end justify-between mt-auto pt-4 border-t border-stone-100">
                  <div>
                    <div className="text-2xl font-black text-gray-900">${parseFloat(product.price).toFixed(2)}</div>
                    <div className="text-xs text-stone-500 font-medium">Bs. {(product.price * bcvRate).toFixed(2)}</div>
                  </div>
                  <button onClick={() => addToCart(product)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-3.5 rounded-xl transition-colors shadow-sm hover:shadow-md hover:scale-105 active:scale-95">
                    <Plus className="w-5 h-5 font-bold" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="col-span-full py-12 text-center text-stone-500 font-medium">Catálogo vacío. El administrador debe agregar productos.</p>}
          {products.length > 0 && filteredProducts.length === 0 && (
            <p className="col-span-full py-12 text-center text-stone-500 font-medium flex flex-col items-center">
              <Search className="w-12 h-12 text-stone-300 mb-3" />
              No encontramos arreglos con esa búsqueda. ¡Prueba otro nombre!
            </p>
          )}
        </div>
      </div>

      {/* CARRITO LATERAL */}
      <div id="cart-section" className="w-full lg:w-[400px] shrink-0">
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Mi Pedido</h3>
            <span className="bg-stone-800 text-stone-300 text-xs font-bold px-2 py-1 rounded-md">{cart.reduce((a,c)=>a+c.quantity,0)} items</span>
          </div>
          
          <div className="p-6 flex-grow overflow-y-auto bg-stone-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 py-10 opacity-70">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="font-medium text-center">Tu carrito está vacío.<br/>¡Anímate a agregar algo dulce!</p>
              </div>
            ) : (
              cart.map((item: any) => (
                <div key={item.id} className="flex gap-4 items-center mb-5 bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
                  <img src={item.image} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                    <p className="text-red-600 font-black text-sm mt-0.5">${parseFloat(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center bg-stone-100 rounded-lg p-1 border border-stone-200 shadow-inner">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-md hover:shadow-sm font-bold transition-all">-</button>
                      <span className="w-6 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-md hover:shadow-sm font-bold transition-all">+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-stone-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
              <div className="flex justify-between items-end mb-4">
                <span className="text-stone-500 font-medium">Total Estimado</span>
                <div className="text-right">
                  <div className="text-2xl font-black text-gray-900">${totalUSD.toFixed(2)}</div>
                  <div className="text-xs font-bold text-stone-400">Bs. {(totalUSD * bcvRate).toFixed(2)}</div>
                </div>
              </div>
              <button onClick={() => setCheckoutStep(true)} className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-[#25D366]/30 flex items-center justify-center gap-2 text-lg">
                <ShoppingCart className="w-5 h-5" /> Ir a Pagar
              </button>
            </div>
          )}
        </div>
      </div>

      {checkoutStep && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-gray-800">Finalizar Pedido</h3>
                <p className="text-xs text-stone-500 font-medium mt-1">Completa tus datos para enviarlos por WhatsApp</p>
              </div>
              <button onClick={() => setCheckoutStep(false)} className="bg-stone-200 hover:bg-stone-300 p-2 rounded-full text-stone-600 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto bg-white">
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800"><MapPin className="w-4 h-4 text-red-500"/> Datos de Entrega</h4>
                  <div className="space-y-3">
                    <input required type="text" placeholder="Nombre de quien recibe" value={deliveryInfo.name} onChange={e=>setDeliveryInfo({...deliveryInfo, name:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"/>
                    <input required type="tel" placeholder="Teléfono de contacto" value={deliveryInfo.phone} onChange={e=>setDeliveryInfo({...deliveryInfo, phone:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"/>
                    <textarea required placeholder="Dirección exacta de entrega" rows={2} value={deliveryInfo.address} onChange={e=>setDeliveryInfo({...deliveryInfo, address:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"/>
                    <textarea placeholder="Mensaje para la dedicatoria o notas adicionales (Opcional)" rows={2} value={deliveryInfo.notes} onChange={e=>setDeliveryInfo({...deliveryInfo, notes:e.target.value})} className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none bg-red-50/50"/>
                  </div>
                </div>

                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 shadow-inner">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-gray-800"><CreditCard className="w-4 h-4 text-blue-500"/> Registro de Pago <span className="text-xs font-normal text-stone-500">(Puedes pagar ahora o al recibir)</span></h4>
                  {balanceUSD > 0 && (
                    <div className="space-y-3">
                      <select value={currentPayment.method} onChange={e=>setCurrentPayment({...currentPayment, method:e.target.value})} className="w-full px-3 py-3 border border-stone-200 rounded-xl text-sm bg-white font-medium outline-none">
                        <option value="Zelle">Pago con Zelle</option><option value="Pago Móvil">Pago Móvil</option><option value="Efectivo Divisas">Efectivo (Dólares)</option>
                      </select>
                      <input type="number" step="0.01" max={balanceUSD} placeholder={`Monto a registrar (Deuda actual: $${balanceUSD.toFixed(2)})`} value={currentPayment.amountUSD} onChange={e=>setCurrentPayment({...currentPayment, amountUSD:e.target.value})} className="w-full px-3 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                      {currentPayment.method === 'Pago Móvil' && currentPayment.amountUSD && <p className="text-[11px] text-blue-600 font-bold bg-blue-50 p-2 rounded-lg border border-blue-100">Equivalente a transferir: Bs. {(parseFloat(currentPayment.amountUSD as string) * bcvRate).toFixed(2)}</p>}
                      <button type="button" onClick={handleAddPayment} className="w-full bg-stone-800 hover:bg-black text-white text-sm py-3 rounded-xl font-bold transition-colors">Añadir este pago</button>
                    </div>
                  )}
                  {clientPayments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-bold text-stone-500 uppercase">Pagos añadidos a esta orden:</p>
                      {clientPayments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-green-50 rounded-xl text-sm text-green-900 border border-green-200 font-medium">
                          <span>${p.amountUSD} en {p.method}</span>
                          <button type="button" onClick={() => setClientPayments(clientPayments.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 bg-white p-1 rounded-md shadow-sm"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 bg-white shrink-0">
              <button form="checkout-form" type="submit" className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-[#25D366]/40 transition-all hover:-translate-y-1">
                <Send className="w-5 h-5" /> Enviar Pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}