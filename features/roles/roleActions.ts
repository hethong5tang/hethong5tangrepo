
import { Role } from './types';

export const createRoleActions = (deps: {
    roleDispatch: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) => {
    const { roleDispatch, addToast } = deps;

    const handleAddRole = (role: Role) => {
        roleDispatch({ type: 'ADD_ROLE', payload: role });
        addToast(`Đã thêm vai trò "${role.name}" thành công!`, 'success');
    };
  
    const handleUpdateRole = (role: Role) => {
        roleDispatch({ type: 'UPDATE_ROLE', payload: role });
        addToast(`Đã cập nhật vai trò "${role.name}"!`, 'success');
    };

    const handleDeleteRole = (roleId: string) => {
        roleDispatch({ type: 'DELETE_ROLE', payload: { roleId } });
        addToast('Đã xóa vai trò.', 'info');
    };

    return {
        handleAddRole,
        handleUpdateRole,
        handleDeleteRole,
    };
};
