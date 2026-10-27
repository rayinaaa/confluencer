import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import './setup.js';

const app = createApp();

describe('Transaction History, Pagination, Sorting, and Filtering', () => {
  it('1. should support pagination and return correct metadata', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Pagination Test' });
    const accountId = acc.body.data.id;

    // Create 5 transactions
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 10 * i,
          reference_id: `page-ref-${i}`,
          description: `Tx #${i}`,
        });
    }

    // Request page 1 with limit 2
    const res1 = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?page=1&limit=2`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.records.length).toBe(2);
    expect(res1.body.data.pagination).toEqual({
      current_page: 1,
      page_size: 2,
      total_records: 5,
      total_pages: 3,
    });

    // Request page 3 with limit 2 (should have 1 record left)
    const res3 = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?page=3&limit=2`);

    expect(res3.status).toBe(200);
    expect(res3.body.data.records.length).toBe(1);
    expect(res3.body.data.pagination.current_page).toBe(3);
  });

  it('2. should return transactions in latest-first order based on created_at', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Sorting Test' });
    const accountId = acc.body.data.id;

    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 10, reference_id: 'first-tx' });

    // Small delay to ensure timestamp progression
    await new Promise((resolve) => setTimeout(resolve, 20));

    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 20, reference_id: 'second-tx' });

    const res = await request(app).get(`/api/v1/accounts/${accountId}/transactions`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBe(2);
    // Latest transaction must appear first
    expect(res.body.data.records[0].reference_id).toBe('second-tx');
    expect(res.body.data.records[1].reference_id).toBe('first-tx');
  });

  it('3. should filter transactions by credit and debit types', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Filter Test' });
    const accountId = acc.body.data.id;

    // Credit 200
    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 200, reference_id: 'cred-1' });

    // Debit 50
    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'debit', amount: 50, reference_id: 'deb-1' });

    // Credit 100
    await request(app)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({ type: 'credit', amount: 100, reference_id: 'cred-2' });

    // Query credit only
    const creditRes = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?type=credit`);
    expect(creditRes.status).toBe(200);
    expect(creditRes.body.data.records.length).toBe(2);
    expect(creditRes.body.data.records.every((t: any) => t.type === 'credit')).toBe(true);

    // Query debit only
    const debitRes = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?type=debit`);
    expect(debitRes.status).toBe(200);
    expect(debitRes.body.data.records.length).toBe(1);
    expect(debitRes.body.data.records[0].reference_id).toBe('deb-1');

    // Query all (no type filter)
    const allRes = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.records.length).toBe(3);
  });

  it('4. should reject invalid pagination parameters with 400', async () => {
    const acc = await request(app).post('/api/v1/accounts').send({ name: 'Invalid Params' });
    const accountId = acc.body.data.id;

    // Page = 0
    const res1 = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?page=0`);
    expect(res1.status).toBe(400);

    // Limit = -1
    const res2 = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?limit=-1`);
    expect(res2.status).toBe(400);

    // Limit > 100
    const res3 = await request(app)
      .get(`/api/v1/accounts/${accountId}/transactions?limit=500`);
    expect(res3.status).toBe(400);
  });
});
