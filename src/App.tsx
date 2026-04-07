/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams 
} from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  updateDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Product, CartItem, Order, UserProfile } from './types';
import { handleFirestoreError, OperationType } from './lib/firebase-helpers';
import { cn } from './lib/utils';
import { 
  ShoppingCart, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight, 
  Package, 
  Search,
  Menu,
  X,
  Star,
  CreditCard,
  CheckCircle2,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Contexts ---

interface CartContextType {
  cart: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, profile, signIn, logout } = useAuth();
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Package className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-black">VELOCE</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Shop</Link>
            {profile?.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Admin</Link>
            )}
            <div className="h-6 w-px bg-gray-200" />
            <Link to="/cart" className="relative group">
              <ShoppingCart className="w-6 h-6 text-gray-600 group-hover:text-black transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {totalItems}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center space-x-2 group">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </Link>
                <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center space-x-4">
            <Link to="/cart" className="relative">
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-gray-900">Shop</Link>
              {profile?.role === 'admin' && (
                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-gray-900">Admin</Link>
              )}
              <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-gray-900">Profile</Link>
              {!user && (
                <button 
                  onClick={() => { signIn(); setIsMenuOpen(false); }}
                  className="w-full bg-black text-white py-3 rounded-xl font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 mb-4">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-black">
            {product.category}
          </span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product.id);
          }}
          className="absolute bottom-4 right-4 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-gray-800"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-black transition-colors">{product.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
        <p className="font-bold text-lg text-black">${product.price.toFixed(2)}</p>
      </div>
    </motion.div>
  );
};

// --- Pages ---

const HomePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight text-black">New Arrivals</h1>
            <p className="text-gray-500 max-w-md">Discover our latest collection of premium essentials designed for modern living.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-black transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                category === cat 
                  ? "bg-black text-white shadow-lg shadow-black/20" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-24">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, 'products', id);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setProduct({ id: doc.id, ...doc.data() } as Product);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `products/${id}`));

    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="text-center py-24">Product not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-500 hover:text-black mb-8 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100"
        >
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center space-y-8"
        >
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{product.category}</span>
            <h1 className="text-5xl font-bold text-black leading-tight">{product.name}</h1>
            <div className="flex items-center space-x-4">
              <p className="text-3xl font-bold text-black">${product.price.toFixed(2)}</p>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center text-yellow-400">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <span className="ml-2 text-sm font-medium text-gray-400">(124 reviews)</span>
              </div>
            </div>
          </div>

          <p className="text-lg text-gray-600 leading-relaxed">{product.description}</p>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm font-medium text-gray-500">
              <div className={cn("w-2 h-2 rounded-full", product.stock > 0 ? "bg-green-500" : "bg-red-500")} />
              <span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
            </div>
            <button 
              disabled={product.stock === 0}
              onClick={() => addToCart(product.id)}
              className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              Add to Cart
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-100">
            <div className="text-center space-y-1">
              <Package className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Free Shipping</p>
            </div>
            <div className="text-center space-y-1">
              <CreditCard className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Secure Pay</p>
            </div>
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">2 Year Warranty</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const q = collection(db, 'products');
      const snapshot = await getDocs(q);
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    };
    fetchProducts();
  }, []);

  const cartDetails = cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return product ? { ...product, quantity: item.quantity } : null;
  }).filter(Boolean) as (Product & { quantity: number })[];

  const subtotal = cartDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const total = subtotal + shipping;

  if (cart.length === 0) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShoppingCart className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-3xl font-bold text-black mb-4">Your cart is empty</h2>
      <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
      <Link to="/" className="inline-block bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors">
        Start Shopping
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-black mb-12">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cartDetails.map(item => (
            <motion.div 
              layout
              key={item.id}
              className="flex items-center space-x-6 bg-white p-4 rounded-3xl border border-gray-100"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-grow space-y-1">
                <h3 className="font-bold text-lg text-black">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category}</p>
                <p className="font-bold text-black">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex flex-col items-end space-y-4">
                <div className="flex items-center bg-gray-100 rounded-full p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-8 rounded-3xl space-y-6">
            <h2 className="text-xl font-bold text-black">Order Summary</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold text-black">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-bold text-black">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between text-lg font-bold text-black">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-black text-white py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              Checkout
            </button>
            <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please sign in to checkout');
    
    setLoading(true);
    try {
      // In a real app, this would call a Stripe backend
      // Here we just record the order in Firestore
      const orderData = {
        userId: user.uid,
        items: cart,
        status: 'pending',
        createdAt: serverTimestamp(),
        totalAmount: 0 // Should be calculated server-side
      };
      await addDoc(collection(db, 'orders'), orderData);
      
      setSuccess(true);
      clearCart();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h2 className="text-4xl font-bold text-black">Order Confirmed!</h2>
      <p className="text-gray-500">Thank you for your purchase. We've sent a confirmation email to your inbox.</p>
      <Link to="/" className="block bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800">
        Continue Shopping
      </Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-black mb-12">Checkout</h1>
      <form onSubmit={handleCheckout} className="space-y-12">
        <section className="space-y-6">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm">1</span>
            <span>Shipping Information</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="First Name" className="col-span-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black" />
            <input required placeholder="Last Name" className="col-span-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black" />
            <input required placeholder="Address" className="col-span-2 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black" />
            <input required placeholder="City" className="col-span-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black" />
            <input required placeholder="Postal Code" className="col-span-1 p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black" />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm">2</span>
            <span>Payment Details</span>
          </h2>
          <div className="p-6 border-2 border-black rounded-3xl bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CreditCard className="w-8 h-8" />
              <div>
                <p className="font-bold">Credit Card</p>
                <p className="text-xs text-gray-500">Secure encrypted payment</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="w-8 h-5 bg-gray-200 rounded" />
              <div className="w-8 h-5 bg-gray-200 rounded" />
            </div>
          </div>
        </section>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-6 rounded-3xl font-bold text-xl hover:bg-gray-800 disabled:bg-gray-400 transition-all"
        >
          {loading ? 'Processing...' : 'Complete Purchase'}
        </button>
      </form>
    </div>
  );
};

const AdminPage = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, imageUrl: '', category: '', stock: 10
  });

  useEffect(() => {
    const q = collection(db, 'products');
    return onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock)
      });
      setIsAdding(false);
      setNewProduct({ name: '', description: '', price: 0, imageUrl: '', category: '', stock: 10 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const seedSampleData = async () => {
    const samples = [
      { name: "Minimalist Watch", price: 199, category: "Accessories", imageUrl: "https://picsum.photos/seed/watch/800/1000", description: "A sleek, timeless timepiece for the modern minimalist.", stock: 50 },
      { name: "Leather Backpack", price: 250, category: "Bags", imageUrl: "https://picsum.photos/seed/bag/800/1000", description: "Handcrafted Italian leather backpack with laptop compartment.", stock: 20 },
      { name: "Noise Cancelling Headphones", price: 350, category: "Tech", imageUrl: "https://picsum.photos/seed/audio/800/1000", description: "Immersive sound quality with industry-leading noise cancellation.", stock: 15 },
      { name: "Organic Cotton Tee", price: 45, category: "Apparel", imageUrl: "https://picsum.photos/seed/shirt/800/1000", description: "Soft, breathable organic cotton for everyday comfort.", stock: 100 },
      { name: "Ceramic Coffee Set", price: 85, category: "Home", imageUrl: "https://picsum.photos/seed/coffee/800/1000", description: "Hand-thrown ceramic mugs and dripper set.", stock: 30 },
      { name: "Smart Desk Lamp", price: 120, category: "Tech", imageUrl: "https://picsum.photos/seed/lamp/800/1000", description: "Adjustable color temperature and brightness with touch controls.", stock: 40 }
    ];

    for (const s of samples) {
      await addDoc(collection(db, 'products'), s);
    }
    alert('Sample products added!');
  };

  if (profile?.role !== 'admin') return <div className="p-24 text-center">Access Denied.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-black">Inventory Management</h1>
        <div className="flex space-x-4">
          <button onClick={seedSampleData} className="px-6 py-3 border border-gray-200 rounded-2xl text-sm font-bold hover:bg-gray-50">Seed Data</button>
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-black text-white rounded-2xl text-sm font-bold hover:bg-gray-800 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-8 py-4">Product</th>
              <th className="px-8 py-4">Category</th>
              <th className="px-8 py-4">Price</th>
              <th className="px-8 py-4">Stock</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-4">
                    <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <span className="font-bold text-black">{p.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-gray-500">{p.category}</td>
                <td className="px-8 py-6 font-bold text-black">${p.price.toFixed(2)}</td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    p.stock < 10 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                  )}>
                    {p.stock} units
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">New Product</h2>
                <button onClick={() => setIsAdding(false)}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input required placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none" />
                <textarea required placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none h-32" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="p-4 bg-gray-50 rounded-2xl border-none" />
                  <input required type="number" placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} className="p-4 bg-gray-50 rounded-2xl border-none" />
                </div>
                <input required placeholder="Category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none" />
                <input required placeholder="Image URL" value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none" />
                <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800">Add Product</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Providers ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: u.uid, ...docSnap.data() } as UserProfile);
        } else {
          // Create profile if it doesn't exist
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email!,
            name: u.displayName || '',
            role: u.email === 'annoramo2007@gmail.com' ? 'admin' : 'customer'
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  );
};

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-white font-sans text-gray-900">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/profile" element={<div className="p-24 text-center">Profile page coming soon.</div>} />
              </Routes>
            </main>
            <footer className="bg-gray-50 border-t border-gray-100 py-12 mt-24">
              <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Package className="w-5 h-5 text-black" />
                  <span className="font-bold tracking-tight">VELOCE</span>
                </div>
                <p className="text-sm text-gray-400">© 2026 Veloce E-Commerce. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
