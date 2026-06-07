import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = process.env.REACT_APP_API_URL;

const PriceHistory = () => {
    const [searchParams] = useSearchParams();
    const [historyData, setHistoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [productReviews, setProductReviews] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const productName = searchParams.get('product');

    useEffect(() => {
        fetchCategories();
        fetchAllProducts();
    }, []);

    useEffect(() => {
        if (productName) {
            setSelectedProduct(productName);
            fetchPriceHistory(productName);
        }
    }, [productName]);

    useEffect(() => {
        if (selectedCategory !== 'all') {
            fetchProductsByCategory(selectedCategory);
        } else {
            fetchAllProducts();
        }
    }, [selectedCategory]);

    useEffect(() => {
        if (selectedProduct) {
            fetchProductReviews(selectedProduct);
        } else {
            setProductReviews(null);
        }
    }, [selectedProduct]);

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API}/price-history/categories/list`);
            if (response.ok) {
                const data = await response.json();
                setCategories(data.categories || []);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchAllProducts = async () => {
        try {
            const response = await fetch(`${API}/price-history`);
            if (response.ok) {
                const data = await response.json();
                setAllProducts(data.products || []);
                setCategories(data.categories || categories);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchProductsByCategory = async (category) => {
        try {
            const response = await fetch(`${API}/price-history?category=${encodeURIComponent(category)}`);
            if (response.ok) {
                const data = await response.json();
                setAllProducts(data.products || []);
            }
        } catch (err) {
            console.error('Error fetching products by category:', err);
        }
    };

    const fetchPriceHistory = async (product) => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API}/price-history/${encodeURIComponent(product)}`);

            const data = await response.json();
            console.log('Price history data:', data);

            if (data.history?.length > 0) {
                setHistoryData(data);
                setError(null);
            } else {
                setHistoryData(null);
                setError(`No price history found for "${product}". Search for this product to start tracking.`);
            }
        } catch (err) {
            setError(err.message);
            setHistoryData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleProductSelect = (e) => {
        const product = e.target.value;
        setSelectedProduct(product);
        if (product) {
            fetchPriceHistory(product);
        }
    };

    const fetchProductReviews = async (query) => {
        try {
            setReviewsLoading(true);
            const response = await fetch(`${API}/reviews?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                setProductReviews(data);
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setReviewsLoading(false);
        }
    };

    // Format data for chart
    const chartData = historyData?.history?.map(item => ({
        date: item.date,
        price: item.price,
        store: item.store,
        fullDate: `${item.date} ${item.time}`
    })) || [];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-900">₹{payload[0].value}</p>
                    <p className="text-xs text-slate-500">{payload[0].payload.store}</p>
                    <p className="text-xs text-slate-400">{payload[0].payload.fullDate}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-background-light min-h-screen font-display text-slate-900 py-8">
            <main className="max-w-7xl mx-auto px-4">
                <div className="mb-8">
                    <Link to="/" className="text-primary hover:underline flex items-center gap-1 mb-4">
                        <span className="material-icons text-sm">arrow_back</span>
                        Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Price History Tracker</h1>
                    <p className="text-slate-500">Track price trends and find the best time to buy</p>
                </div>

                {/* Category Filter */}
                <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        Filter by Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                selectedCategory === 'all'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All Categories
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedCategory === category
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Selector */}
                <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        Select Product to View History
                        {selectedCategory !== 'all' && (
                            <span className="ml-2 text-xs text-blue-600">
                                (Filtered: {selectedCategory})
                            </span>
                        )}
                    </label>
                    <select
                        value={selectedProduct}
                        onChange={handleProductSelect}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                        <option value="">-- Choose a product --</option>
                        {allProducts.map((product, index) => (
                            <option key={index} value={typeof product === 'string' ? product : product.name}>
                                {typeof product === 'string' ? product : product.name}
                                {typeof product !== 'string' && product.category && ` (${product.category})`}
                            </option>
                        ))}
                    </select>
                    {allProducts.length === 0 && !loading && (
                        <p className="text-sm text-gray-500 mt-2">
                            No products found {selectedCategory !== 'all' ? `in ${selectedCategory}` : ''}.
                        </p>
                    )}
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <span className="material-icons text-red-500 text-5xl mb-4">error_outline</span>
                        <h3 className="font-bold text-red-700 mb-2">No Data Found</h3>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {historyData && !loading && (
                    <>
                        {/* Price Analysis Card */}
                        <div className={`rounded-xl p-6 shadow-lg mb-8 ${historyData.analysis.isBestTimeToBuy
                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                                : 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200'
                            }`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${historyData.analysis.isBestTimeToBuy ? 'bg-green-100' : 'bg-orange-100'
                                    }`}>
                                    <span className={`material-icons text-3xl ${historyData.analysis.isBestTimeToBuy ? 'text-green-600' : 'text-orange-600'
                                        }`}>
                                        {historyData.analysis.isBestTimeToBuy ? 'check_circle' : 'schedule'}
                                    </span>
                                </div>
                                <div className="flex-grow">
                                    <h2 className={`text-2xl font-bold mb-2 ${historyData.analysis.isBestTimeToBuy ? 'text-green-800' : 'text-orange-800'
                                        }`}>
                                        {historyData.analysis.isBestTimeToBuy ? '✓ Great Time to Buy!' : '⏳ Consider Waiting'}
                                    </h2>
                                    <p className={`text-lg ${historyData.analysis.isBestTimeToBuy ? 'text-green-700' : 'text-orange-700'
                                        }`}>
                                        {historyData.analysis.recommendation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Price Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="material-icons text-primary">trending_down</span>
                                    <span className="text-sm font-medium text-slate-600">Current Price</span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900">₹{historyData.analysis.currentPrice}</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="material-icons text-green-600">arrow_downward</span>
                                    <span className="text-sm font-medium text-slate-600">Lowest Price</span>
                                </div>
                                <p className="text-3xl font-bold text-green-600">₹{historyData.analysis.minPrice}</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="material-icons text-red-600">arrow_upward</span>
                                    <span className="text-sm font-medium text-slate-600">Highest Price</span>
                                </div>
                                <p className="text-3xl font-bold text-red-600">₹{historyData.analysis.maxPrice}</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="material-icons text-blue-600">show_chart</span>
                                    <span className="text-sm font-medium text-slate-600">Average Price</span>
                                </div>
                                <p className="text-3xl font-bold text-blue-600">₹{historyData.analysis.avgPrice}</p>
                            </div>
                        </div>

                        {/* Price Chart */}
                        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="material-icons text-primary">timeline</span>
                                Price Trend Over Time
                            </h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        style={{ fontSize: '12px' }}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        stroke="#0d7ff2"
                                        strokeWidth={3}
                                        dot={{ fill: '#0d7ff2', r: 5 }}
                                        activeDot={{ r: 8 }}
                                        name="Price (INR)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Product Reviews Section */}
                        {reviewsLoading && (
                            <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
                                <div className="flex justify-center items-center py-8">
                                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="ml-3 text-slate-600">Loading reviews...</span>
                                </div>
                            </div>
                        )}

                        {productReviews && !reviewsLoading && (
                            <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="material-icons text-primary">rate_review</span>
                                    Product Reviews & Pricing
                                </h3>

                                {/* Product Info */}
                                <div className="flex items-start gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                                    {productReviews.thumbnails && productReviews.thumbnails.length > 0 && (
                                        <img
                                            src={productReviews.thumbnails[0]}
                                            alt={productReviews.title}
                                            className="w-20 h-20 object-cover rounded-lg"
                                        />
                                    )}
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-lg text-slate-900">{productReviews.title}</h4>
                                        {productReviews.description && (
                                            <p className="text-sm text-slate-600 mt-1">{productReviews.description}</p>
                                        )}
                                        {productReviews.typical_price && (
                                            <p className="text-sm text-blue-600 font-medium mt-2">
                                                {productReviews.typical_price}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Rating Summary */}
                                {productReviews.rating && (
                                    <div className="flex items-center gap-4 mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-yellow-500 text-3xl">star</span>
                                            <span className="text-3xl font-bold text-slate-900">{productReviews.rating}</span>
                                        </div>
                                        {productReviews.reviews && (
                                            <span className="text-slate-600">
                                                ({typeof productReviews.reviews === 'number'
                                                    ? productReviews.reviews.toLocaleString()
                                                    : productReviews.reviews} reviews)
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* User Reviews */}
                                {productReviews.reviews_results?.user_reviews?.review && (
                                    <div className="mb-6">
                                        <h4 className="font-semibold text-slate-800 mb-4">What Users Are Saying</h4>
                                        <div className="grid gap-4">
                                            {productReviews.reviews_results.user_reviews.review.slice(0, 5).map((review, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                                                    {review.avatar && (
                                                        <img
                                                            src={review.avatar}
                                                            alt="User"
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    )}
                                                    <p className="text-slate-700 text-sm flex-grow">{review.snippet}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pricing Comparison */}
                                {productReviews.pricing && productReviews.pricing.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-4">Compare Prices</h4>
                                        <div className="grid gap-4">
                                            {productReviews.pricing.map((price, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:border-primary transition-colors">
                                                    {price.thumbnail && (
                                                        <img
                                                            src={price.thumbnail}
                                                            alt={price.name}
                                                            className="w-16 h-16 object-cover rounded-lg"
                                                        />
                                                    )}
                                                    <div className="flex-grow">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h5 className="font-semibold text-slate-900">{price.name}</h5>
                                                                {price.description && (
                                                                    <p className="text-sm text-slate-500">{price.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-2xl font-bold text-primary">${price.extracted_price}</p>
                                                                {price.original_price && (
                                                                    <p className="text-sm text-slate-400 line-through">
                                                                        {price.original_price}
                                                                    </p>
                                                                )}
                                                                {price.tag && (
                                                                    <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded">
                                                                        {price.tag}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {price.buying_options && price.buying_options.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {price.buying_options.map((option, optIdx) => (
                                                                    <span key={optIdx} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                                        {option}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {price.link && (
                                                        <a
                                                            href={price.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                                        >
                                                            View Deal
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Price History Table */}
                        <div className="bg-white rounded-xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="material-icons text-primary">history</span>
                                Complete Price History ({historyData.analysis.totalRecords} records)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Date & Time</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Price</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Store</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyData?.history?.slice().reverse().map((item, index) => (
                                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 text-sm text-slate-600">
                                                    {item.date} {item.time}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`font-bold ${item.price === historyData.analysis.minPrice
                                                            ? 'text-green-600'
                                                            : item.price === historyData.analysis.maxPrice
                                                                ? 'text-red-600'
                                                                : 'text-slate-900'
                                                        }`}>
                                                        ₹{item.price}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-600">{item.store}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default PriceHistory;
