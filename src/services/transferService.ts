import Database from 'better-sqlite3';
import crypto from 'crypto';
import { AccountRepository } from '../repositories/accountRepository.js';
import { TransactionRepository } from '../repositories/transactionRepository.js';
import { TransferRepository } from '../repositories/transferRepository.js';
import { CreateTransferDTO, TransferRecord } from '../types/index.js';
import {
  NotFoundError,
  InsufficientBalanceError,
  ConflictError,
  ValidationError,
} from '../errors/AppError.js';

export interface TransferResult {
  transfer: TransferRecord;
  source_account: {
    id: string;
    new_balance: number;
  };
  destination_account: {
    id: string;
    new_balance: number;
  };
}

export class TransferService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;
  private transferRepo: TransferRepository;

  constructor(private db: Database.Database) {
    this.accountRepo = new AccountRepository(db);
    this.transactionRepo = new TransactionRepository(db);
    this.transferRepo = new TransferRepository(db);
  }

  public transferMoney(dto: CreateTransferDTO): TransferResult {
    if (dto.source_account_id === dto.destination_account_id) {
      throw new ValidationError('Source and destination accounts must be distinct');
    }

    // Atomic execution for money transfer
    const executeTransfer = this.db.transaction(() => {
      // 1. Check if transfer reference already used
      const existingTransfer = this.transferRepo.findByReference(dto.reference_id);
      if (existingTransfer) {
        throw new ConflictError(
          `Transfer with reference_id '${dto.reference_id}' already exists`,
          'DUPLICATE_TRANSFER_REFERENCE',
          { reference_id: dto.reference_id }
        );
      }

      // 2. Verify both accounts exist
      const sourceAccount = this.accountRepo.findById(dto.source_account_id);
      if (!sourceAccount) {
        throw new NotFoundError(
          `Source account with id '${dto.source_account_id}' not found`,
          'SOURCE_ACCOUNT_NOT_FOUND'
        );
      }

      const destinationAccount = this.accountRepo.findById(dto.destination_account_id);
      if (!destinationAccount) {
        throw new NotFoundError(
          `Destination account with id '${dto.destination_account_id}' not found`,
          'DESTINATION_ACCOUNT_NOT_FOUND'
        );
      }

      // 3. Verify sufficient balance in source account
      if (sourceAccount.balance < dto.amount) {
        throw new InsufficientBalanceError(
          `Transfer rejected: Insufficient funds in source account. Current balance is ${sourceAccount.balance.toFixed(
            2
          )}, requested transfer amount is ${dto.amount.toFixed(2)}`,
          {
            source_balance: sourceAccount.balance,
            transfer_amount: dto.amount,
          }
        );
      }

      // 4. Calculate new balances
      const newSourceBalance = Number((sourceAccount.balance - dto.amount).toFixed(2));
      const newDestBalance = Number((destinationAccount.balance + dto.amount).toFixed(2));

      // 5. Update both balances
      this.accountRepo.updateBalance(dto.source_account_id, newSourceBalance);
      this.accountRepo.updateBalance(dto.destination_account_id, newDestBalance);

      const timestamp = new Date().toISOString();
      const transferId = crypto.randomUUID();

      // 6. Record source debit transaction in ledger
      const sourceRef = `TRF-${dto.reference_id}-OUT`;
      this.transactionRepo.create({
        id: crypto.randomUUID(),
        account_id: dto.source_account_id,
        type: 'debit',
        amount: dto.amount,
        description: dto.description || `Transfer to ${destinationAccount.name} (${dto.destination_account_id})`,
        reference_id: sourceRef,
        created_at: timestamp,
      });

      // 7. Record destination credit transaction in ledger
      const destRef = `TRF-${dto.reference_id}-IN`;
      this.transactionRepo.create({
        id: crypto.randomUUID(),
        account_id: dto.destination_account_id,
        type: 'credit',
        amount: dto.amount,
        description: dto.description || `Transfer from ${sourceAccount.name} (${dto.source_account_id})`,
        reference_id: destRef,
        created_at: timestamp,
      });

      // 8. Record transfer entity
      const transferRecord: TransferRecord = {
        id: transferId,
        source_account_id: dto.source_account_id,
        destination_account_id: dto.destination_account_id,
        amount: dto.amount,
        reference_id: dto.reference_id,
        description: dto.description ?? null,
        created_at: timestamp,
      };

      this.transferRepo.create(transferRecord);

      return {
        transfer: transferRecord,
        source_account: {
          id: dto.source_account_id,
          new_balance: newSourceBalance,
        },
        destination_account: {
          id: dto.destination_account_id,
          new_balance: newDestBalance,
        },
      };
    });

    return executeTransfer();
  }

  public getAllTransfers(): TransferRecord[] {
    return this.transferRepo.findAll();
  }
}
