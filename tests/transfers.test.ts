import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import './setup.js';

const app = createApp();

describe('Bonus Feature: Money Transfer', () => {
  it('1. should execute atomic money transfer between Account A and Account B', async () => {
    // Account A balance: 100
    const accA = await request(app).post('/api/v1/accounts').send({ name: 'Account A' });
    const idA = accA.body.data.id;
    await request(app)
      .post(`/api/v1/accounts/${idA}/transactions`)
      .send({ type: 'credit', amount: 100.0, reference_id: 'fund-a' });

    // Account B balance: 50
    const accB = await request(app).post('/api/v1/accounts').send({ name: 'Account B' });
    const idB = accB.body.data.id;
    await request(app)
      .post(`/api/v1/accounts/${idB}/transactions`)
      .send({ type: 'credit', amount: 50.0, reference_id: 'fund-b' });

    // Transfer 30 from A to B
    const transferRes = await request(app)
      .post('/api/v1/transfers')
      .send({
        source_account_id: idA,
        destination_account_id: idB,
        amount: 30.0,
        reference_id: 'trf-ab-001',
        description: 'Payment from A to B',
      });

    expect(transferRes.status).toBe(201);
    expect(transferRes.body.success).toBe(true);
    expect(transferRes.body.data.source_account.new_balance).toBe(70.0);
    expect(transferRes.body.data.destination_account.new_balance).toBe(80.0);

    // Verify stored balances
    const balA = await request(app).get(`/api/v1/accounts/${idA}/balance`);
    const balB = await request(app).get(`/api/v1/accounts/${idB}/balance`);
    expect(balA.body.data.balance).toBe(70.0);
    expect(balB.body.data.balance).toBe(80.0);
  });

  it('2. should reject transfer and rollback if source account has insufficient balance', async () => {
    const accA = await request(app).post('/api/v1/accounts').send({ name: 'Account A' });
    const idA = accA.body.data.id;
    await request(app)
      .post(`/api/v1/accounts/${idA}/transactions`)
      .send({ type: 'credit', amount: 40.0, reference_id: 'fund-a-low' });

    const accB = await request(app).post('/api/v1/accounts').send({ name: 'Account B' });
    const idB = accB.body.data.id;

    // Attempt to transfer 100 (balance is only 40)
    const transferRes = await request(app)
      .post('/api/v1/transfers')
      .send({
        source_account_id: idA,
        destination_account_id: idB,
        amount: 100.0,
        reference_id: 'trf-fail-1',
      });

    expect(transferRes.status).toBe(422);
    expect(transferRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

    // Both balances must remain completely unchanged
    const balA = await request(app).get(`/api/v1/accounts/${idA}/balance`);
    const balB = await request(app).get(`/api/v1/accounts/${idB}/balance`);
    expect(balA.body.data.balance).toBe(40.0);
    expect(balB.body.data.balance).toBe(0.0);
  });

  it('3. should reject transfer if destination account does not exist', async () => {
    const accA = await request(app).post('/api/v1/accounts').send({ name: 'Account A' });
    const idA = accA.body.data.id;
    await request(app)
      .post(`/api/v1/accounts/${idA}/transactions`)
      .send({ type: 'credit', amount: 100.0, reference_id: 'fund-a-ok' });

    const nonExistentId = '11111111-1111-1111-1111-111111111111';

    const transferRes = await request(app)
      .post('/api/v1/transfers')
      .send({
        source_account_id: idA,
        destination_account_id: nonExistentId,
        amount: 25.0,
        reference_id: 'trf-bad-dest',
      });

    expect(transferRes.status).toBe(404);

    // Source balance must remain 100.0
    const balA = await request(app).get(`/api/v1/accounts/${idA}/balance`);
    expect(balA.body.data.balance).toBe(100.0);
  });

  it('4. should reject transfer to the same account', async () => {
    const accA = await request(app).post('/api/v1/accounts').send({ name: 'Account A' });
    const idA = accA.body.data.id;

    const transferRes = await request(app)
      .post('/api/v1/transfers')
      .send({
        source_account_id: idA,
        destination_account_id: idA,
        amount: 10.0,
        reference_id: 'trf-self',
      });

    expect(transferRes.status).toBe(400);
  });
});
