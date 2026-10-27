import Database from 'better-sqlite3';
import crypto from 'crypto';
import { AccountRepository } from '../repositories/accountRepository.js';
import { TransactionRepository } from '../repositories/transactionRepository.js';
import {
  Transaction,
  CreateTransactionDTO,
  PaginationParams,
  PaginatedResult,
} from '../types/index.js';
import {
  NotFoundError,
  DuplicateTransactionError,
  InsufficientBalanceError,
} from '../errors/AppError.js';

export class TransactionService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;

  constructor(private db: Database.Database) {
    this.accountRepo = new AccountRepository(db);
    this.transactionRepo = new TransactionRepository(db);
  }

  public addTransaction(
    accountId: string,
    dto: CreateTransactionDTO
  ): { transaction: Transaction; account_balance: number } {
    // Execute inside an atomic database transaction
    const executeTx = this.db.transaction(() => {
      // 1. Verify account exists
      const account = this.accountRepo.findById(accountId);
      if (!account) {
        throw new NotFoundError(`Account with id '${accountId}' not found`);
      }

      // 2. Check for duplicate reference_id within this specific account
      const existingTx = this.transactionRepo.findByAccountAndReference(
        accountId,
        dto.reference_id
      );
      if (existingTx) {
        throw new DuplicateTransactionError(
          `Transaction with reference_id '${dto.reference_id}' already exists for this account`,
          { existing_transaction_id: existingTx.id, reference_id: dto.reference_id }
        );
      }

      // 3. Balance verification for debit transactions
      if (dto.type === 'debit') {
        if (account.balance < dto.amount) {
          throw new InsufficientBalanceError(
            `Transaction rejected: Insufficient balance. Current balance is ${account.balance.toFixed(
              2
            )}, requested debit is ${dto.amount.toFixed(2)}`,
            {
              current_balance: account.balance,
              attempted_debit: dto.amount,
            }
          );
        }
      }

      // 4. Calculate new balance with exact 2-decimal precision
      const newBalance =
        dto.type === 'credit'
          ? Number((account.balance + dto.amount).toFixed(2))
          : Number((account.balance - dto.amount).toFixed(2));

      // 5. Update account balance
      this.accountRepo.updateBalance(accountId, newBalance);

      // 6. Record transaction in ledger
      const txId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const createdTransaction = this.transactionRepo.create({
        id: txId,
        account_id: accountId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description ?? null,
        reference_id: dto.reference_id,
        created_at: createdAt,
      });

      return {
        transaction: createdTransaction,
        account_balance: newBalance,
      };
    });

    return executeTx();
  }

  public getTransactionHistory(
    accountId: string,
    params: PaginationParams
  ): PaginatedResult<Transaction> {
    // 1. Verify account exists
    const account = this.accountRepo.findById(accountId);
    if (!account) {
      throw new NotFoundError(`Account with id '${accountId}' not found`);
    }

    // 2. Fetch paginated records and count
    const { records, total } = this.transactionRepo.findByAccountIdPaginated(
      accountId,
      params
    );

    const totalPages = Math.ceil(total / params.limit) || (total === 0 ? 0 : 1);

    return {
      records,
      pagination: {
        current_page: params.page,
        page_size: params.limit,
        total_records: total,
        total_pages: totalPages,
      },
    };
  }
}
