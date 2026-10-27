import Database from 'better-sqlite3';
import { AccountRepository } from '../repositories/accountRepository.js';
import { TransactionRepository } from '../repositories/transactionRepository.js';
import { Account, CreateAccountDTO } from '../types/index.js';
import { NotFoundError } from '../errors/AppError.js';

export class AccountService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;

  constructor(private db: Database.Database) {
    this.accountRepo = new AccountRepository(db);
    this.transactionRepo = new TransactionRepository(db);
  }

  public createAccount(dto: CreateAccountDTO): Account {
    return this.accountRepo.create(dto.name);
  }

  public getAccountById(id: string): Account {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new NotFoundError(`Account with id '${id}' not found`);
    }
    return account;
  }

  public getAccountBalance(id: string): { account_id: string; balance: number } {
    const account = this.getAccountById(id);
    return {
      account_id: account.id,
      balance: account.balance,
    };
  }

  public getAllAccounts(): Account[] {
    return this.accountRepo.findAll();
  }

  public verifyAccountIntegrity(id: string): {
    account_id: string;
    stored_balance: number;
    calculated_balance: number;
    is_consistent: boolean;
  } {
    const account = this.getAccountById(id);
    const calculated = this.transactionRepo.calculateBalanceFromLedger(id);
    return {
      account_id: account.id,
      stored_balance: account.balance,
      calculated_balance: calculated,
      is_consistent: Math.abs(account.balance - calculated) < 0.0001,
    };
  }
}
