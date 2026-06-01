import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DashboardSummary, Transaction, Account, Goal, Asset, Liability, AiChatResponse, AiInsight } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await this.refreshToken();
        }
        return Promise.reject(error);
      },
    );
  }

  private async refreshToken() {
    try {
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (!refresh) return;
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
      await SecureStore.setItemAsync('access_token', data.session.access_token);
      await SecureStore.setItemAsync('refresh_token', data.session.refresh_token);
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
  }

  // Auth
  async register(email: string, password: string, fullName: string) {
    const { data } = await this.client.post('/auth/register', { email, password, full_name: fullName });
    await SecureStore.setItemAsync('access_token', data.session.access_token);
    await SecureStore.setItemAsync('refresh_token', data.session.refresh_token);
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('access_token', data.session.access_token);
    await SecureStore.setItemAsync('refresh_token', data.session.refresh_token);
    return data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  }

  // Dashboard
  async getDashboard(): Promise<DashboardSummary> {
    const { data } = await this.client.get('/dashboard');
    return data;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const { data } = await this.client.get('/accounts');
    return data;
  }

  async createAccount(dto: Partial<Account>): Promise<Account> {
    const { data } = await this.client.post('/accounts', dto);
    return data;
  }

  async updateAccount(id: string, dto: Partial<Account>): Promise<Account> {
    const { data } = await this.client.put(`/accounts/${id}`, dto);
    return data;
  }

  async deleteAccount(id: string): Promise<void> {
    await this.client.delete(`/accounts/${id}`);
  }

  // Transactions
  async getTransactions(filters?: {
    account_id?: string;
    category_id?: string;
    transaction_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { data } = await this.client.get('/transactions', { params: filters });
    return data as { data: Transaction[]; meta: { total: number; page: number; limit: number; totalPages: number } };
  }

  async createTransaction(dto: Partial<Transaction>): Promise<Transaction> {
    const { data } = await this.client.post('/transactions', dto);
    return data;
  }

  async updateTransaction(id: string, dto: Partial<Transaction>): Promise<Transaction> {
    const { data } = await this.client.put(`/transactions/${id}`, dto);
    return data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.client.delete(`/transactions/${id}`);
  }

  async getMonthlyStats(year: number, month: number) {
    const { data } = await this.client.get('/transactions/monthly-stats', { params: { year, month } });
    return data;
  }

  // Patrimony
  async getNetWorth() {
    const { data } = await this.client.get('/patrimony');
    return data;
  }

  async createAsset(dto: Partial<Asset>): Promise<Asset> {
    const { data } = await this.client.post('/patrimony/assets', dto);
    return data;
  }

  async updateAsset(id: string, dto: Partial<Asset>): Promise<Asset> {
    const { data } = await this.client.put(`/patrimony/assets/${id}`, dto);
    return data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/patrimony/assets/${id}`);
  }

  async createLiability(dto: Partial<Liability>): Promise<Liability> {
    const { data } = await this.client.post('/patrimony/liabilities', dto);
    return data;
  }

  async updateLiability(id: string, dto: Partial<Liability>): Promise<Liability> {
    const { data } = await this.client.put(`/patrimony/liabilities/${id}`, dto);
    return data;
  }

  async deleteLiability(id: string): Promise<void> {
    await this.client.delete(`/patrimony/liabilities/${id}`);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    const { data } = await this.client.get('/goals');
    return data;
  }

  async createGoal(dto: Partial<Goal>): Promise<Goal> {
    const { data } = await this.client.post('/goals', dto);
    return data;
  }

  async updateGoal(id: string, dto: Partial<Goal>): Promise<Goal> {
    const { data } = await this.client.put(`/goals/${id}`, dto);
    return data;
  }

  async deleteGoal(id: string): Promise<void> {
    await this.client.delete(`/goals/${id}`);
  }

  async addGoalContribution(goalId: string, amount: number, note?: string) {
    const { data } = await this.client.post(`/goals/${goalId}/contributions`, { amount, note });
    return data;
  }

  // AI
  async chat(message: string, conversationId?: string): Promise<AiChatResponse> {
    const { data } = await this.client.post('/ai/chat', { message, conversation_id: conversationId });
    return data;
  }

  async getInsights(): Promise<AiInsight[]> {
    const { data } = await this.client.get('/ai/insights');
    return data;
  }

  async generateInsights(): Promise<AiInsight[]> {
    const { data } = await this.client.post('/ai/insights/generate');
    return data;
  }

  async dismissInsight(id: string): Promise<void> {
    await this.client.patch(`/ai/insights/${id}/dismiss`);
  }

  async getConversations() {
    const { data } = await this.client.get('/ai/conversations');
    return data;
  }

  // Profile
  async getProfile() {
    const { data } = await this.client.get('/users/profile');
    return data;
  }

  async updateProfile(dto: { full_name?: string; currency_code?: string }) {
    const { data } = await this.client.put('/users/profile', dto);
    return data;
  }

  async getCategories() {
    const { data } = await this.client.get('/users/categories');
    return data;
  }
}

export const api = new ApiService();
