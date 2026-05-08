import { describe, it, expect, beforeEach } from 'vitest';
import { addUserToTree, removeUserFromTree, updateUserInTree } from './userService';
import { AdminManagedUser, UserStatus } from '../features/users/types';

describe('userService', () => {
  let mockUsers: AdminManagedUser[];

  beforeEach(() => {
    // A simple tree: u1 -> u2 -> u3
    mockUsers = [
      { id: 'u1', name: 'User 1', f1Count: 1, networkSize: 2, children: [
        { id: 'u2', name: 'User 2', f1Count: 1, networkSize: 1, children: [
          { id: 'u3', name: 'User 3', f1Count: 0, networkSize: 0, children: [] }
        ]}
      ]},
      { id: 'u4', name: 'User 4', f1Count: 0, networkSize: 0, children: [] }
    ] as AdminManagedUser[];
  });

  it('should add a new user to a parent and update upline counts', () => {
    const newUser: AdminManagedUser = { id: 'u5', name: 'User 5', f1Count: 0, networkSize: 0, children: [] } as AdminManagedUser;
    const updatedTree = addUserToTree(mockUsers, newUser, 'u3');
    
    // Find u1, u2, u3 in the new tree
    const u1_updated = updatedTree.find(u => u.id === 'u1')!;
    const u2_updated = u1_updated.children!.find(u => u.id === 'u2')!;
    const u3_updated = u2_updated.children!.find(u => u.id === 'u3')!;

    expect(u3_updated.f1Count).toBe(1);
    expect(u3_updated.networkSize).toBe(1);
    expect(u2_updated.f1Count).toBe(1); // F1 count only for direct parent
    expect(u2_updated.networkSize).toBe(2);
    expect(u1_updated.f1Count).toBe(1);
    expect(u1_updated.networkSize).toBe(3);
  });

  it('should remove a leaf user and update upline counts', () => {
    const { updatedTree } = removeUserFromTree(mockUsers, 'u3');
    const u1_updated = updatedTree.find(u => u.id === 'u1')!;
    const u2_updated = u1_updated.children!.find(u => u.id === 'u2')!;
    
    expect(u2_updated.children!.length).toBe(0);
    expect(u2_updated.f1Count).toBe(0);
    expect(u2_updated.networkSize).toBe(0);
    expect(u1_updated.f1Count).toBe(1);
    expect(u1_updated.networkSize).toBe(1);
  });
  
  it('should remove a user with children and update upline counts', () => {
    // Add another child to u2 to make the test more robust
    mockUsers[0].children![0].children!.push({ id: 'u3_sibling', name: 'Sibling', f1Count: 0, networkSize: 0, children: [] } as AdminManagedUser);
    mockUsers[0].children![0].f1Count = 2;
    mockUsers[0].children![0].networkSize = 2;
    mockUsers[0].networkSize = 3;

    // Remove u2, which has children u3 and u3_sibling
    const { updatedTree } = removeUserFromTree(mockUsers, 'u2');
    const u1_updated = updatedTree.find(u => u.id === 'u1')!;

    expect(u1_updated.children!.length).toBe(2);
    expect(u1_updated.f1Count).toBe(2);
    expect(u1_updated.networkSize).toBe(2);
  });

  it('should update a user in the tree', () => {
    const updatedUser = { id: 'u3', name: 'Updated User 3', status: UserStatus.Suspended };
    const updatedTree = updateUserInTree(mockUsers, updatedUser);

    const u1 = updatedTree.find(u => u.id === 'u1')!;
    const u2 = u1.children!.find(u => u.id === 'u2')!;
    const u3 = u2.children!.find(u => u.id === 'u3')!;

    expect(u3.name).toBe('Updated User 3');
    expect(u3.status).toBe(UserStatus.Suspended);
  });
});
