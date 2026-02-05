/**
 * AI 模型配置系统 - TypeScript 类型定义
 */

export enum ModelCategory {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PriceConfig {
  unit: 'second' | 'token' | 'image' | 'request';
  price: number;
}

export interface AiModelConfig {
  id: number;
  name: string;
  category: ModelCategory;
  provider: string;
  description?: string;
  isActive: boolean;
  priceConfig: PriceConfig;
  requestMethod: RequestMethod;
  urlTemplate: string;
  headersTemplate: Record<string, string>;
  bodyTemplate?: Record<string, any>;
  defaultParams?: Record<string, any>;
  responseMapping: Record<string, string>;
  queryUrlTemplate?: string;
  queryMethod?: RequestMethod;
  queryHeadersTemplate?: Record<string, string>;
  queryBodyTemplate?: Record<string, any>;
  queryResponseMapping?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelExecutionParams {
  [key: string]: any;
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  taskId?: string;
  action?: string;
}

export interface ModelExecutionRequest {
  method: RequestMethod;
  url: string;
  headers: Record<string, string>;
  body?: Record<string, any>;
}

export interface ModelExecutionResponse {
  taskId?: string;
  status?: TaskStatus;
  result?: any;
  videoUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  content?: string;
  progress?: number;
  error?: string;
  rawResponse?: any;
}

export interface SystemConfig {
  id: number;
  configKey: string;
  configValue: string;
  description?: string;
  isEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
