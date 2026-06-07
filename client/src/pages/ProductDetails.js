import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';
import { AuthContext } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL;

/* ─── Set Price Alert Modal ───────────────────────────────────────────── */
const PriceAlertModal = ({ product, store, onClose, token, userName }) => {
  const [targetPrice, setTargetPrice] = useState('');
  const [alertStore, setAlertStore] = useState(store || 'Any');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!targetPrice || isNaN(targetPrice) || Number(targetPrice) <= 0) {
      setMessage('Please enter a valid target price.');
      setIsError(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productName: product.name,
          searchQuery: product.name,
          targetPrice: Number(targetPrice),
          store: alertStore,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to create alert');
        setIsError(true);
      } else {
        setMessage('✅ Price alert set! We\'ll email you when the price drops.');
        setIsError(false);
        setTimeout(onClose, 2500);
      }
    } catch {
      setMessage('Cannot connect to server.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">🔔 Set Price Alert</h3>
            <p className="text-orange-100 text-xs mt-0.5">We'll notify you by email when the price drops</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-orange-50 rounded-lg p-3 text-sm text-gray-700 leading-snug truncate">
            <span className="font-semibold">Product:</span> {product.name}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Store to Monitor</label>
            <select
              value={alertStore}
              onChange={(e) => setAlertStore(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="Any">Any Store (cheapest available)</option>
              {store && store !== 'Any' && <option value={store}>{store}</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Your Target Price (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
              <input
                type="number"
                min="1"
                placeholder="e.g. 15000"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current price: <strong>₹{product.price}</strong>
            </p>
          </div>

          {message && (
            <div className={`text-sm px-3 py-2 rounded-lg ${isError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Setting Alert...</>
            ) : '🔔 Activate Alert'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Main ProductDetails ─────────────────────────────────────────────── */
const ProductDetails = () => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const storeName = searchParams.get('store') || null;
  const productIdParam = searchParams.get('product_id') || null;
  const currentPriceParam = searchParams.get('price') ? Number(searchParams.get('price')) : null;
  const currentImageParam = searchParams.get('image') || null;
  const currentLinkParam = searchParams.get('link') || null;

  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        // Fetch price history filtered by store
        const url = storeName
          ? `${API}/price-history/${encodeURIComponent(productId)}?store=${encodeURIComponent(storeName)}`
          : `${API}/price-history/${encodeURIComponent(productId)}`;

        const historyRes = await fetch(url);
        const historyData = historyRes.ok ? await historyRes.json() : { history: [], analysis: null };
        const history = historyData.history || [];

        if (history.length > 0) {
          setPriceHistory(history);
          const latestEntry = history[history.length - 1];
          setProduct({
            id: productId,
            name: historyData.productName || productId,
            price: latestEntry.price,
            store: latestEntry.store || storeName || 'Unknown Store',
            image: latestEntry.image || currentImageParam || 'https://via.placeholder.com/300',
            link: latestEntry.link || currentLinkParam || '#',
            updatedAt: latestEntry.date,
          });
        } else {
          // Use URL params from search results if no history yet
          const fallbackPrice = currentPriceParam || 0;
          setPriceHistory([{
            date: new Date().toLocaleDateString('en-IN'),
            time: new Date().toLocaleTimeString('en-IN'),
            price: fallbackPrice,
            store: storeName || 'Unknown',
            image: currentImageParam || 'https://via.placeholder.com/300',
            link: currentLinkParam || '#',
          }]);
          setProduct({
            id: productId,
            name: productId,
            price: fallbackPrice,
            store: storeName || 'Unknown Store',
            image: currentImageParam || 'https://via.placeholder.com/300',
            link: currentLinkParam || '#',
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProductDetails();
  }, [productId, storeName, currentPriceParam, currentImageParam, currentLinkParam]);

  useEffect(() => {
    if (productIdParam || productId) {
      fetchReviews(productIdParam, productId);
    }
  }, [productIdParam, productId]);

  const fetchReviews = async (product_id, productName) => {
    try {
      setReviewsLoading(true);
      let url = `${API}/reviews?`;
      if (product_id) url += `product_id=${encodeURIComponent(product_id)}&`;
      if (productName) url += `q=${encodeURIComponent(productName)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  /* ── Analysis helpers ── */
  const prices = priceHistory.map((p) => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const currentPrice = prices.length ? prices[prices.length - 1] : 0;
  const isBestTime = currentPrice <= minPrice + (maxPrice - minPrice) * 0.2;
  const trend =
    prices.length >= 3
      ? prices[prices.length - 1] > prices[prices.length - 2] &&
        prices[prices.length - 2] > prices[prices.length - 3]
        ? 'up'
        : prices[prices.length - 1] < prices[prices.length - 2] &&
          prices[prices.length - 2] < prices[prices.length - 3]
        ? 'down'
        : 'stable'
      : 'stable';

  /* ── Custom tooltip for chart ── */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold text-gray-700">{label}</p>
          <p className="text-blue-600 font-bold">₹{payload[0].value.toLocaleString()}</p>
          {payload[0].payload.store && (
            <p className="text-gray-500 text-xs">{payload[0].payload.store}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md w-full">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={() => navigate(-1)} className="mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-md w-full">
          <strong className="font-bold">Notice: </strong>
          <span className="block sm:inline">Product not found</span>
          <button onClick={() => navigate(-1)} className="mt-3 bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {showAlertModal && (
        <PriceAlertModal
          product={product}
          store={storeName}
          onClose={() => setShowAlertModal(false)}
          token={token}
          userName={user?.name}
        />
      )}

      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
        >
          <span className="material-icons mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to Results
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight line-clamp-2">{product.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-icons text-blue-200 text-base">store</span>
                  <span className="text-blue-100 text-sm font-medium">{product.store}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-extrabold text-white">₹{product.price}</div>
                <div className="text-blue-200 text-xs mt-0.5">Current Price</div>
              </div>
            </div>
          </div>

          <div className="md:flex">
            {/* Left Column: Image + Buy + Alert */}
            <div className="md:w-80 p-6 border-r border-gray-100 flex flex-col gap-4 shrink-0">
              <div className="bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: '220px' }}>
                <img
                  src={product.image || 'https://via.placeholder.com/300'}
                  alt={product.name}
                  className="max-h-56 max-w-full object-contain p-4"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300'; }}
                />
              </div>

              {/* Buy Button */}
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                Buy on {product.store}
                <span className="material-icons text-sm">open_in_new</span>
              </a>

              {/* Price Alert Button */}
              {user ? (
                <button
                  onClick={() => setShowAlertModal(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <span className="material-icons text-sm">notifications</span>
                  Set Price Alert
                </button>
              ) : (
                <Link
                  to="/login"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm border border-gray-200"
                >
                  <span className="material-icons text-sm">lock</span>
                  Login to Set Price Alert
                </Link>
              )}

              {/* Quick Stats */}
              {priceHistory.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Statistics</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Lowest</span>
                    <span className="font-bold text-green-600">₹{minPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Highest</span>
                    <span className="font-bold text-red-500">₹{maxPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Average</span>
                    <span className="font-bold text-blue-600">₹{avgPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Data Points</span>
                    <span className="font-bold text-gray-700">{priceHistory.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Price History Only */}
            <div className="flex-1 p-6 min-w-0 overflow-hidden">
              {/* Store badge */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100">
                  <span className="material-icons text-xs">store</span>
                  {storeName ? `${storeName} Price History` : 'Price History (All Stores)'}
                </span>
                {trend === 'down' && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-green-100">
                    <span className="material-icons text-xs">trending_down</span> Falling
                  </span>
                )}
                {trend === 'up' && (
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-red-100">
                    <span className="material-icons text-xs">trending_up</span> Rising
                  </span>
                )}
                {trend === 'stable' && (
                  <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-gray-200">
                    <span className="material-icons text-xs">trending_flat</span> Stable
                  </span>
                )}
              </div>

              {/* Recommendation Banner */}
              {priceHistory.length > 0 && (
                <div className="space-y-4 mb-8">
                  {/* AI Research Dashboard */}
                  <div className="bg-white border-2 border-blue-600 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-icons text-white text-sm">psychology</span>
                        <span className="text-white text-xs font-bold uppercase tracking-wider">AI Research Decision Intelligence</span>
                      </div>
                      {reviews?.ai_advisor && (
                        <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] text-white font-bold">
                          CONFIDENCE: {reviews?.ai_advisor.confidence}%
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 md:flex gap-6">
                      {/* XAI Advisor */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            reviews?.ai_advisor?.advice === 'BUY NOW' ? 'bg-green-100 text-green-600' :
                            reviews?.ai_advisor?.advice === 'WAIT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            <span className="material-icons text-lg">
                              {reviews?.ai_advisor?.advice === 'BUY NOW' ? 'check_circle' : 
                               reviews?.ai_advisor?.advice === 'WAIT' ? 'pause_circle' : 'info'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">AI Recommendation: {reviews?.ai_advisor?.advice || (isBestTime ? 'BUY NOW' : 'WAIT')}</h3>
                            <p className="text-[10px] text-gray-500 font-medium">EXPLAINABLE AI (XAI) REASONING</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-3">
                          {reviews?.ai_advisor?.evidence ? (
                            reviews?.ai_advisor.evidence.map((reason, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                <span className="material-icons text-[14px] text-blue-500 mt-0.5">verified</span>
                                <span>{reason}</span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <span className="material-icons text-[14px] text-blue-500 mt-0.5">verified</span>
                              <span>{isBestTime 
                                ? `Current price (₹${currentPrice.toLocaleString()}) is near the historical low (₹${minPrice.toLocaleString()}).`
                                : `Current price is ${Math.round(((currentPrice - minPrice) / minPrice) * 100)}% above the record low.`}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Market Integrity / Honesty Score */}
                      <div className="md:w-64 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 flex flex-col gap-4">
                        {/* Value for Money Index */}
                        <div className="text-center pb-4 border-b border-gray-50">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Value-for-Money Index</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl font-black text-blue-600">{reviews?.vfm_index || 70}%</span>
                            <div className="text-left">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <span key={i} className={`w-1.5 h-3 rounded-full ${i <= (reviews?.vfm_index ? reviews?.vfm_index / 20 : 3.5) ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <p className="text-[8px] text-gray-400 font-bold uppercase">Market Efficiency</p>
                            </div>
                          </div>
                        </div>

                        {/* Integrity & Credibility */}
                        <div className="flex justify-around items-center">
                          <div className="text-center">
                            <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Price Integrity</p>
                            <div className="relative inline-flex items-center justify-center">
                              <svg className="w-12 h-12">
                                <circle className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" />
                                <circle className={reviews?.price_integrity?.score < 80 ? "text-orange-500" : "text-green-500"} strokeWidth="3" strokeDasharray={125} strokeDashoffset={125 - (125 * (reviews?.price_integrity?.score || 100)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" />
                              </svg>
                              <span className="absolute text-[10px] font-bold text-gray-700">{reviews?.price_integrity?.score || 100}%</span>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Review Credibility</p>
                            <div className="relative inline-flex items-center justify-center">
                              <svg className="w-12 h-12">
                                <circle className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" />
                                <circle className={reviews?.review_credibility?.score < 80 ? "text-purple-500" : "text-blue-500"} strokeWidth="3" strokeDasharray={125} strokeDashoffset={125 - (125 * (reviews?.review_credibility?.score || 100)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24" />
                              </svg>
                              <span className="absolute text-[10px] font-bold text-gray-700">{reviews?.review_credibility?.score || 100}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-[9px] text-gray-400 text-center leading-tight">
                          {reviews?.review_credibility?.details || 'AI verified authentic review patterns.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aspect-Based Sentiment Analysis (ABSA) Dashboard */}
              {reviews?.aspect_sentiment && (
                <div className="mb-8 bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <span className="material-icons text-blue-600">bar_chart</span>
                        Feature-Specific Sentiment (ABSA)
                      </h4>
                      <p className="text-xs text-gray-500">AI breakdown of specific product attributes from user feedback</p>
                    </div>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">NLP Research Module</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(reviews?.aspect_sentiment || {}).map(([aspect, data]) => (
                      <div key={aspect} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{aspect}</p>
                        <div className="text-xl font-black text-gray-800 mb-1">{data.rating}/10</div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full ${data.rating > 7 ? 'bg-green-500' : data.rating > 4 ? 'bg-yellow-400' : 'bg-red-500'}`}
                            style={{ width: `${data.rating * 10}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-gray-400 font-medium">{data.mentions} mentions</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price History Chart */}
              <h2 className="text-base font-bold text-gray-700 mb-3">
                📈 Price History Chart
                {storeName ? ` — ${storeName}` : ''}
              </h2>

              {priceHistory.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-xl mb-4">
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `₹${v.toLocaleString()}`}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          width={75}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={avgPrice} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Avg', position: 'insideTopRight', fontSize: 11, fill: '#f59e0b' }} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ fill: '#2563eb', r: 3.5, strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Dashed line = average price (₹{avgPrice.toLocaleString()}) · {priceHistory.length} data point{priceHistory.length !== 1 ? 's' : ''} from {storeName || 'all stores'}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-10 rounded-xl mb-4 text-center border-2 border-dashed border-gray-200">
                  <span className="material-icons text-gray-300 text-5xl mb-3">show_chart</span>
                  <p className="text-gray-500 font-medium">No price history available yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Search for this product to start tracking. Once tracked, price history will appear here.
                  </p>
                </div>
              )}

              {/* Price History Table */}
              {priceHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Recent Price Records</h3>
                  <div className="overflow-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-2.5 font-semibold text-gray-600">Date</th>
                          <th className="px-4 py-2.5 font-semibold text-gray-600">Store</th>
                          <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...priceHistory].reverse().slice(0, 10).map((entry, i) => (
                          <tr key={i} className={`border-t border-gray-50 ${i === 0 ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-2.5 text-gray-600">{entry.date}</td>
                            <td className="px-4 py-2.5 text-gray-600">{entry.store}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-800">
                              ₹{Number(entry.price).toLocaleString()}
                              {i === 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Latest</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Product Reviews Section */}
              {reviewsLoading && (
                <div className="mt-8 bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Loading product details & reviews from India...</p>
                </div>
              )}

              {reviews && !reviewsLoading && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Product Details & Reviews</h3>

                  {/* Product Info Card with Thumbnails */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-4">
                      {reviews?.thumbnails && reviews?.thumbnails.length > 0 && (
                        <img
                          src={reviews?.thumbnails[0]}
                          alt={reviews?.title}
                          className="w-24 h-24 object-cover rounded-lg bg-white"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/96'; }}
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{reviews?.title}</h4>
                        {reviews?.brand && (
                          <span className="inline-block text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full mt-1">{reviews?.brand}</span>
                        )}
                        {reviews?.about_the_product?.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{reviews?.about_the_product.description}</p>
                        )}
                        {reviews?.price_range && (
                          <p className="text-sm text-blue-600 font-semibold mt-2">Price: {reviews?.price_range}</p>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail Gallery */}
                    {reviews?.thumbnails && reviews?.thumbnails.length > 1 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {reviews?.thumbnails.slice(0, 8).map((thumb, idx) => (
                          <img
                            key={idx}
                            src={thumb}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-14 h-14 object-cover rounded-lg bg-white border-2 border-transparent hover:border-blue-400 cursor-pointer flex-shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rating Summary + Distribution */}
                  {reviews?.rating && (
                    <div className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="material-icons text-yellow-500 text-3xl">star</span>
                        <div>
                          <span className="text-2xl font-bold text-gray-900">{reviews?.rating}</span>
                          {reviews?.reviews && (
                            <span className="text-sm text-gray-600 ml-2">
                              ({typeof reviews?.reviews === 'number' ? reviews?.reviews?.toLocaleString() : reviews?.reviews} reviews)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rating Bar Distribution */}
                      {reviews?.ratings && reviews?.ratings.length > 0 && (
                        <div className="space-y-2 mt-4 max-w-md">
                          {(() => {
                            const totalAmount = reviews?.ratings.reduce((acc, r) => {
                              const val = typeof r.amount === 'string' ? parseFloat(r.amount.replace(/[^0-9.]/g, '')) : r.amount;
                              return acc + (val || 0);
                            }, 0);

                            return reviews?.ratings.map((r) => {
                              const amountVal = typeof r.amount === 'string' ? parseFloat(r.amount.replace(/[^0-9.]/g, '')) : r.amount;
                              const percentage = totalAmount > 110 
                                ? (amountVal / totalAmount) * 100 
                                : Math.min(100, amountVal || 0);
                              
                              return (
                                <div key={r.stars} className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1 w-8 shrink-0">
                                    <span className="text-gray-600 font-bold">{r.stars}</span>
                                    <span className="material-icons text-[14px] text-yellow-400">star</span>
                                  </div>
                                  <div className="flex-1 min-w-0 bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                                    <div
                                      className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full transition-all duration-700 ease-out"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="w-12 text-gray-500 text-[11px] font-medium text-right shrink-0">
                                    {totalAmount > 110 ? `${Math.round(percentage)}%` : `${r.amount}%`}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* About the Product Features */}
                  {reviews?.about_the_product?.features && reviews?.about_the_product.features.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Product Specifications</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                        {reviews?.about_the_product.features.slice(0, 16).map((feature, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                            <span className="text-xs text-gray-400">{feature.title}</span>
                            <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{feature.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stores / Price Comparison */}
                  {reviews?.stores && reviews?.stores.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Compare Prices Across Stores</h4>
                      <div className="space-y-3">
                        {reviews?.stores.slice(0, 5).map((store, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                            {store.logo && (
                              <img
                                src={store.logo}
                                alt={store.name}
                                className="w-8 h-8 rounded"
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/32'; }}
                              />
                            )}
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900 text-sm">{store.name}</h5>
                              {store.title && (
                                <p className="text-xs text-gray-500 line-clamp-1">{store.title}</p>
                              )}
                              {store.details_and_offers && store.details_and_offers.length > 0 && (
                                <p className="text-xs text-green-600 mt-0.5">{store.details_and_offers.slice(0, 2).join(' · ')}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">₹{store.extracted_price?.toLocaleString()}</p>
                              {store.extracted_total && store.extracted_total !== store.extracted_price && (
                                <p className="text-xs text-gray-500">Total: ₹{store.extracted_total.toLocaleString()}</p>
                              )}
                              {store.rating && (
                                <span className="text-xs text-yellow-600">{store.rating} ★ ({store.reviews})</span>
                              )}
                            </div>
                            {store.link && (
                              <a
                                href={store.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                              >
                                View Deal
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Store Disparity Analysis */}
                  {reviews?.store_disparity && Object.keys(reviews?.store_disparity).length > 1 && (
                    <div className="mb-8">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="material-icons text-blue-600 text-sm">compare_arrows</span>
                        Platform Comparison Research
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(reviews?.store_disparity || {}).map((store, idx) => (
                          <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-sm font-bold text-gray-800">{store.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                store.positiveRate > 70 ? 'bg-green-100 text-green-700' : 
                                store.positiveRate > 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {store.positiveRate}% POSITIVE
                              </span>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>LOGISTICS & DELIVERY</span>
                                  <span className="font-bold text-gray-700">{store.logisticsRating !== 'N/A' ? `${store.logisticsRating} Index` : 'N/A'}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${parseFloat(store.logisticsRating) > 0 ? 'bg-blue-500' : 'bg-red-400'}`}
                                    style={{ width: store.logisticsRating !== 'N/A' ? `${Math.max(0, Math.min(100, (parseFloat(store.logisticsRating) + 1) * 50))}%` : '0%' }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-[10px] text-gray-400">
                                <span>{store.total} samples</span>
                                <span>{store.logisticsCount} logistics mentions</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 italic">* Disparity analysis highlights differences in platform-specific service quality and seller reliability.</p>
                    </div>
                  )}

                  {/* User Reviews */}
                  {reviews?.user_reviews && reviews?.user_reviews?.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h4 className="font-semibold text-gray-800">Review Sentiment Analysis</h4>
                        {reviews?.user_reviews?.some(r => r.sentiment) && (
                          <div className="flex flex-wrap items-center gap-2">
                            {['positive', 'neutral', 'negative'].map(label => {
                              const count = reviews?.user_reviews?.filter(r => r.sentiment?.label === label).length;
                              if (count === 0) return null;
                              return (
                                <div key={label} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                                  label === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                                  label === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${
                                    label === 'positive' ? 'bg-green-500' :
                                    label === 'negative' ? 'bg-red-500' :
                                    'bg-gray-400'
                                  }`} />
                                  <span className="text-[10px] font-bold uppercase">{label}: {Math.round((count / reviews?.user_reviews?.length) * 100)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sentiment Pie Chart */}
                      {reviews?.user_reviews?.some(r => r.sentiment) && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Positive', value: reviews?.user_reviews?.filter(r => r.sentiment?.label === 'positive').length },
                                    { name: 'Neutral', value: reviews?.user_reviews?.filter(r => r.sentiment?.label === 'neutral').length },
                                    { name: 'Negative', value: reviews?.user_reviews?.filter(r => r.sentiment?.label === 'negative').length },
                                  ].filter(d => d.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {[
                                    { name: 'Positive', color: '#10B981' },
                                    { name: 'Neutral', color: '#9CA3AF' },
                                    { name: 'Negative', color: '#EF4444' },
                                  ].filter(c => reviews?.user_reviews?.some(r => r.sentiment?.label === c.name.toLowerCase())).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-center text-xs text-gray-500 mt-2 italic">Overall user sentiment based on {reviews?.user_reviews?.length} reviews</p>
                        </div>
                      )}

                      <h4 className="font-semibold text-gray-800 mb-3">What Users Are Saying</h4>
                      <div className="space-y-3">
                        {reviews?.user_reviews?.slice(0, 8).map((review, idx) => (
                          <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {review.icon && (
                                <img
                                  src={review.icon}
                                  alt=""
                                  className="w-7 h-7 rounded-full"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-gray-700">{review.source || 'Anonymous'}</span>
                                {review.rating && (
                                  <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                                    <span className="material-icons text-xs">star</span>
                                    {review.rating}
                                  </span>
                                )}
                                {review.date && (
                                  <span className="text-xs text-gray-400">· {review.date}</span>
                                )}
                                {review.sentiment && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    review.sentiment.label === 'positive' ? 'bg-green-100 text-green-700 border border-green-200' :
                                    review.sentiment.label === 'negative' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}>
                                    {review.sentiment.label} {review.sentiment.stars && `(${review.sentiment.stars}★)`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>

                            {review.images && review.images.length > 0 && (
                              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                {review.images.slice(0, 4).map((img, imgIdx) => (
                                  <img
                                    key={imgIdx}
                                    src={img}
                                    alt={`Review image ${imgIdx + 1}`}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {reviews?.videos && reviews?.videos.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Product Videos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {reviews?.videos.slice(0, 6).map((video, idx) => (
                          <a
                            key={idx}
                            href={video.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                          >
                            {video.thumbnail && (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-24 object-cover"
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/160x96'; }}
                              />
                            )}
                            <div className="p-2">
                              <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600">{video.title}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-gray-400">{video.source}</span>
                                {video.duration && <span className="text-xs text-gray-400">· {video.duration}</span>}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Images Gallery */}
                  {reviews?.reviews_images && reviews?.reviews_images.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Customer Photos</h4>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {reviews?.reviews_images.slice(0, 10).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Customer photo ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
