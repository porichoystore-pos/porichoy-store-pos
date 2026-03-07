import React, { useState, useRef, useEffect } from 'react';
import { FiCamera, FiX, FiUpload, FiLoader, FiPackage, FiSearch, FiCpu } from 'react-icons/fi';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';

const VisualSearch = ({ onResult, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [extractedKeywords, setExtractedKeywords] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [searchMethod, setSearchMethod] = useState('ai'); // 'ai' or 'ocr'
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  // Load TensorFlow MobileNet model
  useEffect(() => {
    loadAIModel();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const loadAIModel = async () => {
    try {
      setModelLoading(true);
      setProgress(30);
      await tf.ready();
      setProgress(60);
      const loadedModel = await mobilenet.load();
      setProgress(100);
      setModel(loadedModel);
      console.log('✅ AI Model loaded successfully');
      setModelLoading(false);
    } catch (err) {
      console.error('Error loading AI model:', err);
      setError('Failed to load AI model. Using text search instead.');
      setModelLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      setPreview(imageData);
      
      // Convert canvas to blob for AI processing
      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        processImageWithAI(file);
      }, 'image/jpeg');
      
      stopCamera();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        processImageWithAI(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageWithAI = async (file) => {
    if (!model) {
      // Fallback to text extraction if AI model not loaded
      extractTextFromFilename(file);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSearchResults([]);
      setExtractedKeywords([]);

      // Create image element for TensorFlow
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Classify image with MobileNet
      const predictions = await model.classify(img);
      console.log('🔍 AI Predictions:', predictions);

      // Extract meaningful keywords from predictions
      const keywords = predictions
        .map(p => {
          // Clean up the prediction text
          const cleanText = p.className
            .split(',')[0]  // Take first part before comma
            .trim()
            .toLowerCase()
            .replace(/[^a-z\s]/g, ''); // Remove special characters
          
          return {
            text: cleanText,
            confidence: p.probability
          };
        })
        .filter(k => k.confidence > 0.1 && k.text.length > 3); // Filter low confidence

      setExtractedKeywords(keywords.map(k => k.text));
      
      // Search products with these keywords
      await searchProductsByAI(keywords);
      
      URL.revokeObjectURL(img.src);
    } catch (err) {
      console.error('Error processing image with AI:', err);
      // Fallback to text extraction
      extractTextFromFilename(file);
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromFilename = (file) => {
    // Fallback method: extract from filename
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const words = fileName.split(/[\s_-]+/)
      .filter(w => w.length > 2)
      .map(w => w.toLowerCase());
    
    setExtractedKeywords(words);
    searchProducts(words.join(' '));
  };

  const searchProductsByAI = async (keywords) => {
    try {
      // Try searching with each high-confidence keyword
      let allResults = [];
      
      for (const keyword of keywords) {
        if (keyword.confidence > 0.2) { // Only use high confidence keywords
          const response = await api.get(`/products/search?q=${encodeURIComponent(keyword.text)}`);
          if (response.data.length > 0) {
            allResults = [...allResults, ...response.data];
          }
        }
      }

      // If no results with high confidence, try lower confidence keywords
      if (allResults.length === 0) {
        for (const keyword of keywords) {
          const response = await api.get(`/products/search?q=${encodeURIComponent(keyword.text)}`);
          if (response.data.length > 0) {
            allResults = [...allResults, ...response.data];
          }
        }
      }

      // Remove duplicates
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item._id, item])).values()
      );

      // Sort by relevance (simple scoring)
      const scoredResults = uniqueResults.map(product => {
        let score = 0;
        const productName = product.name.toLowerCase();
        
        keywords.forEach(keyword => {
          if (productName.includes(keyword.text)) {
            score += keyword.confidence * 10;
          }
          if (product.category?.name?.toLowerCase().includes(keyword.text)) {
            score += keyword.confidence * 5;
          }
          if (product.brand?.name?.toLowerCase().includes(keyword.text)) {
            score += keyword.confidence * 3;
          }
        });
        
        return { ...product, score };
      });

      scoredResults.sort((a, b) => b.score - a.score);
      
      if (scoredResults.length > 0) {
        setSearchResults(scoredResults);
      } else {
        setError('No matching products found. Try searching manually below.');
      }
    } catch (err) {
      console.error('Error searching products:', err);
      setError('Failed to search products');
    }
  };

  const searchProducts = async (query) => {
    if (!query || query.length < 2) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/products/search?q=${encodeURIComponent(query)}`);
      
      if (response.data.length > 0) {
        setSearchResults(response.data);
      } else {
        setError('No matching products found. Try searching manually below.');
      }
    } catch (err) {
      console.error('Error searching products:', err);
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (manualSearch.trim()) {
      setSearchMethod('text');
      searchProducts(manualSearch);
    }
  };

  const selectProduct = (product) => {
    onResult(product);
    onClose();
  };

  const resetSearch = () => {
    setPreview(null);
    setSearchResults([]);
    setError(null);
    setExtractedKeywords([]);
    setManualSearch('');
    setSearchMethod('ai');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b sticky top-0 bg-white flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center">
            <FiCamera className="mr-2 text-primary-600" />
            Visual Product Search
            {model && <FiCpu className="ml-2 text-green-500" title="AI Powered" />}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Model Loading Progress */}
          {modelLoading && !preview && (
            <div className="text-center py-8">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"
                  style={{ transform: `rotate(${progress * 3.6}deg)` }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary-600">
                  {progress}%
                </span>
              </div>
              <p className="text-gray-600">Loading AI Model...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
            </div>
          )}

          {!modelLoading && !preview && (
            <div className="space-y-4 sm:space-y-6">
              {/* Camera and Upload Options */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={startCamera}
                  className="p-4 sm:p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <FiCamera className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-sm sm:text-lg font-medium text-gray-700">Use Camera</p>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Take a photo of the product</p>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 sm:p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <FiUpload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-sm sm:text-lg font-medium text-gray-700">Upload Image</p>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Select from gallery</p>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Manual Search Option */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Or search manually:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                    placeholder="Enter product name..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleManualSearch}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center text-sm"
                  >
                    <FiSearch className="mr-2" />
                    Search
                  </button>
                </div>
              </div>

              {/* Camera Preview */}
              {cameraActive && (
                <div className="relative mt-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                    <button
                      onClick={captureImage}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center text-sm"
                    >
                      <FiCamera className="mr-2" />
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Preview */}
          {preview && (
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-medium">Captured Image</h3>
                <button
                  onClick={resetSearch}
                  className="text-xs sm:text-sm text-primary-600 hover:text-primary-700"
                >
                  Try Another
                </button>
              </div>
              <img src={preview} alt="Preview" className="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-lg mx-auto border-2 border-gray-200" />
              
              {extractedKeywords.length > 0 && (
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">
                    AI detected:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {extractedKeywords.map((keyword, index) => (
                      <span key={index} className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-6 sm:py-8">
              <FiLoader className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 animate-spin mx-auto mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base text-gray-600">AI is analyzing image and searching products...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg text-center mb-4 sm:mb-6">
              <p className="text-sm sm:text-base">{error}</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !loading && (
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">
                Matching Products ({searchResults.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => selectProduct(product)}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-primary-500 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start space-x-3">
                      {product.image ? (
                        <img 
                          src={`http://localhost:5000${product.image}`} 
                          alt={product.name} 
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded flex items-center justify-center">
                          <FiPackage className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">
                          {product.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1 line-clamp-1">
                          {product.category?.name}
                          {product.brand && ` • ${product.brand?.name}`}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-primary-600">
                          {formatCurrency(product.price)}
                        </p>
                        {product.score && (
                          <p className="text-xs text-gray-400 mt-1">
                            Match: {Math.round(product.score)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualSearch;