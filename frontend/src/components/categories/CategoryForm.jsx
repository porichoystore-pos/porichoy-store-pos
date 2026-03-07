import React, { useState } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const CategoryForm = ({ category, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Determine if this is a brand form (based on category prop having type 'brand')
  const isBrand = category?.type === 'brand';
  
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#3B82F6',
    type: category?.type || 'main' // Default to 'main' for categories, 'brand' for brands
  });

  const toast = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error(`${isBrand ? 'Brand' : 'Category'} name is required`);
      return;
    }

    try {
      setLoading(true);
      
      let response;
      // Check if we're editing an existing item (has _id)
      if (category?._id) {
        response = await api.put(`/categories/${category._id}`, formData);
        toast.success(`${isBrand ? 'Brand' : 'Category'} updated successfully`);
      } else {
        // Creating new category or brand
        response = await api.post('/categories', formData);
        toast.success(`${isBrand ? 'Brand' : 'Category'} created successfully`);
      }
      
      onSuccess(response.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to save ${isBrand ? 'brand' : 'category'}`);
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6B7280', '#1F2937'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {category?._id 
              ? `Edit ${isBrand ? 'Brand' : 'Category'}` 
              : `Add New ${isBrand ? 'Brand' : 'Category'}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isBrand ? 'Brand Name' : 'Category Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder={`Enter ${isBrand ? 'brand' : 'category'} name`}
              required
              autoFocus
            />
          </div>

          {/* Description - Only for categories, not for brands */}
          {!isBrand && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="input-field"
                placeholder="Enter category description"
              ></textarea>
            </div>
          )}

          {/* Color - Only for categories, not for brands */}
          {!isBrand && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-10 h-10 rounded border border-gray-300"
                />
                <span className="text-sm text-gray-600">{formData.color}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: formData.color === color ? '#000' : 'transparent'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hidden type field */}
          <input type="hidden" name="type" value={formData.type} />

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  {category?._id ? 'Update' : 'Save'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;