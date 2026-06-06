import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/* ─── Star Rating ─────────────────────────────────────────────────────── */
const Stars = ({ rating }) => {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array(full).fill(0).map((_, i) => (
        <span key={`f${i}`} className="text-amber-400 text-sm">★</span>
      ))}
      {half && <span className="text-amber-400 text-sm">½</span>}
      {Array(empty).fill(0).map((_, i) => (
        <span key={`e${i}`} className="text-gray-300 text-sm">★</span>
      ))}
    </span>
  );
};

/* ─── Format review count (88000 → 88K) ──────────────────────────────── */
const fmtReviews = (n) => {
  if (!n) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
};

/* ─── Product Card (Google Shopping style) ────────────────────────────── */
const ProductCard = ({ product, isCheapest, isSaved, onSaveToggle, token, user }) => {
  const hasDiscount = product.extractedOldPrice && product.extractedOldPrice > product.extractedPrice;
  const isRefurbished = !!product.secondHandCondition;
  const isOnSale = product.tag || (product.extensions && product.extensions.length > 0);

  return (
    <div
      className={`group bg-white rounded-2xl border transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 flex flex-col overflow-hidden ${
        isCheapest
          ? 'border-emerald-400 shadow-md shadow-emerald-50'
          : 'border-gray-100 shadow-sm'
      }`}
    >
      {/* Badges row */}
      <div className="flex items-center justify-between px-3 pt-3 min-h-[28px]">
        <div className="flex gap-1.5 flex-wrap">
          {isCheapest && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Cheapest
            </span>
          )}
          {isOnSale && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Sale
            </span>
          )}
          {isRefurbished && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              Refurbished
            </span>
          )}
          {product.multipleSources && (
            <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
              Multiple Sellers
            </span>
          )}
        </div>
        {/* Save button */}
        <button
          onClick={() => onSaveToggle(product)}
          title={isSaved ? 'Remove from saved' : 'Save product'}
          className={`p-1 rounded-full transition-all ${
            isSaved
              ? 'text-red-500 bg-red-50'
              : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
          }`}
        >
          <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Product Image */}
      <div className="relative mx-4 mt-2 bg-gray-50 rounded-xl overflow-hidden aspect-square flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          className="max-w-full max-h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
          }}
          loading="lazy"
        />
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
            -{product.discountPercent}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* Source / Store with icon */}
        <div className="flex items-center gap-1.5">
          {product.sourceIcon ? (
            <img
              src={product.sourceIcon}
              alt={product.store}
              className="w-4 h-4 rounded object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center text-[8px] font-bold text-gray-500">
              {product.store[0].toUpperCase()}
            </span>
          )}
          <span className="text-xs text-gray-500 font-medium truncate">{product.store}</span>
        </div>

        {/* Ratings */}
        {product.rating && (
          <div className="flex items-center gap-1.5">
            <Stars rating={product.rating} />
            <span className="text-xs text-blue-600 font-semibold">{product.rating}</span>
            {product.reviews && (
              <span className="text-xs text-gray-400">({fmtReviews(product.reviews)})</span>
            )}
          </div>
        )}

        {/* Condition */}
        {isRefurbished && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 inline-block w-fit">
            {product.secondHandCondition}
          </p>
        )}

        {/* Price block */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xl font-extrabold ${isCheapest ? 'text-emerald-600' : 'text-gray-900'}`}>
              ₹{Number(product.extractedPrice).toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                ₹{Number(product.extractedOldPrice).toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {hasDiscount && (
            <p className="text-xs text-emerald-600 font-semibold">
              Save ₹{(product.extractedOldPrice - product.extractedPrice).toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-2 px-3 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-1.5 transition-all ${
              isCheapest
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Buy on {product.store}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <Link
            to={`/product/${encodeURIComponent(product.name)}?store=${encodeURIComponent(product.store)}&product_id=${encodeURIComponent(product.id)}&price=${product.extractedPrice}&image=${encodeURIComponent(product.image)}&link=${encodeURIComponent(product.link)}`}
            className="w-full py-2 px-3 rounded-xl text-sm font-medium text-center border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            View History
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Results Page ───────────────────────────────────────────────── */
const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedProducts, setSavedProducts] = useState([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [sortBy, setSortBy] = useState('relevance'); // relevance | price_asc | price_desc | rating
  const [searchInput, setSearchInput] = useState('');

  const query = searchParams.get('query') || '';
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    setSearchInput(query);
    if (query) {
      fetchProducts();
      if (user && token) fetchSavedProducts();
    }
    // eslint-disable-next-line
  }, [query, user, token]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_URL}/search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error('No products found for this search.');
      const data = await res.json();
      setProducts(data.results || []);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products/saved`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSavedProducts(data.map((p) => p.productId));
      }
    } catch {}
  };

  const handleSaveToggle = useCallback(async (product) => {
    if (!user) { alert('Please login to save products'); return; }
    const isSaved = savedProducts.includes(product.id);
    try {
      if (isSaved) {
        const res = await fetch(`${API_URL}/products/saved/${product.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setSavedProducts((prev) => prev.filter((id) => id !== product.id));
      } else {
        const res = await fetch(`${API_URL}/products/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            productId: product.id?.toString() || Date.now().toString(),
            productName: product.name,
            price: product.price,
            image: product.image,
            link: product.link,
            store: product.store,
          }),
        });
        if (res.ok) setSavedProducts((prev) => [...prev, product.id]);
      }
    } catch (e) {
      console.error('Save toggle error:', e);
    }
  }, [user, token, savedProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/results?query=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  /* ── Derived data ── */
  const stores = ['all', ...new Set(products.map((p) => p.store))];

  let filtered = selectedStore === 'all'
    ? products
    : products.filter((p) => p.store === selectedStore);

  // Sort
  if (sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => a.extractedPrice - b.extractedPrice);
  else if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => b.extractedPrice - a.extractedPrice);
  else if (sortBy === 'rating') filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const prices = products.map((p) => p.extractedPrice).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-6">
          <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <h2 className="text-lg font-semibold text-gray-700">Searching for "{query}"</h2>
        <p className="text-gray-400 text-sm mt-1">Fetching the best deals from across the web...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Search Bar — sticky at top-0 (no navbar on results page) ── */}
      <div
        className="sticky top-0 z-40 border-b border-gray-200 bg-white/90"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            {/* ── Back to Home Arrow ── */}
            <button
              type="button"
              onClick={() => navigate('/')}
              title="Back to Home"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="font-semibold px-5 py-2.5 rounded-xl text-sm transition-all text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ── Page content — no extra top padding needed, search bar is in normal flow ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center mb-6">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-bold text-red-700 text-lg mb-1">No results found</h3>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {products.length > 0 && (
          <>
            {/* ── Results Header ── */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Shopping results for <span className="text-blue-600">"{query}"</span>
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {filtered.length} of {products.length} results
                  {selectedStore !== 'all' && ` · filtered to ${selectedStore}`}
                </p>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-gray-700"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Best Rated</option>
                </select>
              </div>
            </div>

            {/* ── Store Filter Pills ── */}
            <div className="flex gap-2 flex-wrap mb-6">
              {stores.map((store) => {
                const storeProduct = products.find((p) => p.store === store);
                return (
                  <button
                    key={store}
                    onClick={() => setSelectedStore(store)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      selectedStore === store
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {store !== 'all' && storeProduct?.sourceIcon && (
                      <img
                        src={storeProduct.sourceIcon}
                        alt=""
                        className="w-3.5 h-3.5 rounded object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    {store === 'all' ? 'All Stores' : store}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selectedStore === store ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {store === 'all' ? products.length : products.filter((p) => p.store === store).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Price Summary Bar ── */}
            {prices.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-6 shadow-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Lowest Price</p>
                  <p className="text-lg font-bold text-emerald-600">₹{Math.min(...prices).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Highest Price</p>
                  <p className="text-lg font-bold text-red-500">₹{Math.max(...prices).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Average Price</p>
                  <p className="text-lg font-bold text-blue-600">
                    ₹{Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Sellers Found</p>
                  <p className="text-lg font-bold text-gray-700">{new Set(products.map((p) => p.store)).size}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Products</p>
                  <p className="text-lg font-bold text-gray-700">{products.length}</p>
                </div>
              </div>
            )}

            {/* ── Product Grid ── */}
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map((product) => (
                  <ProductCard
                    key={`${product.id}-${product.store}`}
                    product={product}
                    isCheapest={product.extractedPrice === minPrice && minPrice > 0}
                    isSaved={savedProducts.includes(product.id)}
                    onSaveToggle={handleSaveToggle}
                    user={user}
                    token={token}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="text-5xl mb-4">🏪</div>
                <h3 className="font-bold text-gray-700 text-lg mb-2">No results for {selectedStore}</h3>
                <button onClick={() => setSelectedStore('all')} className="text-blue-600 text-sm hover:underline">
                  Show all stores
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Results;
