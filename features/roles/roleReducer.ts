import { RoleAction, RoleState } from './roleTypes';

export const roleReducer = (state: RoleState, action: RoleAction): RoleState => {
  switch (action.type) {
    case 'ADD_ROLE':
      return { ...state, roles: [...state.roles, action.payload] };
    case 'UPDATE_ROLE':
      return {
        ...state,
        roles: state.roles.map(r => r.id === action.payload.id ? action.payload : r),
      };
    case 'DELETE_ROLE':
      return {
        ...state,
        roles: state.roles.filter(r => r.id !== action.payload.roleId),
      };
    default:
      return state;
  }
};
