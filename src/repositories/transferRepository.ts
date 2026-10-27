import Database from 'better-sqlite3';
import { TransferRecord } from '../types/index.js';

export class TransferRepository {
  constructor(private db: Database.Database) {}

  public create(transfer: TransferRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO transfers (id, source_account_id, destination_account_id, amount, reference_id, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      transfer.id,
      transfer.source_account_id,
      transfer.destination_account_id,
      transfer.amount,
      transfer.reference_id,
      transfer.description,
      transfer.created_at
    );
  }

  public findByReference(referenceId: string): TransferRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, source_account_id, destination_account_id, amount, reference_id, description, created_at
      FROM transfers
      WHERE reference_id = ?
    `);

    const row = stmt.get(referenceId) as TransferRecord | undefined;
    return row || null;
  }

  public findAll(): TransferRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, source_account_id, destination_account_id, amount, reference_id, description, created_at
      FROM transfers
      ORDER BY created_at DESC
    `);

    return stmt.all() as TransferRecord[];
  }
}
