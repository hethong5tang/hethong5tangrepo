

import React, { useState, useMemo } from 'react';
import { useRoles } from '../../features/roles/useRoles';
import { Role, Permission } from '../../features/roles/types';
import Modal from '../../components/Modal';
import { PencilSquareIcon, TrashIcon, PlusIcon, XCircleIcon, CheckIcon, TableCellsIcon } from '../../components/Icons';
import { useActions } from '../../features/actions/useActions';

const RoleManagementPage: React.FC = () => {
  const { roleState, allPermissions } = useRoles();
  const { handleAddRole, handleUpdateRole, handleDeleteRole } = useActions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const handleOpenModal = (role: Role | null = null) => {
    setEditingRole(role ? { ...role } : { name: '', description: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleSaveRole = (roleToSave: Partial<Role>) => {
    if (!roleToSave.name || !roleToSave.description) return;

    if (roleToSave.id) {
        handleUpdateRole(roleToSave as Role);
    } else {
        const newRole: Role = {
            id: `role_${Date.now()}`,
            name: roleToSave.name,
            description: roleToSave.description,
            permissions: roleToSave.permissions || [],
        };
        handleAddRole(newRole);
    }
    setIsModalOpen(false);
  };
  
  const openDeleteModal = (role: Role) => {
    setDeletingRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingRole) {
        handleDeleteRole(deletingRole.id);
        setIsDeleteModalOpen(false);
        setDeletingRole(null);
    }
  };

  return (
    <div className="space-y-6">
      {isModalOpen && editingRole && (
        <RoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRole}
          role={editingRole}
          allPermissions={allPermissions}
        />
      )}
      {isDeleteModalOpen && deletingRole && (
         <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title={`Xóa vai trò: ${deletingRole.name}`}
            confirmText="Xác nhận Xóa"
            onConfirm={handleConfirmDelete}
            confirmButtonVariant="danger"
        >
            <p>Bạn có chắc muốn xóa vai trò này không? Hành động này không thể hoàn tác.</p>
        </Modal>
      )}

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Vai trò & Quyền hạn</h2>
          <button onClick={() => handleOpenModal()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <PlusIcon className="h-5 w-5" /> Thêm Vai trò
          </button>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">Tên Vai trò</th>
                <th scope="col" className="px-6 py-3 text-left">Mô tả</th>
                <th scope="col" className="px-6 py-3 text-left">Số Quyền</th>
                <th scope="col" className="px-6 py-3 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {roleState.roles.map(role => (
                <tr key={role.id} className="border-b border-slate-200/50 dark:border-slate-700/50">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{role.name}</td>
                  <td className="px-6 py-4">{role.description}</td>
                  <td className="px-6 py-4">{role.permissions.length}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleOpenModal(role)} className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Chỉnh sửa"><PencilSquareIcon className="h-4 w-4"/></button>
                    <button onClick={() => openDeleteModal(role)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Xóa"><TrashIcon className="h-4 w-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (role: Partial<Role>) => void;
    role: Partial<Role>;
    allPermissions: { id: Permission; name: string; description: string }[];
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, role, allPermissions }) => {
    const [formData, setFormData] = useState<Partial<Role>>(role);

    const permissionGroups = useMemo(() => {
        const groups: Record<string, { name: string; permissions: typeof allPermissions }> = {
            user: { name: 'Quản lý Người dùng', permissions: [] },
            finance: { name: 'Tài chính', permissions: [] },
            funds: { name: 'Quản lý Quỹ', permissions: [] },
            settings: { name: 'Cài đặt', permissions: [] },
            support: { name: 'Hỗ trợ', permissions: [] },
        };
    
        allPermissions.forEach(p => {
            if (p.id.startsWith('user:')) groups.user.permissions.push(p);
            else if (p.id.startsWith('finance:')) groups.finance.permissions.push(p);
            else if (p.id.startsWith('funds:')) groups.funds.permissions.push(p);
            else if (p.id.startsWith('settings:')) groups.settings.permissions.push(p);
            else if (p.id.startsWith('support:')) groups.support.permissions.push(p);
        });
    
        return Object.values(groups).filter(g => g.permissions.length > 0);
    }, [allPermissions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleClear = (fieldName: 'name' | 'description') => {
        setFormData(prev => ({ ...prev, [fieldName]: '' }));
    };

    const handlePermissionToggle = (permissionId: Permission) => {
        setFormData(prev => {
            const currentPermissions = prev.permissions || [];
            const newPermissions = currentPermissions.includes(permissionId)
                ? currentPermissions.filter(p => p !== permissionId)
                : [...currentPermissions, permissionId];
            return { ...prev, permissions: newPermissions };
        });
    };
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={role.id ? "Chỉnh sửa Vai trò" : "Tạo Vai trò mới"}
            confirmText="Lưu"
            onConfirm={() => onSave(formData)}
            size="3xl"
        >
            <div className="space-y-6 max-h-[70vh] flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="role-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tên vai trò
                        </label>
                        <div className="relative">
                            <input
                                id="role-name"
                                name="name"
                                type="text"
                                value={formData.name || ''}
                                onChange={handleChange}
                                placeholder="Ví dụ: Manager"
                                className="block w-full pl-3 pr-10 py-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {formData.name && (
                                <button
                                    type="button"
                                    onClick={() => handleClear('name')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="role-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Mô tả vai trò
                        </label>
                        <div className="relative">
                            <input
                                id="role-description"
                                name="description"
                                type="text"
                                value={formData.description || ''}
                                onChange={handleChange}
                                placeholder="Mô tả ngắn về vai trò"
                                className="block w-full pl-3 pr-10 py-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {formData.description && (
                                <button
                                    type="button"
                                    onClick={() => handleClear('description')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto -mx-6 px-6 -mb-6 pb-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="font-semibold mb-4 text-slate-900 dark:text-slate-200">Phân Quyền Chi Tiết</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {permissionGroups.map(group => {
                            const groupPermissionIds = group.permissions.map(p => p.id);
                            const selectedInGroup = groupPermissionIds.filter(id => formData.permissions?.includes(id));
                            const allSelected = selectedInGroup.length === groupPermissionIds.length;
                            const someSelected = selectedInGroup.length > 0 && !allSelected;

                            const handleGroupToggle = () => {
                                setFormData(prev => {
                                    const currentPermissions = prev.permissions || [];
                                    const otherPermissions = currentPermissions.filter(p => !groupPermissionIds.includes(p));
                                    if (allSelected) {
                                        return { ...prev, permissions: otherPermissions };
                                    } else {
                                        return { ...prev, permissions: [...otherPermissions, ...groupPermissionIds] };
                                    }
                                });
                            };
                            
                            return (
                                <div key={group.name} className="rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 flex flex-col">
                                    <div className="relative flex items-start p-4 border-b border-slate-200 dark:border-slate-700">
                                        <div className="flex h-6 items-center">
                                            <input
                                                id={`group-${group.name}`}
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={el => { if (el) el.indeterminate = someSelected; }}
                                                onChange={handleGroupToggle}
                                                className="h-4 w-4 rounded border-gray-300 dark:bg-slate-600 text-indigo-600 focus:ring-indigo-600"
                                            />
                                        </div>
                                        <div className="ml-3 text-sm leading-6">
                                            <label htmlFor={`group-${group.name}`} className="font-bold text-lg text-slate-900 dark:text-slate-100">{group.name}</label>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {group.permissions.map(p => (
                                            <div key={p.id} className="relative flex items-start">
                                                <div className="flex h-6 items-center">
                                                    <input
                                                        id={p.id}
                                                        type="checkbox"
                                                        checked={formData.permissions?.includes(p.id)}
                                                        onChange={() => handlePermissionToggle(p.id)}
                                                        className="h-4 w-4 rounded border-gray-300 dark:bg-slate-600 text-indigo-600 focus:ring-indigo-600"
                                                    />
                                                </div>
                                                <div className="ml-3 text-sm leading-6">
                                                    <label htmlFor={p.id} className="font-medium text-slate-800 dark:text-slate-200">{p.name}</label>
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs">{p.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default RoleManagementPage;