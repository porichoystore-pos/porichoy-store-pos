import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiPackage } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import CategoryForm from './CategoryForm';
import ConfirmDialog from '../common/ConfirmDialog';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, categoryId: null, categoryName: '' });
  
  const toast = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteDialog.categoryId}`);
      setCategories(categories.filter(c => c._id !== deleteDialog.categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeleteDialog({ open: false, categoryId: null, categoryName: '' });
    }
  };

  const handleFormSuccess = (savedCategory) => {
    if (editingCategory) {
      setCategories(categories.map(c => c._id === savedCategory._id ? savedCategory : c));
    } else {
      setCategories([savedCategory, ...categories]);
    }
    setShowForm(false);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowForm(true);
          }}
          className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center"
        >
          <FiPlus className="mr-1" />
          Add
        </button>
      </div>

      {/* Categories Grid */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-3"
              style={{ borderLeft: `3px solid ${category.color || '#3B82F6'}` }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{category.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteDialog({ 
                      open: true, 
                      categoryId: category._id,
                      categoryName: category.name 
                    })}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {category.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{category.description}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-500">
                  <FiPackage className="w-3 h-3 mr-1" />
                  <span>{category.productCount || 0} products</span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: category.color || '#3B82F6' }}
                  ></span>
                  <span className="text-[10px] text-gray-400">{category.color || '#3B82F6'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No categories found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg"
          >
            Add Category
          </button>
        </div>
      )}

      {/* Category Form Modal */}
      {showForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, categoryId: null, categoryName: '' })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteDialog.categoryName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CategoryList;