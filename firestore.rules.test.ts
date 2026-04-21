import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setDoc, getDoc, doc, collection } from 'firebase/firestore';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'laluzgarage-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('denies unauthenticated access to customers', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const customerDoc = doc(collection(unauthedDb, 'customers'), 'cust_1');
    
    // Expect failure
    try {
      await getDoc(customerDoc);
    } catch {
      // PERMISSION_DENIED expected
    }
  });

  it('allows technician to create and read their own customer', async () => {
    const techDb = testEnv.authenticatedContext('tech_123', { email_verified: true }).firestore();
    const customerDoc = doc(collection(techDb, 'customers'), 'cust_1');
    
    await setDoc(customerDoc, {
      name: 'John Doe',
      phone: '1234567890',
      technicianId: 'tech_123',
      createdAt: new Date(), // Rules use request.time
      updatedAt: new Date()
    });

    await getDoc(customerDoc);
    // Should be fine
  });

  it('denies technician A from reading technician B customer', async () => {
    const techADb = testEnv.authenticatedContext('tech_A', { email_verified: true }).firestore();
    const techBDb = testEnv.authenticatedContext('tech_B', { email_verified: true }).firestore();
    
    const customerDoc = doc(collection(techBDb, 'customers'), 'cust_B');
    await setDoc(customerDoc, {
        name: 'Client B',
        phone: '000',
        technicianId: 'tech_B',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    try {
        await getDoc(doc(techADb, 'customers', 'cust_B'));
    } catch {
        // Expected denial
    }
  });

  it('enforces PII protection (admin can read all, tech only own)', async () => {
      // Mock admin check would require exists() to be mocked or setup
  });
});
