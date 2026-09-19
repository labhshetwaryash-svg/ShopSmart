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
            <p className="text-orange-100 text-xs mt-0.5">
              We'll notify you by email when the price drops
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-orange-50 rounded-lg p-3 text-sm text-gray-700 leading-snug truncate">
            <span className="font-semibold">Product:</span> {product.name}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Store to Monitor
            </label>

            <select
              value={alertStore}
              onChange={(e) => setAlertStore(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="Any">Any Store (cheapest available)</option>

              {store && store !== 'Any' && (
                <option value={store}>{store}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Your Target Price (₹)
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                ₹
              </span>

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
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                isError
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting Alert...
              </>
            ) : (
              '🔔 Activate Alert'
            )}
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

  const currentPriceParam = searchParams.get('price')
    ? Number(searchParams.get('price'))
    : null;

  const currentImageParam = searchParams.get('image') || null;
  const currentLinkParam = searchParams.get('link') || null;

  // NEW: receive the exact SerpApi immersive product token
  const immersiveTokenParam =
    searchParams.get('immersive_token') || null;

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

        const url = storeName
          ? `${API}/price-history/${encodeURIComponent(productId)}?store=${encodeURIComponent(storeName)}`
          : `${API}/price-history/${encodeURIComponent(productId)}`;

        const historyRes = await fetch(url);

        const historyData = historyRes.ok
          ? await historyRes.json()
          : { history: [], analysis: null };

        const history = historyData.history || [];

        if (history.length > 0) {
          setPriceHistory(history);

          const latestEntry = history[history.length - 1];

          setProduct({
            id: productId,
            name: historyData.productName || productId,
            price: latestEntry.price,
            store: latestEntry.store || storeName || 'Unknown Store',
            image:
              latestEntry.image ||
              currentImageParam ||
              'https://via.placeholder.com/300',
            link: latestEntry.link || currentLinkParam || '#',
            updatedAt: latestEntry.date,
          });
        } else {
          const fallbackPrice = currentPriceParam || 0;

          setPriceHistory([
            {
              date: new Date().toLocaleDateString('en-IN'),
              time: new Date().toLocaleTimeString('en-IN'),
              price: fallbackPrice,
              store: storeName || 'Unknown',
              image:
                currentImageParam ||
                'https://via.placeholder.com/300',
              link: currentLinkParam || '#',
            },
          ]);

          setProduct({
            id: productId,
            name: productId,
            price: fallbackPrice,
            store: storeName || 'Unknown Store',
            image:
              currentImageParam ||
              'https://via.placeholder.com/300',
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

    if (productId) {
      fetchProductDetails();
    }
  }, [
    productId,
    storeName,
    currentPriceParam,
    currentImageParam,
    currentLinkParam,
  ]);

  useEffect(() => {
    if (productIdParam || productId) {
      fetchReviews(
        productIdParam,
        productId,
        immersiveTokenParam
      );
    }
  }, [
    productIdParam,
    productId,
    immersiveTokenParam,
  ]);

  /*
   * IMPORTANT:
   * This function now sends the exact immersive product page token
   * received from Google Shopping to the backend.
   */
  const fetchReviews = async (
    product_id,
    productName,
    immersiveToken
  ) => {
    try {
      setReviewsLoading(true);

      let url = `${API}/reviews?`;

      if (product_id) {
        url += `product_id=${encodeURIComponent(product_id)}&`;
      }

      if (productName) {
        url += `q=${encodeURIComponent(productName)}&`;
      }

      // IMPORTANT:
      // Pass the exact SerpApi immersive product token.
      if (immersiveToken) {
        url += `page_token=${encodeURIComponent(immersiveToken)}`;
      }

      console.log('========================================');
      console.log('FETCHING REVIEWS');
      console.log('Product ID:', product_id);
      console.log('Product Name:', productName);
      console.log('Immersive Token:', immersiveToken);
      console.log('Reviews URL:', url);
      console.log('========================================');

      const res = await fetch(url);

      const contentType =
        res.headers.get('content-type') || '';

      if (!res.ok) {
        const errorText = await res.text();

        console.error(
          'Reviews request failed:',
          res.status
        );

        console.error(
          'Reviews error response:',
          errorText
        );

        return;
      }

      if (!contentType.includes('application/json')) {
        const text = await res.text();

        console.error(
          'Reviews API returned non-JSON response:',
          text
        );

        return;
      }

      const data = await res.json();

      console.log(
        'Reviews API response received:',
        data
      );

      console.log(
        'Number of reviews:',
        Array.isArray(data.user_reviews)
          ? data.user_reviews.length
          : 0
      );

      setReviews(data);
    } catch (err) {
      console.error(
        'Error fetching reviews:',
        err
      );
    } finally {
      setReviewsLoading(false);
    }
  };

  /* ── Analysis helpers ── */

  const prices = priceHistory.map((p) => p.price);

  const minPrice = prices.length
    ? Math.min(...prices)
    : 0;

  const maxPrice = prices.length
    ? Math.max(...prices)
    : 0;

  const avgPrice = prices.length
    ? Math.round(
        prices.reduce((a, b) => a + b, 0) /
          prices.length
      )
    : 0;

  const currentPrice = prices.length
    ? prices[prices.length - 1]
    : 0;

  const isBestTime =
    currentPrice <=
    minPrice +
      (maxPrice - minPrice) * 0.2;

  const trend =
    prices.length >= 3
      ? prices[prices.length - 1] >
          prices[prices.length - 2] &&
        prices[prices.length - 2] >
          prices[prices.length - 3]
        ? 'up'
        : prices[prices.length - 1] <
              prices[prices.length - 2] &&
            prices[prices.length - 2] <
              prices[prices.length - 3]
          ? 'down'
          : 'stable'
      : 'stable';

  /* ── Custom tooltip for chart ── */

  const CustomTooltip = ({
    active,
    payload,
    label,
  }) => {
    if (
      active &&
      payload &&
      payload.length
    ) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold text-gray-700">
            {label}
          </p>

          <p className="text-blue-600 font-bold">
            ₹{payload[0].value.toLocaleString()}
          </p>

          {payload[0].payload.store && (
            <p className="text-gray-500 text-xs">
              {payload[0].payload.store}
            </p>
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

          <p className="text-gray-600">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md w-full">
          <strong className="font-bold">
            Error:{' '}
          </strong>

          <span className="block sm:inline">
            {error}
          </span>

          <button
            onClick={() => navigate(-1)}
            className="mt-3 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
          >
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
          <strong className="font-bold">
            Notice:{' '}
          </strong>

          <span className="block sm:inline">
            Product not found
          </span>

          <button
            onClick={() => navigate(-1)}
            className="mt-3 bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-sm"
          >
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
          onClose={() =>
            setShowAlertModal(false)
          }
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
          <span className="material-icons mr-2 group-hover:-translate-x-1 transition-transform">
            arrow_back
          </span>

          Back to Results
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}

          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white leading-tight line-clamp-2">
                  {product.name}
                </h1>

                <div className="flex items-center gap-2 mt-1">
                  <span className="material-icons text-blue-200 text-base">
                    store
                  </span>

                  <span className="text-blue-100 text-sm font-medium">
                    {product.store}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-3xl font-extrabold text-white">
                  ₹{product.price}
                </div>

                <div className="text-blue-200 text-xs mt-0.5">
                  Current Price
                </div>
              </div>
            </div>
          </div>

          <div className="md:flex">
            {/* Left Column: Image + Buy + Alert */}

            <div className="md:w-80 p-6 border-r border-gray-100 flex flex-col gap-4 shrink-0">
              <div
                className="bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ minHeight: '220px' }}
              >
                <img
                  src={
                    product.image ||
                    'https://via.placeholder.com/300'
                  }
                  alt={product.name}
                  className="max-h-56 max-w-full object-contain p-4"
                  onError={(e) => {
                    e.target.src =
                      'https://via.placeholder.com/300';
                  }}
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

                <span className="material-icons text-sm">
                  open_in_new
                </span>
              </a>

              {/* Price Alert Button */}

              {user ? (
                <button
                  onClick={() =>
                    setShowAlertModal(true)
                  }
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <span className="material-icons text-sm">
                    notifications
                  </span>

                  Set Price Alert
                </button>
              ) : (
                <Link
                  to="/login"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm border border-gray-200"
                >
                  <span className="material-icons text-sm">
                    lock
                  </span>

                  Login to Set Price Alert
                </Link>
              )}

              {/* Quick Stats */}

              {priceHistory.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Price Statistics
                  </h4>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Lowest
                    </span>

                    <span className="font-bold text-green-600">
                      ₹{minPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Highest
                    </span>

                    <span className="font-bold text-red-500">
                      ₹{maxPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Average
                    </span>

                    <span className="font-bold text-blue-600">
                      ₹{avgPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Data Points
                    </span>

                    <span className="font-bold text-gray-700">
                      {priceHistory.length}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}

            <div className="flex-1 p-6 min-w-0 overflow-hidden">
              {/* Store badge */}

              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100">
                  <span className="material-icons text-xs">
                    store
                  </span>

                  {storeName
                    ? `${storeName} Price History`
                    : 'Price History (All Stores)'}
                </span>

                {trend === 'down' && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-green-100">
                    <span className="material-icons text-xs">
                      trending_down
                    </span>

                    Falling
                  </span>
                )}

                {trend === 'up' && (
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-red-100">
                    <span className="material-icons text-xs">
                      trending_up
                    </span>

                    Rising
                  </span>
                )}

                {trend === 'stable' && (
                  <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-gray-200">
                    <span className="material-icons text-xs">
                      trending_flat
                    </span>

                    Stable
                  </span>
                )}
              </div>

              {/* Price Chart */}

              <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Price History
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Historical prices tracked by ShopSmart
                    </p>
                  </div>

                  {isBestTime && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      Great Price
                    </span>
                  )}
                </div>

                {priceHistory.length > 1 ? (
                  <div className="h-72">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart
                        data={priceHistory}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 10,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />

                        <XAxis
                          dataKey="date"
                          tick={{
                            fontSize: 11,
                            fill: '#6b7280',
                          }}
                        />

                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: '#6b7280',
                          }}
                          tickFormatter={(value) =>
                            `₹${value.toLocaleString()}`
                          }
                        />

                        <Tooltip
                          content={<CustomTooltip />}
                        />

                        <ReferenceLine
                          y={avgPrice}
                          stroke="#9ca3af"
                          strokeDasharray="5 5"
                          label={{
                            value: 'Average',
                            position: 'insideTopRight',
                            fontSize: 10,
                            fill: '#6b7280',
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: '#2563eb',
                          }}
                          activeDot={{
                            r: 6,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <span className="material-icons text-gray-300 text-5xl">
                        show_chart
                      </span>

                      <p className="text-gray-500 text-sm mt-2">
                        Not enough price history yet
                      </p>

                      <p className="text-gray-400 text-xs mt-1">
                        ShopSmart will track future price changes
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Analysis */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-green-600">
                      arrow_downward
                    </span>

                    <span className="text-xs font-semibold text-green-700 uppercase">
                      Lowest Price
                    </span>
                  </div>

                  <div className="text-xl font-bold text-green-700">
                    ₹{minPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-blue-600">
                      analytics
                    </span>

                    <span className="text-xs font-semibold text-blue-700 uppercase">
                      Average
                    </span>
                  </div>

                  <div className="text-xl font-bold text-blue-700">
                    ₹{avgPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-icons text-red-500">
                      arrow_upward
                    </span>

                    <span className="text-xs font-semibold text-red-600 uppercase">
                      Highest Price
                    </span>
                  </div>

                  <div className="text-xl font-bold text-red-600">
                    ₹{maxPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* AI Price Recommendation */}

              <div
                className={`rounded-xl p-5 mb-6 border ${
                  isBestTime
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      isBestTime
                        ? 'bg-green-100'
                        : 'bg-amber-100'
                    }`}
                  >
                    <span
                      className={`material-icons ${
                        isBestTime
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {isBestTime
                        ? 'thumb_up'
                        : 'schedule'}
                    </span>
                  </div>

                  <div>
                    <h3
                      className={`font-bold ${
                        isBestTime
                          ? 'text-green-800'
                          : 'text-amber-800'
                      }`}
                    >
                      {isBestTime
                        ? 'Good Time to Buy'
                        : 'Consider Waiting'}
                    </h3>

                    <p
                      className={`text-sm mt-1 ${
                        isBestTime
                          ? 'text-green-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {isBestTime
                        ? 'The current price is close to the lowest recorded price.'
                        : 'The current price is above the recent low. Consider waiting for a better deal.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price History Table */}

              <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="material-icons text-blue-600">
                    history
                  </span>

                  Complete Price History (
                  {priceHistory.length} records)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Date & Time
                        </th>

                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Price
                        </th>

                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Store
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {priceHistory
                        .slice()
                        .reverse()
                        .map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {item.date}{' '}
                              {item.time}
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`font-bold ${
                                  item.price ===
                                  minPrice
                                    ? 'text-green-600'
                                    : item.price ===
                                        maxPrice
                                      ? 'text-red-500'
                                      : 'text-slate-800'
                                }`}
                              >
                                ₹
                                {Number(
                                  item.price
                                ).toLocaleString()}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-sm text-slate-600">
                              {item.store ||
                                storeName ||
                                'Unknown'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reviews / Research Section */}

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <span className="material-icons text-blue-600">
                        reviews
                      </span>

                      Product Reviews & Research
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      Reviews, product information and AI-powered research
                    </p>
                  </div>

                  {reviewsLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  )}
                </div>

                {!reviewsLoading && !reviews && (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <span className="material-icons text-gray-300 text-5xl">
                      rate_review
                    </span>

                    <p className="text-gray-500 mt-3">
                      No review data available.
                    </p>
                  </div>
                )}

                {reviews && (
                  <>
                    {/* Product Overview */}

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 border border-blue-100">
                      <div className="flex items-start gap-4">
                        {reviews?.thumbnails?.[0] && (
                          <img
                            src={
                              reviews.thumbnails[0]
                            }
                            alt={
                              reviews.title ||
                              product.name
                            }
                            className="w-24 h-24 object-contain rounded-lg bg-white border border-blue-100 p-2"
                            onError={(e) => {
                              e.target.style.display =
                                'none';
                            }}
                          />
                        )}

                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {reviews.title ||
                              product.name}
                          </h3>

                          {reviews?.brand && (
                            <span className="inline-block text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1">
                              {reviews.brand}
                            </span>
                          )}

                          {reviews?.about_the_product
                            ?.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                              {
                                reviews
                                  .about_the_product
                                  .description
                              }
                            </p>
                          )}

                          {reviews?.price_range && (
                            <p className="text-sm text-blue-600 font-semibold mt-2">
                              Price:{' '}
                              {reviews.price_range}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail Gallery */}

                      {reviews?.thumbnails &&
                        reviews.thumbnails.length >
                          1 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                            {reviews.thumbnails
                              .slice(0, 8)
                              .map(
                                (
                                  thumb,
                                  idx
                                ) => (
                                  <img
                                    key={idx}
                                    src={thumb}
                                    alt={`Thumbnail ${
                                      idx + 1
                                    }`}
                                    className="w-14 h-14 object-cover rounded-lg bg-white border-2 border-transparent hover:border-blue-400 cursor-pointer flex-shrink-0"
                                    onError={(
                                      e
                                    ) => {
                                      e.target.style.display =
                                        'none';
                                    }}
                                  />
                                )
                              )}
                          </div>
                        )}
                    </div>

                    {/* Rating Summary + Distribution */}

                    {reviews?.rating && (
                      <div className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="material-icons text-yellow-500 text-3xl">
                            star
                          </span>

                          <div>
                            <span className="text-2xl font-bold text-gray-900">
                              {reviews.rating}
                            </span>

                            {reviews?.reviews && (
                              <span className="text-sm text-gray-600 ml-2">
                                (
                                {typeof reviews.reviews ===
                                'number'
                                  ? reviews.reviews.toLocaleString()
                                  : reviews.reviews}{' '}
                                reviews)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rating Bar Distribution */}

                        {reviews?.ratings &&
                          reviews.ratings.length >
                            0 && (
                            <div className="space-y-2 mt-4 max-w-md">
                              {(() => {
                                const totalAmount =
                                  reviews.ratings.reduce(
                                    (acc, r) => {
                                      const val =
                                        typeof r.amount ===
                                        'string'
                                          ? parseFloat(
                                              r.amount.replace(
                                                /[^0-9.]/g,
                                                ''
                                              )
                                            )
                                          : r.amount;

                                      return (
                                        acc +
                                        (val || 0)
                                      );
                                    },
                                    0
                                  );

                                return reviews.ratings.map(
                                  (r) => {
                                    const amountVal =
                                      typeof r.amount ===
                                      'string'
                                        ? parseFloat(
                                            r.amount.replace(
                                              /[^0-9.]/g,
                                              ''
                                            )
                                          )
                                        : r.amount;

                                    const percentage =
                                      totalAmount >
                                      110
                                        ? (amountVal /
                                            totalAmount) *
                                          100
                                        : Math.min(
                                            100,
                                            amountVal || 0
                                          );

                                    return (
                                      <div
                                        key={r.stars}
                                        className="flex items-center gap-3 text-sm"
                                      >
                                        <div className="flex items-center gap-1 w-8 shrink-0">
                                          <span className="text-gray-600 font-bold">
                                            {r.stars}
                                          </span>

                                          <span className="material-icons text-[14px] text-yellow-400">
                                            star
                                          </span>
                                        </div>

                                        <div className="flex-1 min-w-0 bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                                          <div
                                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                              width: `${percentage}%`,
                                            }}
                                          />
                                        </div>

                                        <span className="w-12 text-gray-500 text-[11px] font-medium text-right shrink-0">
                                          {totalAmount >
                                          110
                                            ? `${Math.round(
                                                percentage
                                              )}%`
                                            : `${r.amount}%`}
                                        </span>
                                      </div>
                                    );
                                  }
                                );
                              })()}
                            </div>
                          )}
                      </div>
                    )}

                    {/* About the Product Features */}

                    {reviews?.about_the_product
                      ?.features &&
                      reviews.about_the_product
                        .features.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-800 mb-3">
                            Product Specifications
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                            {reviews.about_the_product.features
                              .slice(0, 16)
                              .map(
                                (
                                  feature,
                                  idx
                                ) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-50 rounded-lg p-2.5 border border-gray-100"
                                  >
                                    <span className="text-xs text-gray-400">
                                      {feature.title}
                                    </span>

                                    <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">
                                      {
                                        feature.value
                                      }
                                    </p>
                                  </div>
                                )
                              )}
                          </div>
                        </div>
                      )}

                    {/* Stores / Price Comparison */}

                    {reviews?.stores &&
                      reviews.stores.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-800 mb-3">
                            Compare Prices Across Stores
                          </h4>

                          <div className="space-y-3">
                            {reviews.stores
                              .slice(0, 5)
                              .map(
                                (
                                  store,
                                  idx
                                ) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors"
                                  >
                                    {store.logo && (
                                      <img
                                        src={
                                          store.logo
                                        }
                                        alt={
                                          store.name
                                        }
                                        className="w-8 h-8 rounded"
                                        onError={(
                                          e
                                        ) => {
                                          e.target.src =
                                            'https://via.placeholder.com/32';
                                        }}
                                      />
                                    )}

                                    <div className="flex-1">
                                      <h5 className="font-semibold text-gray-900 text-sm">
                                        {
                                          store.name
                                        }
                                      </h5>

                                      {store.title && (
                                        <p className="text-xs text-gray-500 line-clamp-1">
                                          {
                                            store.title
                                          }
                                        </p>
                                      )}

                                      {store.details_and_offers &&
                                        store
                                          .details_and_offers
                                          .length >
                                          0 && (
                                          <p className="text-xs text-green-600 mt-0.5">
                                            {store.details_and_offers
                                              .slice(
                                                0,
                                                2
                                              )
                                              .join(
                                                ' · '
                                              )}
                                          </p>
                                        )}
                                    </div>

                                    <div className="text-right">
                                      <p className="text-lg font-bold text-blue-600">
                                        ₹
                                        {store.extracted_price?.toLocaleString()}
                                      </p>

                                      {store.extracted_total &&
                                        store.extracted_total !==
                                          store.extracted_price && (
                                          <p className="text-xs text-gray-500">
                                            Total: ₹
                                            {store.extracted_total.toLocaleString()}
                                          </p>
                                        )}

                                      {store.rating && (
                                        <span className="text-xs text-yellow-600">
                                          {
                                            store.rating
                                          }{' '}
                                          ★ (
                                          {
                                            store.reviews
                                          }
                                          )
                                        </span>
                                      )}
                                    </div>

                                    {store.link && (
                                      <a
                                        href={
                                          store.link
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                                      >
                                        View Deal
                                      </a>
                                    )}
                                  </div>
                                )
                              )}
                          </div>
                        </div>
                      )}

                    {/* Store Disparity Analysis */}

                    {reviews?.store_disparity &&
                      Object.keys(
                        reviews.store_disparity
                      ).length > 1 && (
                        <div className="mb-8">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="material-icons text-blue-600 text-sm">
                              compare_arrows
                            </span>

                            Platform Comparison Research
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(
                              reviews.store_disparity
                            ).map(
                              (
                                store,
                                idx
                              ) => (
                                <div
                                  key={idx}
                                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-bold text-gray-800">
                                      {
                                        store.name
                                      }
                                    </span>

                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        store.positiveRate >
                                        70
                                          ? 'bg-green-100 text-green-700'
                                          : store.positiveRate >
                                              40
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {
                                        store.positiveRate
                                      }
                                      % POSITIVE
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                        <span>
                                          LOGISTICS
                                          &
                                          DELIVERY
                                        </span>

                                        <span className="font-bold text-gray-700">
                                          {store.logisticsRating !==
                                          'N/A'
                                            ? `${store.logisticsRating} Index`
                                            : 'N/A'}
                                        </span>
                                      </div>

                                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            parseFloat(
                                              store.logisticsRating
                                            ) > 0
                                              ? 'bg-blue-500'
                                              : 'bg-red-400'
                                          }`}
                                          style={{
                                            width:
                                              store.logisticsRating !==
                                              'N/A'
                                                ? `${Math.max(
                                                    0,
                                                    Math.min(
                                                      100,
                                                      (parseFloat(
                                                        store.logisticsRating
                                                      ) +
                                                        1) *
                                                        50
                                                    )
                                                  )}%`
                                                : '0%',
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] text-gray-400">
                                      <span>
                                        {store.total}{' '}
                                        samples
                                      </span>

                                      <span>
                                        {
                                          store.logisticsCount
                                        }{' '}
                                        logistics
                                        mentions
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          <p className="text-[10px] text-gray-400 mt-2 italic">
                            * Disparity analysis highlights differences in platform-specific service quality and seller reliability.
                          </p>
                        </div>
                      )}

                    {/* User Reviews */}

                    {reviews?.user_reviews &&
                      reviews.user_reviews.length >
                        0 && (
                        <div className="mb-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h4 className="font-semibold text-gray-800">
                              Review Sentiment Analysis
                            </h4>

                            {/* Sentiment Summary Badges */}

                            {reviews.user_reviews.some(
                              (r) => r.sentiment
                            ) && (
                              <div className="flex flex-wrap items-center gap-2">
                                {[
                                  'positive',
                                  'neutral',
                                  'negative',
                                ].map(
                                  (label) => {
                                    const count =
                                      reviews.user_reviews.filter(
                                        (r) =>
                                          r
                                            .sentiment
                                            ?.label ===
                                          label
                                      ).length;

                                    if (
                                      count ===
                                      0
                                    ) {
                                      return null;
                                    }

                                    return (
                                      <div
                                        key={
                                          label
                                        }
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                                          label ===
                                          'positive'
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : label ===
                                                'negative'
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : 'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}
                                      >
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            label ===
                                            'positive'
                                              ? 'bg-green-500'
                                              : label ===
                                                  'negative'
                                                ? 'bg-red-500'
                                                : 'bg-gray-400'
                                          }`}
                                        />

                                        <span className="text-[10px] font-bold uppercase">
                                          {label}:{' '}
                                          {Math.round(
                                            (count /
                                              reviews
                                                .user_reviews
                                                .length) *
                                              100
                                          )}
                                          %
                                        </span>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </div>

                          {/* Sentiment Pie Chart */}

                          {reviews.user_reviews.some(
                            (r) => r.sentiment
                          ) && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
                              <div className="h-64 w-full">
                                <ResponsiveContainer
                                  width="100%"
                                  height="100%"
                                >
                                  <PieChart>
                                    <Pie
                                      data={[
                                        {
                                          name: 'Positive',
                                          value:
                                            reviews.user_reviews.filter(
                                              (r) =>
                                                r
                                                  .sentiment
                                                  ?.label ===
                                                'positive'
                                            ).length,
                                        },
                                        {
                                          name: 'Neutral',
                                          value:
                                            reviews.user_reviews.filter(
                                              (r) =>
                                                r
                                                  .sentiment
                                                  ?.label ===
                                                'neutral'
                                            ).length,
                                        },
                                        {
                                          name: 'Negative',
                                          value:
                                            reviews.user_reviews.filter(
                                              (r) =>
                                                r
                                                  .sentiment
                                                  ?.label ===
                                                'negative'
                                            ).length,
                                        },
                                      ].filter(
                                        (d) =>
                                          d.value >
                                          0
                                      )}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                    >
                                      {[
                                        {
                                          name: 'Positive',
                                          color: '#10B981',
                                        },
                                        {
                                          name: 'Neutral',
                                          color: '#9CA3AF',
                                        },
                                        {
                                          name: 'Negative',
                                          color: '#EF4444',
                                        },
                                      ]
                                        .filter(
                                          (c) =>
                                            reviews.user_reviews.some(
                                              (r) =>
                                                r
                                                  .sentiment
                                                  ?.label ===
                                                c.name.toLowerCase()
                                            )
                                        )
                                        .map(
                                          (
                                            entry,
                                            index
                                          ) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                entry.color
                                              }
                                            />
                                          )
                                        )}
                                    </Pie>

                                    <Tooltip
                                      contentStyle={{
                                        borderRadius:
                                          '8px',
                                        border:
                                          'none',
                                        boxShadow:
                                          '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                      }}
                                    />

                                    <Legend
                                      verticalAlign="bottom"
                                      height={36}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>

                              <p className="text-center text-xs text-gray-500 mt-2 italic">
                                Overall user sentiment based on{' '}
                                {
                                  reviews.user_reviews
                                    .length
                                }{' '}
                                reviews
                              </p>
                            </div>
                          )}

                          <h4 className="font-semibold text-gray-800 mb-3">
                            What Users Are Saying
                          </h4>

                          <div className="space-y-3">
                            {reviews.user_reviews
                              .slice(0, 8)
                              .map(
                                (
                                  review,
                                  idx
                                ) => (
                                  <div
                                    key={idx}
                                    className="p-4 bg-gray-50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      {review.icon && (
                                        <img
                                          src={
                                            review.icon
                                          }
                                          alt=""
                                          className="w-7 h-7 rounded-full"
                                          onError={(
                                            e
                                          ) => {
                                            e.target.style.display =
                                              'none';
                                          }}
                                        />
                                      )}

                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-gray-700">
                                          {review.source ||
                                            'Anonymous'}
                                        </span>

                                        {review.rating && (
                                          <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                                            <span className="material-icons text-xs">
                                              star
                                            </span>

                                            {
                                              review.rating
                                            }
                                          </span>
                                        )}

                                        {review.date && (
                                          <span className="text-xs text-gray-400">
                                            ·{' '}
                                            {
                                              review.date
                                            }
                                          </span>
                                        )}

                                        {review.sentiment && (
                                          <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                              review.sentiment
                                                .label ===
                                              'positive'
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : review.sentiment
                                                      .label ===
                                                    'negative'
                                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                                            }`}
                                          >
                                            {
                                              review
                                                .sentiment
                                                .label
                                            }{' '}
                                            {review
                                              .sentiment
                                              .stars &&
                                              `(${review.sentiment.stars}★)`}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-gray-700 text-sm leading-relaxed">
                                      {review.text}
                                    </p>

                                    {/* Review Images */}

                                    {review.images &&
                                      review.images.length >
                                        0 && (
                                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                          {review.images
                                            .slice(
                                              0,
                                              4
                                            )
                                            .map(
                                              (
                                                img,
                                                imgIdx
                                              ) => (
                                                <img
                                                  key={
                                                    imgIdx
                                                  }
                                                  src={
                                                    img
                                                  }
                                                  alt={`Review image ${
                                                    imgIdx +
                                                    1
                                                  }`}
                                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                                  onError={(
                                                    e
                                                  ) => {
                                                    e.target.style.display =
                                                      'none';
                                                  }}
                                                />
                                              )
                                            )}
                                        </div>
                                      )}
                                  </div>
                                )
                              )}
                          </div>
                        </div>
                      )}

                    {/* Videos */}

                    {reviews?.videos &&
                      reviews.videos.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-800 mb-3">
                            Product Videos
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {reviews.videos
                              .slice(0, 6)
                              .map(
                                (
                                  video,
                                  idx
                                ) => (
                                  <a
                                    key={idx}
                                    href={
                                      video.link
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative rounded-lg overflow-hidden bg-gray-100 group"
                                  >
                                    {video.thumbnail && (
                                      <img
                                        src={
                                          video.thumbnail
                                        }
                                        alt={
                                          video.title ||
                                          'Product video'
                                        }
                                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                                      />
                                    )}

                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                                      <span className="material-icons text-white text-4xl drop-shadow">
                                        play_circle
                                      </span>
                                    </div>
                                  </a>
                                )
                              )}
                          </div>
                        </div>
                      )}

                    {/* AI / Price Integrity */}

                    {reviews?.price_integrity && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="material-icons text-purple-600 text-sm">
                            verified
                          </span>

                          Price Integrity Analysis
                        </h4>

                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <span className="text-xs text-purple-600 uppercase font-semibold">
                                Score
                              </span>

                              <div className="text-2xl font-bold text-purple-800">
                                {reviews.price_integrity.score ??
                                  100}
                                /100
                              </div>
                            </div>

                            <div>
                              <span className="text-xs text-purple-600 uppercase font-semibold">
                                Status
                              </span>

                              <div className="text-sm font-semibold text-purple-800 mt-1">
                                {reviews.price_integrity.status ||
                                  'Analyzed'}
                              </div>
                            </div>

                            <div>
                              <span className="text-xs text-purple-600 uppercase font-semibold">
                                Records
                              </span>

                              <div className="text-sm font-semibold text-purple-800 mt-1">
                                {reviews.price_integrity.records ??
                                  priceHistory.length}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Advisor */}

                    {reviews?.ai_advisor && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="material-icons text-indigo-600 text-sm">
                            smart_toy
                          </span>

                          AI Buying Advisor
                        </h4>

                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="material-icons text-indigo-600">
                                psychology
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-bold text-indigo-800">
                                  {reviews.ai_advisor.recommendation ||
                                    (isBestTime
                                      ? 'BUY NOW'
                                      : 'WAIT')}
                                </span>

                                {reviews.ai_advisor.confidence != null && (
                                  <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                    {reviews.ai_advisor.confidence}% confidence
                                  </span>
                                )}
                              </div>

                              {reviews.ai_advisor.reason && (
                                <p className="text-sm text-indigo-700 mt-2 leading-relaxed">
                                  {reviews.ai_advisor.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Aspect Sentiment */}

                    {reviews?.aspect_sentiment &&
                      Object.keys(
                        reviews.aspect_sentiment
                      ).length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="material-icons text-orange-600 text-sm">
                              insights
                            </span>

                            Aspect-Based Sentiment Analysis
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(
                              reviews.aspect_sentiment
                            ).map(
                              (
                                [aspect, data],
                                idx
                              ) => (
                                <div
                                  key={idx}
                                  className="border border-gray-200 rounded-xl p-4"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-800 capitalize">
                                      {aspect}
                                    </span>

                                    <span className="text-sm font-bold text-orange-600">
                                      {data.rating ??
                                        'N/A'}
                                      {data.rating !=
                                        null &&
                                        '/10'}
                                    </span>
                                  </div>

                                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-orange-500 rounded-full"
                                      style={{
                                        width:
                                          data.rating !=
                                          null
                                            ? `${Math.max(
                                                0,
                                                Math.min(
                                                  100,
                                                  Number(
                                                    data.rating
                                                  ) *
                                                    10
                                                )
                                              )}%`
                                            : '0%',
                                      }}
                                    />
                                  </div>

                                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>
                                      {data.mentions ??
                                        0}{' '}
                                      mentions
                                    </span>

                                    {data.status && (
                                      <span>
                                        {data.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Review Credibility */}

                    {reviews?.review_credibility && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="material-icons text-teal-600 text-sm">
                            security
                          </span>

                          Review Credibility
                        </h4>

                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-teal-600 uppercase font-semibold">
                                Credibility Score
                              </p>

                              <p className="text-2xl font-bold text-teal-800">
                                {reviews.review_credibility.score ??
                                  100}
                                /100
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-teal-600">
                                Analyzed Reviews
                              </p>

                              <p className="font-bold text-teal-800">
                                {reviews.review_credibility.analyzed ??
                                  reviews.user_reviews?.length ??
                                  0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VFM */}

                    {reviews?.vfm_index != null && (
                      <div className="mb-2">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="material-icons text-green-600 text-sm">
                            savings
                          </span>

                          Value For Money Index
                        </h4>

                        <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full border-8 border-green-200 flex items-center justify-center bg-white">
                              <span className="text-xl font-bold text-green-700">
                                {reviews.vfm_index}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-green-800">
                                Value For Money
                              </p>

                              <p className="text-sm text-green-700 mt-1">
                                Based on price position and available shopping offers.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
