import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import './setup.js';

const app = createApp();

describe('Transaction Endpoints & Rules', () => {
  it('1. should process credit transactions and increase account balance', async () => {
    // Create account
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Alice' });
    const accountId = acc.body.data.id;

    // Credit 100
    const tx1 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'credit',
        amount: 100.0,
        reference_id: 'ref-c1',
        description: 'First deposit',
      });

    expect(tx1.status).toBe(201);
    expect(tx1.body.success).toBe(true);
    expect(tx1.body.data.type).toBe('credit');
    expect(tx1.body.data.amount).toBe(100.0);
    expect(tx1.body.data.current_balance).toBe(100.0);

    // Credit 50 (100 + 50 = 150)
    const tx2 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'credit',
        amount: 50.0,
        reference_id: 'ref-c2',
      });

    expect(tx2.status).toBe(201);
    expect(tx2.body.data.current_balance).toBe(150.0);

    // Check account balance endpoint
    const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
    expect(bal.body.data.balance).toBe(150.0);
  });

  it('2. should process debit transactions and decrease balance', async () => {
    // Create account and fund with 100
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Bob' });
    const accountId = acc.body.data.id;

    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 100.0, reference_id: 'fund-1' });

    // Debit 30 (100 - 30 = 70)
    const debitRes = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'debit',
        amount: 30.0,
        reference_id: 'debit-1',
        description: 'Grocery shopping',
      });

    expect(debitRes.status).toBe(201);
    expect(debitRes.body.data.type).toBe('debit');
    expect(debitRes.body.data.current_balance).toBe(70.0);

    const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
    expect(bal.body.data.balance).toBe(70.0);
  });

  it('3. should reject debit transaction if account has insufficient balance and leave balance unchanged', async () => {
    // Current balance: 100, Debit: 150 -> Rejected, balance remains 100
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Charlie' });
    const accountId = acc.body.data.id;

    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 100.0, reference_id: 'charlie-init' });

    const debitRes = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'debit',
        amount: 150.0,
        reference_id: 'overdraft-attempt',
      });

    expect(debitRes.status).toBe(422);
    expect(debitRes.body.success).toBe(false);
    expect(debitRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

    // Verify balance remains 100
    const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
    expect(bal.body.data.balance).toBe(100.0);
  });

  it('4. should reject duplicate reference_id for the same account without altering balance', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Diana' });
    const accountId = acc.body.data.id;

    // First transaction with ref 'DUP-001'
    const res1 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'credit',
        amount: 100.0,
        reference_id: 'DUP-001',
      });
    expect(res1.status).toBe(201);

    // Second transaction with the same ref 'DUP-001' on the SAME account
    const res2 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'credit',
        amount: 100.0,
        reference_id: 'DUP-001',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.code).toBe('DUPLICATE_TRANSACTION_REFERENCE');

    // Balance should remain 100 (not 200)
    const bal = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
    expect(bal.body.data.balance).toBe(100.0);
  });

  it('5. should allow the same reference_id to be used for different accounts', async () => {
    const acc1 = await request(app).post('/api/v1/accounts').send({ name: 'User 1' });
    const acc2 = await request(app).post('/api/v1/accounts').send({ name: 'User 2' });

    const sharedRef = 'SHARED-REF-123';

    const res1 = await request(app)
      .post(`/api/v1/accounts/${acc1.body.data.id}/transactions`)
      .send({ type: 'credit', amount: 50.0, reference_id: sharedRef });

    const res2 = await request(app)
      .post(`/api/v1/accounts/${acc2.body.data.id}/transactions`)
      .send({ type: 'credit', amount: 75.0, reference_id: sharedRef });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.data.current_balance).toBe(50.0);
    expect(res2.body.data.current_balance).toBe(75.0);
  });

  it('6. should reject invalid transaction inputs (negative amount, invalid type, missing reference_id)', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Validation User' });
    const accountId = acc.body.data.id;

    // Negative amount
    const r1 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: -50, reference_id: 'r1' });
    expect(r1.status).toBe(400);

    // Zero amount
    const r2 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 0, reference_id: 'r2' });
    expect(r2.status).toBe(400);

    // Invalid type
    const r3 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'transfer', amount: 50, reference_id: 'r3' });
    expect(r3.status).toBe(400);

    // Missing reference_id
    const r4 = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 50 });
    expect(r4.status).toBe(400);
  });

  it('7. should enforce transaction immutability (reject PUT, PATCH, DELETE with 405)', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Immutable User' });
    const accountId = acc.body.data.id;

    const tx = await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 100, reference_id: 'imm-1' });

    const txId = tx.body.data.id;

    const putRes = await request(app)
      .put(`/api/v1/accounts/${accountId}/transactions/${txId}`)
      .send({ amount: 200 });
    expect(putRes.status).toBe(405);

    const patchRes = await request(app)
      .patch(`/api/v1/accounts/${accountId}/transactions/${txId}`)
      .send({ description: 'Hacked' });
    expect(patchRes.status).toBe(405);

    const delRes = await request(app)
      .delete(`/api/v1/accounts/${accountId}/transactions/${txId}`);
    expect(delRes.status).toBe(405);
  });
});
