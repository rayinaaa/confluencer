import Database from 'better-sqlite3';
import { Transaction, PaginationParams, TransactionType } from '../types/index.js';

export class TransactionRepository {
  constructor(private db: Database.Database) {}

  public create(tx: {
    id: string;
    account_id: string;
    type: TransactionType;
    amount: number;
    description: string | null;
    reference_id: string;
    created_at: string;
  }): Transaction {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tx.id,
      tx.account_id,
      tx.type,
      tx.amount,
      tx.description,
      tx.reference_id,
      tx.created_at
    );

    return {
      id: tx.id,
      account_id: tx.account_id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      reference_id: tx.reference_id,
      created_at: tx.created_at,
    };
  }

  public findByAccountAndReference(accountId: string, referenceId: string): Transaction | null {
    const stmt = this.db.prepare(`
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE account_id = ? AND reference_id = ?
    `);

    const row = stmt.get(accountId, referenceId) as Transaction | undefined;
    return row || null;
  }

  public findByAccountIdPaginated(
    accountId: string,
    options: PaginationParams
  ): { records: Transaction[]; total: number } {
    const { page, limit, type } = options;
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) as count FROM transactions WHERE account_id = ?';
    let dataQuery = `
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE account_id = ?
    `;

    const countParams: (string | number)[] = [accountId];
    const dataParams: (string | number)[] = [accountId];

    if (type) {
      countQuery += ' AND type = ?';
      dataQuery += ' AND type = ?';
      countParams.push(type);
      dataParams.push(type);
    }

    // Latest-first order based on created_at (and tie-breaker id)
    dataQuery += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
    dataParams.push(limit, offset);

    const totalRow = this.db.prepare(countQuery).get(...countParams) as { count: number };
    const records = this.db.prepare(dataQuery).all(...dataParams) as Transaction[];

    return {
      records,
      total: totalRow ? totalRow.count : 0,
    };
  }

  public calculateBalanceFromLedger(accountId: string): number {
    const stmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS calculated_balance
      FROM transactions
      WHERE account_id = ?
    `);

    const row = stmt.get(accountId) as { calculated_balance: number } | undefined;
    const balance = row?.calculated_balance ?? 0;
    return Number(balance.toFixed(2));
  }
}
