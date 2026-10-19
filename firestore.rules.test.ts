import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setDoc, getDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import { jobChanges } from './src/core/jobs';
import type { ServiceRecord } from './src/types';

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

  it('rejects job card totals that do not equal labour plus parts', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'tech_tot'), {
        name: 'Tech Totals',
        email: 'totals@laluz.com',
        status: 'online',
        role: 'technician',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'serviceRecords', 'rec_tot'), {
        vehicleId: 'veh_1',
        customerId: 'cust_1',
        technicianId: 'tech_tot',
        date: '2026-10-19',
        description: 'General service',
        status: 'in-progress',
        laborCost: 800,
        partsCost: 1170.5,
        totalCost: 1970.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // A legacy card whose total never added up.
      await setDoc(doc(db, 'serviceRecords', 'rec_legacy'), {
        vehicleId: 'veh_1',
        customerId: 'cust_1',
        technicianId: 'tech_tot',
        date: '2025-01-02',
        description: 'Old card',
        status: 'completed',
        laborCost: 500,
        partsCost: 500,
        totalCost: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const techDb = testEnv.authenticatedContext('tech_tot').firestore();
    const recordDoc = doc(techDb, 'serviceRecords', 'rec_tot');
    const legacyDoc = doc(techDb, 'serviceRecords', 'rec_legacy');

    // Labour, parts and total change together and add up.
    await assertSucceeds(updateDoc(recordDoc, { laborCost: 1200, partsCost: 1890.25, totalCost: 3090.25, updatedAt: new Date() }));
    // A total that doesn't match labour + parts.
    await assertFails(updateDoc(recordDoc, { laborCost: 1500, totalCost: 100, updatedAt: new Date() }));
    // Labour changed without the total following.
    await assertFails(updateDoc(recordDoc, { laborCost: 2000, updatedAt: new Date() }));
    // Creating a card with a made-up total.
    await assertFails(setDoc(doc(techDb, 'serviceRecords', 'rec_bad'), {
      vehicleId: 'veh_1',
      customerId: 'cust_1',
      technicianId: 'tech_tot',
      date: '2026-10-19',
      description: 'Intake',
      status: 'pending',
      laborCost: 0,
      partsCost: 0,
      totalCost: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // The legacy card can still be edited when the money is untouched...
    await assertSucceeds(updateDoc(legacyDoc, { remarks: 'Checked', updatedAt: new Date() }));
    // ...but a money edit has to fix the total.
    await assertFails(updateDoc(legacyDoc, { laborCost: 600, updatedAt: new Date() }));
    await assertSucceeds(updateDoc(legacyDoc, { laborCost: 600, totalCost: 1100, updatedAt: new Date() }));
  });

  it('denies access to the old test collection', async () => {
    const userDb = testEnv.authenticatedContext('any_user').firestore();
    await assertFails(getDoc(doc(userDb, 'test', 'ping')));
    await assertFails(setDoc(doc(userDb, 'test', 'ping'), { ok: true }));
  });

  it('keeps both edits when two people save the same job card', async () => {
    const card: ServiceRecord = {
      id: 'rec_two',
      vehicleId: 'veh_1',
      customerId: 'cust_1',
      technicianId: 'tech_a',
      date: '2026-10-19',
      mileage: 42180,
      isDeadVehicle: false,
      isUnknownMileage: false,
      description: '[ ] General service',
      remarks: null,
      status: 'in-progress',
      laborCost: 800,
      partsCost: 0,
      totalCost: 800,
      partsUsed: [],
    };
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      for (const id of ['tech_a', 'tech_b']) {
        await setDoc(doc(db, 'users', id), { name: id, email: id + '@laluz.com', status: 'online', role: 'technician', createdAt: new Date(), updatedAt: new Date() });
      }
      const { id, ...data } = card;
      await setDoc(doc(db, 'serviceRecords', id), { ...data, createdAt: new Date(), updatedAt: new Date() });
    });

    // Both open the card at the same time. A adds a part; B changes the odometer and remarks.
    const line = { partId: 'p1', name: 'Oil filter', quantity: 1, unitPrice: 350 };
    const fromA = jobChanges(card, { ...card, partsUsed: [line], partsCost: 350, totalCost: 1150 });
    const fromB = jobChanges(card, { ...card, mileage: 42200, remarks: 'Noise from front left' });
    expect(Object.keys(fromB).sort()).toEqual(['mileage', 'remarks']);

    const aDb = testEnv.authenticatedContext('tech_a').firestore();
    const bDb = testEnv.authenticatedContext('tech_b').firestore();
    await assertSucceeds(updateDoc(doc(aDb, 'serviceRecords', card.id), { ...fromA, updatedAt: new Date() }));
    await assertSucceeds(updateDoc(doc(bDb, 'serviceRecords', card.id), { ...fromB, updatedAt: new Date() }));

    const saved = (await getDoc(doc(aDb, 'serviceRecords', card.id))).data();
    expect(saved?.partsUsed).toEqual([line]);
    expect(saved?.totalCost).toBe(1150);
    expect(saved?.mileage).toBe(42200);
    expect(saved?.remarks).toBe('Noise from front left');
  });
});
