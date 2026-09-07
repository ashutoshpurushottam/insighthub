import { beforeEach, describe, expect, it } from 'vitest';

import type { User } from '@/types';

import { useAuthStore } from './auth-store';

const sampleUser: User = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  fullName: 'Ada Admin',
  accessLevel: 1,
  active: true,
  publicUser: false,
  roles: ['SUPER_ADMIN'],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('starts logged out', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setAuth stores token and user', () => {
    useAuthStore.getState().setAuth('jwt-token', sampleUser);
    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-token');
    expect(state.user).toEqual(sampleUser);
  });

  it('logout clears session', () => {
    useAuthStore.getState().setAuth('jwt-token', sampleUser);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});
