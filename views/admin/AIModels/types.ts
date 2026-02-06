export interface PriceConfig {
  unit: string;
  price: number;
}

export interface AIModel {
  id: number;
  name: string;
  category: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  provider: string;
  description?: string;
  is_active: number;
  api_key?: string;
  price_config: PriceConfig | string;
  request_method: string;
  url_template: string;
  headers_template: any;
  body_template?: any;
  default_params?: any;
  response_mapping: any;
  query_url_template?: string;
  query_method?: string;
  query_headers_template?: any;
  query_body_template?: any;
  query_response_mapping?: any;
  query_success_condition?: string;
  query_fail_condition?: string;
  query_success_mapping?: any;
  query_fail_mapping?: any;
  created_at: string;
  updated_at: string;
}

export interface TextModel {
  id: number;
  name: string;
  provider: string;
  description?: string;
}

export interface ModelFormData {
  name: string;
  category: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  provider: string;
  description: string;
  is_active: number;
  api_key: string;
  priceUnit: string;
  priceValue: number;
  request_method: string;
  url_template: string;
  headers_template: string;
  body_template: string;
  default_params: string;
  response_mapping: string;
  query_url_template: string;
  query_method: string;
  query_headers_template: string;
  query_body_template: string;
  query_response_mapping: string;
  query_success_condition: string;
  query_fail_condition: string;
  query_success_mapping: string;
  query_fail_mapping: string;
}

export const DEFAULT_FORM_DATA: ModelFormData = {
  name: '',
  category: 'TEXT',
  provider: '',
  description: '',
  is_active: 1,
  api_key: '',
  priceUnit: 'token',
  priceValue: 0.0001,
  request_method: 'POST',
  url_template: '',
  headers_template: '{}',
  body_template: '{}',
  default_params: '{}',
  response_mapping: '{}',
  query_url_template: '',
  query_method: 'GET',
  query_headers_template: '{}',
  query_body_template: '{}',
  query_response_mapping: '{}',
  query_success_condition: '',
  query_fail_condition: '',
  query_success_mapping: '{}',
  query_fail_mapping: '{}'
};
