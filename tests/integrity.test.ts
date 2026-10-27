import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import './setup.js';

const app = createApp();

describe('Data Integrity and Balance Consistency', () => {
  it('1. should match the exact assessment specification example', async () => {
    // Initial balance: 0
    // Credit: 100
    // Credit: 50
    // Debit: 30
    // Debit: 20
    // Final balance: 100
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Assessment Spec User' });
    const id = acc.body.data.id;
    expect(acc.body.data.balance).toBe(0);

    // Credit 100
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'credit', amount: 100, reference_id: 'spec-c1' });

    // Credit 50
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'credit', amount: 50, reference_id: 'spec-c2' });

    // Debit 30
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'debit', amount: 30, reference_id: 'spec-d1' });

    // Debit 20
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'debit', amount: 20, reference_id: 'spec-d2' });

    // Final balance must be 100
    const balRes = await request(app).get(`/api/v1/accounts/${id}/balance`);
    expect(balRes.body.data.balance).toBe(100);

    // Verify mathematical integrity audit endpoint
    const auditRes = await request(app).get(`/api/v1/accounts/${id}/integrity`);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.stored_balance).toBe(100);
    expect(auditRes.body.data.calculated_balance).toBe(100);
    expect(auditRes.body.data.is_consistent).toBe(true);
  });

  it('2. failed/rejected transactions must not affect account balance or ledger history', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Integrity Test' });
    const id = acc.body.data.id;

    // Credit 100
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'credit', amount: 100, reference_id: 'ok-1' });

    // Attempt invalid transactions:
    // 1. Overdraft
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'debit', amount: 500, reference_id: 'fail-overdraft' });

    // 2. Duplicate reference
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'credit', amount: 50, reference_id: 'ok-1' });

    // 3. Negative amount
    await request(app)
      .post(`/api/v1/accounts/${id}/transactions`)
      .send({ type: 'credit', amount: -20, reference_id: 'fail-negative' });

    // Balance should strictly remain 100
    const balRes = await request(app).get(`/api/v1/accounts/${id}/balance`);
    expect(balRes.body.data.balance).toBe(100);

    // History should only contain the 1 successful transaction
    const historyRes = await request(app).get(`/api/v1/accounts/${id}/transactions`);
    expect(historyRes.body.data.records.length).toBe(1);
    expect(historyRes.body.data.pagination.total_records).toBe(1);
  });
});
