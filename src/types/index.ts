export type TransactionType = 'credit' | 'debit';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference_id: string;
  created_at: string;
}

export interface TransferRecord {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description: string | null;
  created_at: string;
}

export interface CreateAccountDTO {
  name: string;
}

export interface CreateTransactionDTO {
  type: TransactionType;
  amount: number;
  reference_id: string;
  description?: string;
}

export interface CreateTransferDTO {
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  type?: TransactionType;
}

export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  records: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
