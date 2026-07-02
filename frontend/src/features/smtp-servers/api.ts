import { apiClient } from '@/lib/api-client';

export interface SmtpServer {
  id: number;
  name: string;
  description?: string;
  server: string;
  port: number;
  useStarttls: boolean;
  useAuth: boolean;
  username?: string;
  fromAddress?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSmtpServerPayload {
  name: string;
  description?: string;
  server: string;
  port: number;
  useStarttls: boolean;
  useAuth: boolean;
  username?: string;
  password?: string;
  fromAddress?: string;
  active: boolean;
}

export async function fetchSmtpServers(): Promise<SmtpServer[]> {
  const { data } = await apiClient.get('/smtp-servers');
  return data;
}

export async function createSmtpServer(
  payload: CreateSmtpServerPayload,
): Promise<SmtpServer> {
  const { data } = await apiClient.post('/smtp-servers', payload);
  return data;
}

export async function updateSmtpServer(
  id: number,
  payload: Partial<CreateSmtpServerPayload>,
): Promise<SmtpServer> {
  const { data } = await apiClient.put(`/smtp-servers/${id}`, payload);
  return data;
}

export async function deleteSmtpServer(id: number): Promise<void> {
  await apiClient.delete(`/smtp-servers/${id}`);
}
