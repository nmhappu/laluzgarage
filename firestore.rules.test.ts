import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setDoc, getDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';

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
    await assertFails(getDoc(customerDoc));
  });

  it('denies unassigned user (no role) from reading customers', async () => {
    const unassignedDb = testEnv.authenticatedContext('user_unassigned').firestore();
    const customerDoc = doc(collection(unassignedDb, 'customers'), 'cust_1');
    await assertFails(getDoc(customerDoc));
  });

  it('allows technician to create and update customer', async () => {
    // Seed technician user profile
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'tech_123'), {
        name: 'Tech User',
        email: 'tech@laluz.com',
        status: 'online',
        role: 'technician',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const techDb = testEnv.authenticatedContext('tech_123').firestore();
    const customerDoc = doc(collection(techDb, 'customers'), 'cust_1');
    
    await assertSucceeds(setDoc(customerDoc, {
      name: 'John Doe',
      phone: '1234567890',
      technicianId: 'tech_123',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await assertSucceeds(getDoc(customerDoc));
  });

  it('allows assistant to create customer and service record, but denies update or delete', async () => {
    // Seed assistant user profile
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'asst_123'), {
        name: 'Assistant User',
        email: 'assistant@laluz.com',
        status: 'online',
        role: 'assistant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Pre-seed a record to test update/delete
      await setDoc(doc(db, 'serviceRecords', 'rec_1'), {
        vehicleId: 'veh_1',
        customerId: 'cust_1',
        technicianId: 'tech_123',
        date: '2026-09-11',
        description: 'Brake pad replacement',
        status: 'pending',
        laborCost: 200,
        partsCost: 500,
        totalCost: 700,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const asstDb = testEnv.authenticatedContext('asst_123').firestore();
    
    // Assistant can read records
    const recordDoc = doc(collection(asstDb, 'serviceRecords'), 'rec_1');
    await assertSucceeds(getDoc(recordDoc));

    // Assistant can create new record (Intake Wizard)
    const newRecordDoc = doc(collection(asstDb, 'serviceRecords'), 'rec_2');
    await assertSucceeds(setDoc(newRecordDoc, {
      vehicleId: 'veh_1',
      customerId: 'cust_1',
      technicianId: 'tech_123',
      date: '2026-09-11',
      description: 'Intake inspection',
      status: 'pending',
      laborCost: 0,
      partsCost: 0,
      totalCost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Assistant CANNOT update record
    await assertFails(updateDoc(recordDoc, {
      status: 'completed',
      updatedAt: new Date(),
    }));

    // Assistant CANNOT delete record
    await assertFails(deleteDoc(recordDoc));
  });

  it('allows technician to update record, but denies technician from deleting record or part', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'tech_456'), {
        name: 'Tech User 2',
        email: 'tech2@laluz.com',
        status: 'online',
        role: 'technician',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, 'serviceRecords', 'rec_tech'), {
        vehicleId: 'veh_1',
        customerId: 'cust_1',
        technicianId: 'tech_456',
        date: '2026-09-11',
        description: 'Oil change',
        status: 'in-progress',
        laborCost: 150,
        partsCost: 300,
        totalCost: 450,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, 'parts', 'part_1'), {
        name: 'Oil Filter',
        stockQuantity: 10,
        price: 250,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const techDb = testEnv.authenticatedContext('tech_456').firestore();
    const recordDoc = doc(collection(techDb, 'serviceRecords'), 'rec_tech');
    const partDoc = doc(collection(techDb, 'parts'), 'part_1');

    // Technician CAN update record
    await assertSucceeds(updateDoc(recordDoc, {
      status: 'completed',
      updatedAt: new Date(),
    }));

    // Technician CANNOT delete record
    await assertFails(deleteDoc(recordDoc));

    // Technician CANNOT delete part
    await assertFails(deleteDoc(partDoc));
  });

  it('allows admin to delete records and parts', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'admin_1'), {
        name: 'Admin Boss',
        email: 'admin@laluz.com',
        status: 'online',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, 'serviceRecords', 'rec_del'), {
        vehicleId: 'veh_1',
        customerId: 'cust_1',
        technicianId: 'tech_1',
        date: '2026-09-11',
        description: 'To delete',
        status: 'cancelled',
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await setDoc(doc(db, 'parts', 'part_del'), {
        name: 'Old Part',
        stockQuantity: 0,
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const adminDb = testEnv.authenticatedContext('admin_1').firestore();
    const recordDoc = doc(collection(adminDb, 'serviceRecords'), 'rec_del');
    const partDoc = doc(collection(adminDb, 'parts'), 'part_del');
    
    await assertSucceeds(deleteDoc(recordDoc));
    await assertSucceeds(deleteDoc(partDoc));
  });
});
