import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Part } from '../types';

/**
 * Inventory Service
 * Handles all Firestore operations for Parts and Shop Supplies.
 * Includes real-time subscriptions, stock adjustments, and CRUD operations.
 */
export const inventoryService = {
  /**
   * Subscribes to real-time updates for all parts, ordered by name.
   */
  subscribeToParts: (callback: (parts: Part[]) => void) => {
    const q = query(collection(db, 'parts'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const parts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Part));
      callback(parts);
    });
  },

  /**
   * Adds a new part to the catalog.
   */
  addPart: async (part: Partial<Part>) => {
    return addDoc(collection(db, 'parts'), {
      ...part,
      sku: part.sku || '',
      stockQuantity: Number(part.stockQuantity || 0),
      price: Number(part.price || 0),
      minStockLevel: Number(part.minStockLevel || 5),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Updates an existing part.
   * If a stock adjustment is provided, it uses a transaction to ensure atomicity.
   */
  updatePart: async (id: string, updates: Partial<Part>, adjustment?: number) => {
    const partRef = doc(db, 'parts', id);
    
    // Use transaction for stock consistency if adjusting quantity
    if (adjustment !== undefined && adjustment !== 0) {
      return runTransaction(db, async (transaction) => {
        const partDoc = await transaction.get(partRef);
        if (!partDoc.exists()) throw new Error("Part not found in inventory");
        
        const currentStock = Number(partDoc.data().stockQuantity || 0);
        const newStock = currentStock + adjustment;
        
        if (newStock < 0) throw new Error("Insufficient stock for this adjustment");

        // Remove ID and timestamps from payload to prevent Firestore data collision
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, createdAt: __, updatedAt: ___, ...data } = updates;

        transaction.update(partRef, {
          ...data,
          stockQuantity: newStock,
          updatedAt: serverTimestamp()
        });
      });
    }

    // Standard field update
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt, updatedAt, ...data } = updates;
    return updateDoc(partRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Removes a part from the database.
   */
  deletePart: async (id: string) => {
    return deleteDoc(doc(db, 'parts', id));
  }
};
