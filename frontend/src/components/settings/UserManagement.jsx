import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUserCheck, FiUserX, FiUsers } from 'react-icons/fi';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import ConfirmDialog from '../common/ConfirmDialog';
import Modal from '../common/Modal';

const emptyForm = { username: '', name: '', email: '', password: '', role: 'staff' };

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, name: u.name || '', email: u.email || '', password: '', role: u.role });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      setShowForm(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}/toggle`);
      toast.success(`${u.username} ${u.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteTarget._id}`);
      toast.success('User deleted');
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">User Accounts</h3>
        <button onClick={openAdd} className="btn-primary btn-sm"><FiPlus /> Add User</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-pulse bg-gray-100 rounded-lg" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={FiUsers} title="No users" description="Add a staff or admin account" />
      ) : (
        <div className="divide-y divide-gray-100">
          {users.map((u) => {
            const isSelf = u._id === currentUser?._id;
            return (
              <div key={u._id} className="py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {(u.name || u.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {u.name || u.username}
                    {isSelf && <span className="text-[10px] text-gray-400 ml-1.5">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{u.email || u.username}</p>
                </div>
                <Badge variant={u.role === 'admin' ? 'primary' : 'neutral'}>{u.role}</Badge>
                <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(u)} className="btn-icon !w-8 !h-8 text-blue-600 hover:bg-blue-50" aria-label={`Edit ${u.username}`}>
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  {!isSelf && (
                    <>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`btn-icon !w-8 !h-8 ${u.isActive ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                        aria-label={u.isActive ? `Deactivate ${u.username}` : `Activate ${u.username}`}
                      >
                        {u.isActive ? <FiUserX className="w-3.5 h-3.5" /> : <FiUserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setDeleteTarget(u)} className="btn-icon !w-8 !h-8 text-red-600 hover:bg-red-50" aria-label={`Delete ${u.username}`}>
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSave} className="space-y-3">
          {!editing && (
            <div>
              <label className="input-label">Username <span className="text-red-500">*</span></label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.trim() })} className="input-field" required minLength={3} />
            </div>
          )}
          <div>
            <label className="input-label">Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="Optional" />
          </div>
          <div>
            <label className="input-label">
              {editing ? 'New Password (blank = keep current)' : 'Password'} {!editing && <span className="text-red-500">*</span>}
            </label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" minLength={editing ? 0 : 6} placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} />
          </div>
          <div>
            <label className="input-label">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Delete "${deleteTarget?.username}"? They will no longer be able to log in.`}
        confirmText="Delete"
      />
    </div>
  );
};

export default UserManagement;
