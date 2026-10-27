import { beforeAll, beforeEach, afterAll } from 'vitest';
import { getDatabase, closeDatabase, resetDatabase } from '../src/db/database.js';

let testDb: ReturnType<typeof getDatabase>;

beforeAll(() => {
  // Use in-memory database for isolated fast tests
  process.env.NODE_ENV = 'test';
  testDb = getDatabase(':memory:');
});

beforeEach(() => {
  resetDatabase(testDb);
});

afterAll(() => {
  closeDatabase();
});

export { testDb };
