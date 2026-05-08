
import { UserAction, UserState } from './userTypes';
import { AdminManagedUser, UserStatus, ImageQuantity } from './types';
import { addUserToTree, updateUserInTree, removeUserFromTree, findUserInTree, bulkUpdateUserStatusInTree } from '../../services/userService';

// Fixed UserAction usage to rely on the centralized definition in userTypes.ts
export const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'ADD_USER': {
      const { newUser, parentId } = action.payload;
      const updatedUsers = addUserToTree(state.allUsers, newUser, parentId);
      return { ...state, allUsers: updatedUsers };
    }
    
    case 'UPDATE_USER': {
        const updatedUsers = updateUserInTree(state.allUsers, action.payload);
        return { ...state, allUsers: updatedUsers };
    }

    case 'BULK_UPDATE_USERS': {
        let currentTree = state.allUsers;
        action.payload.forEach(update => {
            currentTree = updateUserInTree(currentTree, update);
        });
        return { ...state, allUsers: currentTree };
    }
    
    case 'BULK_UPDATE_STATUS': {
        const { userIds, status } = action.payload;
        const userIdsSet = new Set(userIds);
        const updatedUsers = bulkUpdateUserStatusInTree(state.allUsers, userIdsSet, status);
        return { ...state, allUsers: updatedUsers };
    }

    case 'DELETE_USER': {
        const { userId } = action.payload;
        const { updatedTree } = removeUserFromTree(state.allUsers, userId);
        return { ...state, allUsers: updatedTree };
    }

    case 'SET_USER_TREE':
      return { ...state, allUsers: action.payload };

    case 'REFUND_USER_BALANCE': {
      const { userId, amount } = action.payload;
      const userToRefund = findUserInTree(state.allUsers, userId);
      if (userToRefund) {
        return { ...state, allUsers: updateUserInTree(state.allUsers, { id: userId, balance: userToRefund.balance + amount }) };
      }
      return state;
    }
    
    case 'ADJUST_USER_CREDIT': {
        const { userId, amount } = action.payload;
        const user = findUserInTree(state.allUsers, userId);
        if (!user) return state;
        return { ...state, allUsers: updateUserInTree(state.allUsers, { id: userId, creditBalance: Math.max(0, user.creditBalance + amount) }) };
    }

    case 'ADD_GENERATION_RESULT': {
        const { userId, result } = action.payload;
        const user = findUserInTree(state.allUsers, userId);
        if (!user) return state;
        
        const currentHistory = user.generationHistory || [];
        const newHistory = [result, ...currentHistory];
        
        return { 
            ...state, 
            allUsers: updateUserInTree(state.allUsers, { id: userId, generationHistory: newHistory }) 
        };
    }

    case 'DELETE_GENERATION_RESULT': {
        const { userId, taskId } = action.payload;
        const user = findUserInTree(state.allUsers, userId);
        if (!user || !user.generationHistory) return state;

        const newHistory = user.generationHistory.filter(h => h.taskId !== taskId);
        return { 
            ...state, 
            allUsers: updateUserInTree(state.allUsers, { id: userId, generationHistory: newHistory }) 
        };
    }

    case 'DELETE_SINGLE_IMAGE_FROM_RESULT': {
        const { userId, taskId, imageIndex } = action.payload;
        const user = findUserInTree(state.allUsers, userId);
        if (!user || !user.generationHistory) return state;

        const newHistory = user.generationHistory.map(h => {
            if (h.taskId === taskId) {
                const newImages = h.images.filter((_, idx) => idx !== imageIndex);
                return { ...h, images: newImages };
            }
            return h;
        }).filter(h => h.images.length > 0); // Remove result if no images left

        return { 
            ...state, 
            allUsers: updateUserInTree(state.allUsers, { id: userId, generationHistory: newHistory }) 
        };
    }

    default:
      return state;
  }
};
