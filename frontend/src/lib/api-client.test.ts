import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { User } from '@/types';

import { useAuthStore } from '@/features/auth/auth-store';

import { apiClient } from './api-client';

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

type RequestHandler = {
  fulfilled?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
};

type ResponseHandler = {
  rejected?: (error: AxiosError) => unknown;
};

function getRequestHandler(): NonNullable<RequestHandler['fulfilled']> {
  const handlers = (
    apiClient.interceptors.request as unknown as { handlers: RequestHandler[] }
  ).handlers;
  const fulfilled = handlers.find((h) => h?.fulfilled)?.fulfilled;
  if (!fulfilled) throw new Error('request interceptor missing');
  return fulfilled;
}

function getResponseReject(): NonNullable<ResponseHandler['rejected']> {
  const handlers = (
    apiClient.interceptors.response as unknown as { handlers: ResponseHandler[] }
  ).handlers;
  const rejected = handlers.find((h) => h?.rejected)?.rejected;
  if (!rejected) throw new Error('response interceptor missing');
  return rejected;
}

describe('apiClient interceptors', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    useAuthStore.getState().logout();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: 'http://localhost/' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('attaches Authorization when a token is present', async () => {
    useAuthStore.getState().setAuth('abc.def', sampleUser);
    const config = {
      headers: {},
    } as InternalAxiosRequestConfig;

    const next = await getRequestHandler()(config);
    expect(next.headers.Authorization).toBe('Bearer abc.def');
  });

  it('leaves headers unchanged when logged out', async () => {
    const config = {
      headers: {},
    } as InternalAxiosRequestConfig;

    const next = await getRequestHandler()(config);
    expect(next.headers.Authorization).toBeUndefined();
  });

  it('logs out and redirects on 401 responses', async () => {
    useAuthStore.getState().setAuth('expired', sampleUser);
    const reject = getResponseReject();
    const error = {
      response: { status: 401 },
      config: { url: '/reports/1' },
    } as AxiosError;

    await expect(reject(error)).rejects.toBe(error);
    expect(useAuthStore.getState().token).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does not force logout for /auth/login failures', async () => {
    useAuthStore.getState().setAuth('still-here', sampleUser);
    const reject = getResponseReject();
    const error = {
      response: { status: 401 },
      config: { url: '/auth/login' },
    } as AxiosError;

    await expect(reject(error)).rejects.toBe(error);
    expect(useAuthStore.getState().token).toBe('still-here');
    expect(window.location.href).toBe('http://localhost/');
  });

  it('keeps session on 403 when a token is still present', async () => {
    useAuthStore.getState().setAuth('valid', sampleUser);
    const reject = getResponseReject();
    const error = {
      response: { status: 403 },
      config: { url: '/admin/settings' },
    } as AxiosError;

    await expect(reject(error)).rejects.toBe(error);
    expect(useAuthStore.getState().token).toBe('valid');
  });
});
