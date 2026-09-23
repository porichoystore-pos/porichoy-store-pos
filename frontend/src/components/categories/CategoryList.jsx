import React, { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch, FiGrid } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import CategoryForm from './CategoryForm';
import ConfirmDialog from '../common/ConfirmDialog';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import Badge from '../common/Badge';
import { CardGridSkeleton } from '../common/Skeletons';

const TYPE_BADGE = { main: 'primary', sub: 'info', brand: 'warning' };
const TYPE_LABEL = { main: 'Category', sub: 'Sub', brand: 'Brand' };

const CategoryCard = React.memo(({ category, color, onEdit, onDelete }) => (
  <button
    type="button"
    onClick={onEdit}
    className="text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group"
  >
    {/* Color strip */}
    <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

    <div className="p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{category.name}</h3>
        <Badge variant={TYPE_BADGE[category.type] || 'neutral'}>{TYPE_LABEL[category.type] || category.type}</Badge>
      </div>

      {category.description ? (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2 min-h-[2rem]">{category.description}</p>
      ) : (
        <p className="text-xs text-gray-300 italic mb-2 min-h-[2rem]">No description</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <span className="text-xs text-gray-500 flex items-center">
          <FiPackage className="w-3 h-3 mr-1" />
          {category.productCount || 0} products
        </span>
        <div className="flex gap-1">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}
            className="btn-icon !w-8 !h-8 text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label={`Edit ${category.name}`}
          >
            <FiEdit2 className="w-3.5 h-3.5" />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="btn-icon !w-8 !h-8 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label={`Delete ${category.name}`}
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  </button>
));

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });

  const toast = useToast();

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Search + sort (client-side, instant) ----------
  const visibleCategories = useMemo(() => {
    let list = [...categories];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'products') list.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [categories, searchQuery, sortBy]);

  // ---------- Handlers ----------
  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async () => {
    const category = deleteDialog.category;
    try {
      await api.delete(`/categories/${category._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== category._id));
      toast.success('Category deleted');
    } catch (error) {
      // Backend blocks deletion when products/subcategories exist — surface that
      toast.error(error.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeleteDialog({ open: false, category: null });
    }
  };

  const handleFormSuccess = (saved) => {
    if (editingCategory) {
      setCategories((prev) => prev.map((c) => (c._id === saved._id ? saved : c)));
    } else {
      setCategories((prev) => [saved, ...prev]);
    }
    setShowForm(false);
    setEditingCategory(null);
  };

  if (loading) return <CardGridSkeleton cards={8} />;

  const deleteTarget = deleteDialog.category;
  const deleteCount = deleteTarget?.productCount || 0;

  return (
    <div className="px-3 py-4">
      <PageHeader title="Categories" subtitle={`${categories.length} total`}>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowForm(true);
          }}
          className="btn-primary btn-sm"
        >
          <FiPlus />
          <span className="hidden sm:inline">Add</span>
        </button>
      </PageHeader>

      {/* Search + sort toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="input-field pl-9"
            aria-label="Search categories"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field sm:!w-44"
          aria-label="Sort categories"
        >
          <option value="name">Sort: Name (A–Z)</option>
          <option value="products">Sort: Most products</option>
          <option value="newest">Sort: Newest first</option>
        </select>
      </div>

      {/* Cards */}
      {visibleCategories.length > 0 ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleCategories.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              color={category.color || '#3B82F6'}
              onEdit={() => handleEdit(category)}
              onDelete={() =>
                setDeleteDialog({ open: true, category })
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FiGrid}
          title={searchQuery ? 'No matching categories' : 'No categories yet'}
          description={
            searchQuery
              ? `Nothing matches "${searchQuery}"`
              : 'Create your first category to organize products'
          }
          action={
            !searchQuery && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowForm(true);
                }}
                className="btn-primary btn-sm"
              >
                <FiPlus /> Add Category
              </button>
            )
          }
        />
      )}

      {/* Create/Edit form */}
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

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, category: null })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={
          <div className="space-y-2">
            <p>
              Delete <span className="font-semibold">"{deleteTarget?.name}"</span>?
            </p>
            {deleteCount > 0 && (
              <p className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-2">
                ⚠️ This category has {deleteCount} product{deleteCount !== 1 ? 's' : ''}. Deletion will
                be blocked until products are reassigned or removed.
              </p>
            )}
            {deleteCount === 0 && (
              <p className="text-xs text-gray-400">This category has no products and can be safely deleted.</p>
            )}
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CategoryList;
