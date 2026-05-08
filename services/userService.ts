
import { AdminManagedUser, UserStatus } from '../features/users/types';

/**
 * Tìm cha của một người dùng trong cây đệ quy
 */
export const findParent = (nodes: AdminManagedUser[], childId: string): AdminManagedUser | null => {
    for (const node of nodes) {
        if (node.children?.some(child => child.id === childId)) return node;
        if (node.children) {
            const parent = findParent(node.children, childId);
            if (parent) return parent;
        }
    }
    return null;
};

/**
 * Tìm người dùng bất kỳ theo ID trong cây
 */
export const findUserInTree = (users: AdminManagedUser[], userId: string): AdminManagedUser | undefined => {
  for (const user of users) {
      if (user.id === userId) return user;
      if (user.children) {
          const found = findUserInTree(user.children, userId);
          if (found) return found;
      }
  }
  return undefined;
};

/**
 * Cập nhật số lượng F1 và quy mô mạng lưới ngược lên các cấp trên (Upline)
 */
export const updateUplineCounts = (users: AdminManagedUser[], parentId: string, networkChange: number, f1Change: number): AdminManagedUser[] => {
    const ancestorPath: string[] = [];
    let found = false;
    
    function findPathToParent(nodes: AdminManagedUser[], targetId: string): boolean {
        for (const node of nodes) {
            if (node.id === targetId) {
                ancestorPath.push(node.id);
                found = true;
                return true;
            }
            if (node.children) {
                if (findPathToParent(node.children, targetId)) {
                    ancestorPath.push(node.id);
                    return true;
                }
            }
        }
        return false;
    }

    findPathToParent(users, parentId);
    if (!found) return users;
    
    const ancestorSet = new Set(ancestorPath);

    function recursiveUpdate(nodes: AdminManagedUser[]): AdminManagedUser[] {
        return nodes.map(node => {
            if (!ancestorSet.has(node.id)) return node;
            
            const updatedNode: AdminManagedUser = { 
                ...node,
                networkSize: (node.networkSize || 0) + networkChange,
            };

            if (node.id === parentId) {
                updatedNode.f1Count = (updatedNode.f1Count || 0) + f1Change;
            }

            if (node.children) {
                updatedNode.children = recursiveUpdate(node.children);
            }

            return updatedNode;
        });
    }

    return recursiveUpdate(users);
};

/**
 * Lấy danh sách ID của người dùng và tất cả con cháu
 */
export const findUserAndChildrenIds = (users: AdminManagedUser[], userId: string): { allIds: string[] } => {
    const user = findUserInTree(users, userId);
    if (!user) return { allIds: [] };

    const ids: string[] = [];
    const collectIds = (u: AdminManagedUser) => {
        ids.push(u.id);
        if (u.children) {
            u.children.forEach(collectIds);
        }
    };
    collectIds(user);
    return { allIds: ids };
};

export const addUserToTree = (users: AdminManagedUser[], newUser: AdminManagedUser, parentId?: string): AdminManagedUser[] => {
    if (!parentId) return [newUser, ...users];
    
    let wasAdded = false;
    const recursiveAdd = (nodes: AdminManagedUser[]): AdminManagedUser[] => {
        let hasChanged = false;
        const newNodes = nodes.map(node => {
            if (wasAdded) return node;
            if (node.id === parentId) {
                wasAdded = true;
                hasChanged = true;
                return { ...node, children: [newUser, ...(node.children || [])] };
            }
            if (node.children) {
                const newChildren = recursiveAdd(node.children);
                if (newChildren !== node.children) {
                    wasAdded = true; 
                    hasChanged = true;
                    return { ...node, children: newChildren };
                }
            }
            return node;
        });
        return hasChanged ? newNodes : nodes;
    };

    const usersWithNewChild = recursiveAdd(users);
    return updateUplineCounts(usersWithNewChild, parentId, 1 + (newUser.networkSize || 0), 1);
};

export const removeUserFromTree = (users: AdminManagedUser[], userId: string): { updatedTree: AdminManagedUser[], removedUserCount: number, parentId?: string } => {
    const userToDelete = findUserInTree(users, userId);
    const parent = findParent(users, userId);

    if (!userToDelete) return { updatedTree: users, removedUserCount: 0 };

    const orphans = (userToDelete.children || []).map(child => ({
        ...child,
        parentId: parent?.id
    }));

    const rebuildTree = (nodes: AdminManagedUser[]): AdminManagedUser[] => {
        return nodes.flatMap(node => {
            if (node.id === userId) return orphans;
            if (node.children) {
                const newChildren = rebuildTree(node.children);
                if (newChildren !== node.children) {
                    return [{ ...node, children: newChildren }];
                }
            }
            return [node];
        });
    };

    let updatedTree = rebuildTree(users);
    
    if (parent) {
        updatedTree = updateUplineCounts(updatedTree, parent.id, -1, orphans.length - 1);
    }
    
    return { updatedTree, removedUserCount: 1, parentId: parent?.id };
};

export const updateUserInTree = (users: AdminManagedUser[], updatedUser: Partial<AdminManagedUser> & { id: string }): AdminManagedUser[] => {
    return users.map(u => {
        if (u.id === updatedUser.id) return { ...u, ...updatedUser };
        if (u.children) {
            const newChildren = updateUserInTree(u.children, updatedUser);
            if (newChildren !== u.children) return { ...u, children: newChildren };
        }
        return u;
    });
};

/**
 * Cập nhật trạng thái cho hàng loạt người dùng
 * Logic chuẩn hóa:
 * - Khi KHÓA: Lưu trạng thái hiện tại vào previousStatus nếu nó chưa bị khóa.
 * - Khi MỞ KHÓA: Khôi phục chính xác trạng thái từ previousStatus.
 */
export const bulkUpdateUserStatusInTree = (nodes: AdminManagedUser[], userIds: Set<string>, targetAction: UserStatus): AdminManagedUser[] => {
    return nodes.map(node => {
        let newNode = { ...node };
        if (userIds.has(node.id)) {
            if (targetAction === UserStatus.Suspended) {
                // CHỈ lưu previousStatus nếu hiện tại đang KHÔNG bị khóa
                if (node.status !== UserStatus.Suspended) {
                    newNode.previousStatus = node.status;
                }
                newNode.status = UserStatus.Suspended;
            } else if (targetAction === UserStatus.Active) {
                // MỞ KHÓA: Quay về trạng thái cũ, nếu không có thì mặc định Active
                newNode.status = node.previousStatus || UserStatus.Active;
                // Quan trọng: Xóa bộ nhớ trạng thái cũ sau khi khôi phục thành công
                delete newNode.previousStatus;
                
                // Nếu khôi phục về Active thì dọn dẹp các trường nợ phí để tránh hiển thị sai
                if (newNode.status === UserStatus.Active) {
                    newNode.missedMaintenanceMonths = 0;
                    newNode.accumulatedPenalty = 0;
                }
            }
        }
        
        if (node.children && node.children.length > 0) {
            newNode.children = bulkUpdateUserStatusInTree(node.children, userIds, targetAction);
        }
        return newNode;
    });
};

export const bulkRemoveUsersFromTree = (nodes: AdminManagedUser[], userIdsToRemove: Set<string>): { updatedTree: AdminManagedUser[] } => {
    const recursiveUpdate = (nodes: AdminManagedUser[]): AdminManagedUser[] => {
        const remainingNodes = nodes.filter(node => !userIdsToRemove.has(node.id));
        return remainingNodes.map(node => {
            if (!node.children || node.children.length === 0) return node;
            const updatedChildren = recursiveUpdate(node.children);
            if (updatedChildren !== node.children) {
                 const newNetworkSize = updatedChildren.reduce((sum, child) => sum + 1 + (child.networkSize || 0), 0);
                 return { ...node, children: updatedChildren, f1Count: updatedChildren.length, networkSize: newNetworkSize };
            }
            return node;
        });
    };
    return { updatedTree: recursiveUpdate(nodes) };
};
