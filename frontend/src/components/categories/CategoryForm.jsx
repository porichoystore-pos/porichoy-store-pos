import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiPackage, FiTag } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const TYPES = [
  { id: 'main', label: 'Main Category', desc: 'Top-level grouping (e.g. Face Care)' },
  { id: 'sub', label: 'Subcategory', desc: 'Nested under a main category' },
  { id: 'brand', label: 'Brand', desc: 'Product brand (e.g. Lakme)' }
];

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6B7280', '#1F2937'
];

const CategoryForm = ({ category, onClose, onSuccess }) => {
  const isEdit = Boolean(category?._id);
  const [loading, setLoading] = useState(false);
  const [mainCategories, setMainCategories] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#3B82F6',
    type: category?.type || 'main',
    parentCategory: category?.parentCategory?._id || category?.parentCategory || ''
  });

  const toast = useToast();
  const isBrand = formData.type === 'brand';

  // Load main categories for the parent selector
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/categories?type=main');
        // Exclude self when editing (a category can't be its own parent)
        setMainCategories((res.data || []).filter((c) => c._id !== category?._id));
      } catch {
        setMainCategories([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const next = {};
    if (!formData.name.trim()) next.name = 'Name is required';
    if (formData.type === 'sub' && !formData.parentCategory) {
      next.parentCategory = 'Choose a parent category';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description,
        color: isBrand ? undefined : formData.color,
        type: formData.type,
        parentCategory: formData.type === 'sub' ? formData.parentCategory : null
      };

      const response = isEdit
        ? await api.put(`/categories/${category._id}`, payload)
        : await api.post('/categories', payload);

      toast.success(
        `${isBrand ? 'Brand' : 'Category'} ${isEdit ? 'updated' : 'created'} successfully`
      );
      onSuccess(response.data);
      onClose();
    } catch (error) {
      const msg = error.response?.data?.message || `Failed to save ${isBrand ? 'brand' : 'category'}`;
      if (/already exists/i.test(msg)) {
        setErrors((prev) => ({ ...prev, name: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-backdrop"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl animate-modal max-h-[92vh] overflow-y-auto pb-safe">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-gray-100 rounded-t-2xl sm:rounded-t-xl">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit' : 'Add'} {isBrand ? 'Brand' : formData.type === 'sub' ? 'Subcategory' : 'Category'}
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="input-label">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: t.id,
                      parentCategory: t.id === 'sub' ? prev.parentCategory : ''
                    }))
                  }
                  className={`py-2 px-1 rounded-lg border-2 text-xs font-medium transition-all ${
                    formData.type === t.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  title={t.desc}
                >
                  {t.id === 'brand' ? 'Brand' : t.id === 'sub' ? 'Sub' : 'Main'}
                </button>
              ))}
            </div>
            {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="input-label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input-field ${errors.name ? 'input-error' : ''}`}
              placeholder={`Enter ${isBrand ? 'brand' : 'category'} name`}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Parent category (only for sub) */}
          {formData.type === 'sub' && (
            <div>
              <label className="input-label">
                Parent Category <span className="text-red-500">*</span>
              </label>
              <select
                name="parentCategory"
                value={formData.parentCategory}
                onChange={handleChange}
                className={`input-field ${errors.parentCategory ? 'input-error' : ''}`}
              >
                <option value="">Select a main category...</option>
                {mainCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {errors.parentCategory && (
                <p className="mt-1 text-xs text-red-600">{errors.parentCategory}</p>
              )}
            </div>
          )}

          {/* Description (not for brands) */}
          {!isBrand && (
            <div>
              <label className="input-label">
                Description <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="input-field"
                placeholder="Short description"
              />
            </div>
          )}

          {/* Color (not for brands) */}
          {!isBrand && (
            <div>
              <label className="input-label">Color</label>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-11 h-11 rounded-lg border border-gray-300 cursor-pointer"
                  aria-label="Pick a custom color"
                />
                <span className="text-sm text-gray-500 font-mono">{formData.color}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    aria-label={`Use color ${color}`}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSave />
              )}
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;
