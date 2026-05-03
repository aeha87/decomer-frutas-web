import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { 
  ShoppingCart, User, Lock, Mail, Phone, MapPin, Plus, Trash2, Edit, LogOut, Instagram, Image as ImageIcon,
  CheckCircle, Menu, X, Package, TrendingUp, DollarSign, List, Tag, ShoppingBag, CreditCard, Activity, Calendar, Filter, MessageSquare, Send, Video
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bcvRate, setBcvRate] = useState(36.50);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('login');

  // Consulta automática de la Tasa BCV oficial
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

  // --- ESCUCHA DE AUTENTICACIÓN FIREBASE ---
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
        setView('login');
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- SINCRONIZACIÓN DE BASE DE DATOS EN TIEMPO REAL ---
  useEffect(() => {
    if (!currentUser) return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    let unsubOrders = () => {};
    if (currentUser.role === 'admin') {
      unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
        // Ordenar pedidos por fecha (más recientes primero)
        const sortedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
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
      <Navbar user={currentUser} onLogout={handleLogout} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} bcvRate={bcvRate} setBcvRate={setBcvRate} />
      <main className="flex-grow container mx-auto px-4 py-8">
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

// --- COMPONENTES DE AUTENTICACIÓN ---
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
          // Cualquier correo con "admin" será administrador, sino cliente normal
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
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-wider font-serif">Decomer Frutas</h1>
          <p className="text-red-100 mt-2">Arreglos, chocolates y detalles</p>
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
                <input required type="text" name="name" placeholder="Nombre completo" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input required type="email" name="email" placeholder="Correo electrónico" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input required type="password" name="password" placeholder="Contraseña" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" />
            </div>

            {view === 'register' && (
              <>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input required type="tel" name="phone" placeholder="Teléfono" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input required type="text" name="address" placeholder="Dirección predeterminada" onChange={handleChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" />
                </div>
              </>
            )}

            <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-200 mt-6">
              {isLoading ? 'Cargando...' : (view === 'login' ? 'Ingresar' : 'Registrarme')}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            {view === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button onClick={() => {setView(view === 'login' ? 'register' : 'login'); setErrorMsg('');}} className="ml-2 text-red-600 font-semibold hover:underline">
              {view === 'login' ? 'Regístrate' : 'Inicia Sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// --- BARRA DE NAVEGACIÓN Y FOOTER ---
function Navbar({ user, onLogout, cartCount, bcvRate, setBcvRate }) {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-md">
            <span className="font-serif font-bold text-xl">D</span>
          </div>
          <span className="text-2xl font-bold text-red-600 font-serif hidden sm:block">Decomer Frutas</span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden lg:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-800">Tasa BCV:</span>
            {user?.role === 'admin' ? (
              <input type="number" step="0.01" value={bcvRate} onChange={(e) => setBcvRate(Number(e.target.value))} className="w-16 text-xs px-1 border-b border-green-300 bg-transparent outline-none font-bold text-green-900" />
            ) : (
              <span className="text-xs font-bold text-green-900">Bs. {bcvRate}</span>
            )}
          </div>

          <div className="text-sm text-gray-600 hidden md:block">
            Hola, <span className="font-semibold text-gray-800">{user?.name || user?.email.split('@')[0]}</span>
            <span className="ml-2 px-2 py-1 bg-stone-100 rounded-full text-xs text-stone-500 border border-stone-200">
              {user?.role === 'admin' ? 'Admin' : 'Cliente'}
            </span>
          </div>

          {user?.role === 'client' && (
            <div className="relative text-stone-600 hover:text-red-600 transition-colors cursor-pointer" onClick={() => document.getElementById('cart-section')?.scrollIntoView({behavior: 'smooth'})}>
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
          )}

          <button onClick={onLogout} className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:block text-sm font-medium">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 py-8 text-center mt-auto">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-4">
        <p className="font-serif text-xl text-white">Decomer Frutas</p>
        <p className="text-sm max-w-md">Especialistas en arreglos frutales, fresas con chocolate y desayunos sorpresa. ¡Endulzamos tus mejores momentos!</p>
        <a href="https://www.instagram.com/decomerfrutas/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors mt-2">
          <Instagram className="w-5 h-5" />
          <span>@decomerfrutas</span>
        </a>
      </div>
    </footer>
  );
}

// --- VISTA ADMINISTRATIVO ---
function AdminDashboard({ products, categories, orders, bcvRate }) {
  const [activeTab, setActiveTab] = useState('kpis');

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 shrink-0">
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
        {activeTab === 'products' && <AdminProducts products={products} categories={categories} bcvRate={bcvRate} />}
        {activeTab === 'categories' && <AdminCategories categories={categories} />}
        {activeTab === 'messages' && <AdminMessages />}
      </div>
    </div>
  );
}

function AdminKPIs({ orders, bcvRate }) {
  const totalVentasUSD = orders.filter(o => o.status !== 'Cancelado').reduce((sum, o) => sum + o.totalUSD, 0);
  const totalVentasBs = totalVentasUSD * bcvRate;
  const pedidosPendientes = orders.filter(o => o.status === 'Pendiente').length;

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

function AdminOrders({ orders, bcvRate, products }) {
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, orderId: null });
  const [paymentForm, setPaymentForm] = useState({ method: 'Pago Móvil', reference: '', phone: '', bank: VENEZUELAN_BANKS[0], amountUSD: '' });
  const [viewPaymentsModal, setViewPaymentsModal] = useState({ isOpen: false, order: null });

  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualOrder, setManualOrder] = useState({ customerName: '', phone: '', address: '', notes: '', items: [] });
  const [manualProduct, setManualProduct] = useState('');
  const [manualQty, setManualQty] = useState(1);

  const handleStatusChange = async (id, newStatus) => {
    await updateDoc(doc(db, 'orders', id), { status: newStatus });
  };

  const openPaymentModal = (order) => {
    const totalPaid = (order.payments || []).reduce((sum, p) => sum + p.amountUSD, 0);
    const balance = order.totalUSD - totalPaid;
    setPaymentForm({ method: 'Pago Móvil', reference: '', phone: '', bank: VENEZUELAN_BANKS[0], amountUSD: balance > 0 ? balance : 0 });
    setPaymentModal({ isOpen: true, orderId: order.id });
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const order = orders.find(o => o.id === paymentModal.orderId);
    if (!order) return;

    const newPayment = {
      method: paymentForm.method,
      reference: paymentForm.reference,
      amountUSD: parseFloat(paymentForm.amountUSD),
      details: (paymentForm.method === 'Pago Móvil' || paymentForm.method === 'Transferencia Bs') 
               ? `Origen: ${paymentForm.bank} - Tlf: ${paymentForm.phone}` 
               : (paymentForm.bank && ['Zelle', 'Zinli', 'Binance'].includes(paymentForm.method) ? `Origen: ${paymentForm.bank}` : ''),
      date: new Date().toISOString()
    };
    
    const updatedPayments = [...(order.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amountUSD, 0);
    
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
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingIndex = manualOrder.items.findIndex(i => i.id === product.id);
    let newItems = [...manualOrder.items];
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += parseInt(manualQty);
    } else {
      newItems.push({ ...product, quantity: parseInt(manualQty) });
    }
    setManualOrder({ ...manualOrder, items: newItems });
    setManualQty(1);
  };

  const handleCreateManualOrder = async (e) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Control de Pedidos</h2>
          <p className="text-stone-500">Gestiona y cruza pagos con pedidos</p>
        </div>
        <button onClick={() => setIsManualOrderOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Nuevo Pedido Manual
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-x-auto">
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
            {orders.map(order => {
              const totalPaid = (order.payments || []).reduce((sum, p) => sum + p.amountUSD, 0);
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
                <td className="p-4">
                  <select 
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`text-sm font-medium px-2.5 py-1 rounded-lg border-0 outline-none cursor-pointer ${getStatusColor(order.status)}`}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Abonado">Abonado</option>
                    <option value="Pagado">Pagado</option>
                    <option value="En Preparación">En Preparación</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </td>
              </tr>
            )})}
            {orders.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-stone-500">No hay pedidos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Pasarela de Pagos Administrativa */}
      {paymentModal.isOpen && orders.find(o => o.id === paymentModal.orderId) && (() => {
        const activeOrder = orders.find(o => o.id === paymentModal.orderId);
        const totalPaid = (activeOrder.payments || []).reduce((sum, p) => sum + p.amountUSD, 0);
        const balance = activeOrder.totalUSD - totalPaid;

        return (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
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
                  {activeOrder.payments.map((p, i) => (
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
                      <p className="text-[11px] text-blue-600 font-bold mt-1 bg-blue-50 px-2 py-1 rounded">Equivalente: Bs. {(parseFloat(paymentForm.amountUSD) * bcvRate).toFixed(2)}</p>
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

      {isManualOrderOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
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
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
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

function AdminProducts({ products, categories, bcvRate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({ name: '', price: '', image: '', description: '', categoryId: '' });

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const productData = { ...currentProduct, price: parseFloat(currentProduct.price) };
    if (currentProduct.id) {
      await updateDoc(doc(db, 'products', currentProduct.id), productData);
    } else {
      await addDoc(collection(db, 'products'), productData);
    }
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar este producto?')) await deleteDoc(doc(db, 'products', id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catálogo de Productos</h2>
          <p className="text-stone-500">Añade o edita tus arreglos</p>
        </div>
        <button onClick={() => { setCurrentProduct({ name: '', price: '', image: '', description: '', categoryId: categories[0]?.id || '' }); setIsEditing(true); }}
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
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Imagen</label>
              <input required type="url" value={currentProduct.image} onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea required value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm" rows="2" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Guardar</button>
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
            {products.map(product => (
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
    <div className="space-y-6 max-w-2xl">
      <div><h2 className="text-2xl font-bold text-gray-800">Categorías</h2></div>
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input required type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nombre..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">Agregar</button>
        </form>
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {categories.map(cat => (
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

// Simulación de mensajes (Igual que antes)
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

// --- VISTA CLIENTE ---
function ClientStorefront({ products, categories, cart, setCart, user, bcvRate }) {
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deliveryInfo, setDeliveryInfo] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '', notes: '' });
  const [clientPayments, setClientPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({ method: 'Zelle', reference: '', amountUSD: '', bank: VENEZUELAN_BANKS[0], phone: '' });

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    else setCart([...cart, { ...product, quantity: 1 }]);
  };

  const updateQuantity = (id, delta) => setCart(cart.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0));
  
  const totalUSD = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalPaidUSD = clientPayments.reduce((sum, p) => sum + parseFloat(p.amountUSD), 0);
  const balanceUSD = totalUSD - totalPaidUSD;

  const handleAddPayment = () => {
    const amount = parseFloat(currentPayment.amountUSD);
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
    const phone = "584122190994";
    const orderDisplayId = `PED-${Math.floor(Math.random() * 10000)}`;
    
    // GUARDAR EN FIREBASE
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

    // GENERAR MENSAJE WHATSAPP
    let text = `*¡Hola! Nuevo Pedido en Decomer Frutas* 🍓🍫\n\n*Orden:* #${orderDisplayId}\n*Mis Datos:*\n👤 Nombre: ${deliveryInfo.name}\n📱 Teléfono: ${deliveryInfo.phone}\n📍 Dirección: ${deliveryInfo.address}\n`;
    if(deliveryInfo.notes) text += `📝 Notas: ${deliveryInfo.notes}\n`;
    text += `\n*Mi Pedido:*\n`;
    cart.forEach(item => { text += `▪️ ${item.quantity}x ${item.name} ($${parseFloat(item.price).toFixed(2)})\n`; });
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

  const filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.categoryId === selectedCategory);

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-fade-in relative">
      <div className="flex-1">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 font-serif">Nuestro Catálogo</h2>
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
          <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedCategory === 'all' ? 'bg-red-600 text-white' : 'bg-white text-stone-600'}`}>Todos</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedCategory === cat.id ? 'bg-red-600 text-white' : 'bg-white text-stone-600'}`}>{cat.name}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col">
              <div className="h-48 bg-stone-100"><img src={product.image} className="w-full h-full object-cover" /></div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
                <p className="text-stone-500 text-sm mb-4 flex-grow line-clamp-2">{product.description}</p>
                <div className="flex items-end justify-between mt-auto pt-4 border-t border-stone-100">
                  <div>
                    <div className="text-2xl font-black text-red-600">${parseFloat(product.price).toFixed(2)}</div>
                    <div className="text-xs text-stone-400">Bs. {(product.price * bcvRate).toFixed(2)}</div>
                  </div>
                  <button onClick={() => addToCart(product)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-3 rounded-xl"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="col-span-full py-12 text-center text-stone-500">Catálogo vacío. El administrador debe agregar productos.</p>}
        </div>
      </div>

      {/* Carrito Resumen */}
      <div id="cart-section" className="w-full lg:w-96 shrink-0">
        <div className="bg-white rounded-2xl shadow-md border border-stone-100 sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="bg-stone-900 p-5 text-white flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Mi Pedido</h3>
          </div>
          <div className="p-5 flex-grow overflow-y-auto">
            {cart.map(item => (
              <div key={item.id} className="flex gap-3 items-center mb-4">
                <img src={item.image} className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-800">{item.name}</h4>
                  <p className="text-red-600 font-bold text-sm">${parseFloat(item.price).toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center bg-stone-100 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 text-stone-500">-</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 text-stone-500">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="p-5 bg-stone-50 border-t border-stone-100">
              <button onClick={() => setCheckoutStep(true)} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl">Procesar Compra</button>
            </div>
          )}
        </div>
      </div>

      {checkoutStep && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b bg-stone-50 flex justify-between"><h3 className="font-bold">Finalizar</h3><button onClick={() => setCheckoutStep(false)}><X/></button></div>
            <div className="p-5 overflow-y-auto">
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold mb-3">Datos de Entrega</h4>
                  <input required type="text" placeholder="Nombre" value={deliveryInfo.name} onChange={e=>setDeliveryInfo({...deliveryInfo, name:e.target.value})} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"/>
                  <input required type="tel" placeholder="Teléfono" value={deliveryInfo.phone} onChange={e=>setDeliveryInfo({...deliveryInfo, phone:e.target.value})} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"/>
                  <textarea required placeholder="Dirección" value={deliveryInfo.address} onChange={e=>setDeliveryInfo({...deliveryInfo, address:e.target.value})} className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"/>
                  <textarea placeholder="Notas / Dedicatoria" value={deliveryInfo.notes} onChange={e=>setDeliveryInfo({...deliveryInfo, notes:e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"/>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border">
                  <h4 className="text-sm font-bold mb-3">Añadir Pago</h4>
                  {balanceUSD > 0 && (
                    <div className="space-y-2">
                      <select value={currentPayment.method} onChange={e=>setCurrentPayment({...currentPayment, method:e.target.value})} className="w-full px-2 py-2 border rounded text-xs bg-white">
                        <option value="Zelle">Zelle</option><option value="Pago Móvil">Pago Móvil</option><option value="Efectivo Divisas">Efectivo Divisas</option>
                      </select>
                      <input type="number" step="0.01" max={balanceUSD} placeholder={`Monto USD (Resta $${balanceUSD})`} value={currentPayment.amountUSD} onChange={e=>setCurrentPayment({...currentPayment, amountUSD:e.target.value})} className="w-full px-2 py-2 border rounded text-xs"/>
                      {currentPayment.method === 'Pago Móvil' && currentPayment.amountUSD && <p className="text-[10px] text-blue-600 font-bold">Transferir: Bs. {(currentPayment.amountUSD * bcvRate).toFixed(2)}</p>}
                      <button type="button" onClick={handleAddPayment} className="w-full bg-stone-800 text-white text-xs py-2 rounded font-bold">Añadir Pago</button>
                    </div>
                  )}
                  {clientPayments.map((p, i) => (
                    <div key={i} className="flex justify-between mt-2 p-2 bg-green-50 rounded text-sm text-green-800 border border-green-100">
                      <span>${p.amountUSD} - {p.method}</span>
                      <button type="button" onClick={() => setClientPayments(clientPayments.filter((_, idx) => idx !== i))}>X</button>
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="p-5 border-t shrink-0">
              <button form="checkout-form" type="submit" className="w-full bg-green-500 text-white font-bold py-3 rounded-xl">Enviar Pedido al WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}