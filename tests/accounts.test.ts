import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import './setup.js';

const app = createApp();

describe('Account Endpoints', () => {
  it('1. should create an account with initial balance 0.0 and generated timestamps', async () => {
    const res = await request(app)
      .post('/api/v1/accounts')
      .send({ name: 'Alice Walker' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Alice Walker');
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data).toHaveProperty('created_at');
    expect(new Date(res.body.data.created_at).getTime()).not.toBeNaN();
  });

  it('2. should reject account creation without a name', async () => {
    const res = await request(app)
      .post('/api/v1/accounts')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('3. should reject account creation with empty name', async () => {
    const res = await request(app)
      .post('/api/v1/accounts')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. should reject account creation if client attempts to provide initial balance', async () => {
    const res = await request(app)
      .post('/api/v1/accounts')
      .send({ name: 'Bob Dylan', balance: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid request body data');
  });

  it('5. should fetch balance of an existing account', async () => {
    const created = await request(app)
      .post('/api/v1/accounts')
      .send({ name: 'Charlie Brown' });

    const accountId = created.body.data.id;

    const balanceRes = await request(app).get(`/api/v1/accounts/${accountId}/balance`);

    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.success).toBe(true);
    expect(balanceRes.body.data.account_id).toBe(accountId);
    expect(balanceRes.body.data.balance).toBe(0);
  });

  it('6. should return 404 when fetching balance of non-existent account', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/api/v1/accounts/${nonExistentId}/balance`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
