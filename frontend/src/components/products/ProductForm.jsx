import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { 
  FiSave, 
  FiX, 
  FiCamera, 
  FiUpload,
  FiPackage,
  FiPlus,
  FiSearch,
  FiChevronDown
} from 'react-icons/fi';
import api from '../../services/api';
import { useBarcodeScanner } from '../../utils/camera';
import CategoryForm from '../categories/CategoryForm';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  
  const categoryRef = useRef(null);
  const brandRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    mrp: '',
    price: '',
    barcode: '',
    description: '',
    tax: 0
  });

  const { startScanning, BarcodeScanner } = useBarcodeScanner((barcode) => {
    setFormData({ ...formData, barcode });
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      if (brandRef.current && !brandRef.current.contains(event.target)) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories based on search
  useEffect(() => {
    if (categorySearch) {
      const filtered = categories.filter(cat => 
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [categorySearch, categories]);

  // Filter brands based on search
  useEffect(() => {
    if (brandSearch) {
      const filtered = brands.filter(b => 
        b.name.toLowerCase().includes(brandSearch.toLowerCase())
      );
      setFilteredBrands(filtered);
    } else {
      setFilteredBrands(brands);
    }
  }, [brandSearch, brands]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?type=main');
      setCategories(response.data);
      setFilteredCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await api.get('/categories/brands');
      setBrands(response.data);
      setFilteredBrands(response.data);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      const product = response.data;
      setFormData({
        name: product.name || '',
        category: product.category?._id || '',
        brand: product.brand?._id || '',
        mrp: product.mrp || '',
        price: product.price || '',
        barcode: product.barcode || '',
        description: product.description || '',
        tax: product.tax || 0
      });
      if (product.image) {
        setImagePreview(product.image);
      }
    } catch (error) {
      toast.error('Failed to fetch product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setFormData({ ...formData, category: categoryId });
    setShowCategoryDropdown(false);
    setCategorySearch('');
  };

  const handleBrandSelect = (brandId) => {
    setFormData({ ...formData, brand: brandId });
    setShowBrandDropdown(false);
    setBrandSearch('');
  };

  const handleCategoryCreated = (newCategory) => {
    setCategories([...categories, newCategory]);
    setFilteredCategories([...categories, newCategory]);
    setFormData({ ...formData, category: newCategory._id });
    setShowCategoryModal(false);
    toast.success('Category added successfully');
  };

  const handleBrandCreated = (newBrand) => {
    setBrands([...brands, newBrand]);
    setFilteredBrands([...brands, newBrand]);
    setFormData({ ...formData, brand: newBrand._id });
    setShowBrandModal(false);
    toast.success('Brand added successfully');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation - only check required fields
    if (!formData.name || !formData.category || !formData.mrp || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.price) > parseFloat(formData.mrp)) {
      toast.error('Selling price cannot be greater than MRP');
      return;
    }

    try {
      setLoading(true);
      
      // Create FormData for image upload
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          submitData.append(key, formData[key]);
        }
      });
      
      if (imageFile) {
        submitData.append('image', imageFile);
      }
      
      if (id) {
        await api.put(`/products/${id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product added successfully');
      }
      
      navigate('/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c._id === id);
    return cat ? cat.name : 'Select category';
  };

  const getBrandName = (id) => {
    const brand = brands.find(b => b._id === id);
    return brand ? brand.name : 'Select brand (optional)';
  };

  if (loading && id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? 'Edit Product' : 'Add New Product'}
          </h1>
          <button
            onClick={() => navigate('/products')}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Image */}
          <div className="flex items-center space-x-6">
            <div className="shrink-0">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                  <FiPackage className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image"
                />
                <label
                  htmlFor="product-image"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center"
                >
                  <FiUpload className="mr-2" />
                  Choose File
                </label>
                <span className="text-sm text-gray-500">
                  {imageFile ? imageFile.name : 'No file chosen'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Upload product image (optional)</p>
            </div>
          </div>

          {/* Product Name - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Brand - Optional with search and add */}
          <div ref={brandRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className="w-full input-field text-left flex justify-between items-center"
                >
                  <span className={formData.brand ? 'text-gray-900' : 'text-gray-400'}>
                    {getBrandName(formData.brand)}
                  </span>
                  <FiChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {showBrandDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          placeholder="Search brands..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBrandModal(true);
                          setShowBrandDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-primary-50 text-primary-600 font-medium flex items-center border-b"
                      >
                        <FiPlus className="mr-2" />
                        Add New Brand
                      </button>
                      {filteredBrands.map(brand => (
                        <button
                          key={brand._id}
                          type="button"
                          onClick={() => handleBrandSelect(brand._id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          {brand.name}
                        </button>
                      ))}
                      {filteredBrands.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No brands found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category - Required with search and add */}
          <div ref={categoryRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full input-field text-left flex justify-between items-center"
                >
                  <span className={formData.category ? 'text-gray-900' : 'text-gray-400'}>
                    {getCategoryName(formData.category)}
                  </span>
                  <FiChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {showCategoryDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search categories..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryModal(true);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-primary-50 text-primary-600 font-medium flex items-center border-b"
                      >
                        <FiPlus className="mr-2" />
                        Add New Category
                      </button>
                      {filteredCategories.map(cat => (
                        <button
                          key={cat._id}
                          type="button"
                          onClick={() => handleCategorySelect(cat._id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          {cat.name}
                        </button>
                      ))}
                      {filteredCategories.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No categories found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">e.g., Face Wash, Cream, Jewelry, etc.</p>
          </div>

          {/* Barcode/SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode / SKU
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="input-field flex-1"
                placeholder="Enter barcode or SKU (optional)"
              />
              <button
                type="button"
                onClick={startScanning}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                title="Scan barcode"
              >
                <FiCamera className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Price - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="input-field"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* MRP - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MRP (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="mrp"
              value={formData.mrp}
              onChange={handleChange}
              className="input-field"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Maximum Retail Price</p>
          </div>

          {/* Description - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="input-field"
              placeholder="Enter product description (optional)"
            ></textarea>
          </div>

          {/* Tax - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax (%) <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="number"
              name="tax"
              value={formData.tax}
              onChange={handleChange}
              className="input-field"
              placeholder="0"
              min="0"
              max="100"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  {id ? 'Update Product' : 'Add Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

       {/* Category Modal */}
      {showCategoryModal && (
        <CategoryForm
          onClose={() => setShowCategoryModal(false)}
          onSuccess={handleCategoryCreated}
        />
      )}

      {/* Brand Modal */}
      {showBrandModal && (
        <CategoryForm
          category={{ type: 'brand' }}
          onClose={() => setShowBrandModal(false)}
          onSuccess={handleBrandCreated}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner />
    </div>
  );
};

export default ProductForm;