import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from './firebase';

const DUMMY_CUSTOMERS = [
  { name: 'Arjun Sharma', phone: '9876543210', email: 'arjun@example.com', address: '123 MG Road, Bangalore' },
  { name: 'Priya Patel', phone: '9988776655', email: 'priya@example.com', address: '456 Ring Road, Ahmedabad' },
  { name: 'Rahul Verma', phone: '9123456789', email: 'rahul@example.com', address: '789 Link Road, Mumbai' },
  { name: 'Ananya Iyer', phone: '9555444333', email: 'ananya@example.com', address: '321 Palace Road, Mysore' },
  { name: 'Vikram Singh', phone: '9444333222', email: 'vikram@example.com', address: '654 Hill Road, Dehradun' }
];

const DUMMY_PARTS = [
  { name: 'Oil Filter', sku: 'OF-001', category: 'Engine', stockQuantity: 25, price: 450, minStockLevel: 5, location: 'Shelf A1' },
  { name: 'Synthetic Engine Oil 5W-40', sku: 'EO-5W40', category: 'Engine', stockQuantity: 15, price: 3200, minStockLevel: 3, location: 'Shelf B2' },
  { name: 'Brake Pads (Front)', sku: 'BP-F02', category: 'Brakes', stockQuantity: 10, price: 1800, minStockLevel: 2, location: 'Shelf C1' },
  { name: 'Spark Plug Platinum', sku: 'SP-PLT', category: 'Ignition', stockQuantity: 40, price: 350, minStockLevel: 10, location: 'Shelf D4' },
  { name: 'Air Filter', sku: 'AF-102', category: 'Engine', stockQuantity: 20, price: 650, minStockLevel: 5, location: 'Shelf A2' },
  { name: 'Clutch Plate Assembly', sku: 'CP-ASSY', category: 'Transmission', stockQuantity: 5, price: 8500, minStockLevel: 2, location: 'Bulk Area 1' },
  { name: 'Battery 12V 35Ah', sku: 'BT-12V', category: 'Electrical', stockQuantity: 8, price: 4200, minStockLevel: 2, location: 'Shelf E1' },
  { name: 'Brake Fluid DOT4', sku: 'BF-DOT4', category: 'Brakes', stockQuantity: 12, price: 250, minStockLevel: 4, location: 'Shelf C3' },
  { name: 'Wiper Blade Set', sku: 'WB-SET', category: 'Accessories', stockQuantity: 30, price: 1200, minStockLevel: 5, location: 'Shelf F1' },
  { name: 'Timing Belt', sku: 'TB-99', category: 'Engine', stockQuantity: 7, price: 2400, minStockLevel: 2, location: 'Shelf A5' }
];

const VEHICLE_DATA = [
  { make: 'Maruti Suzuki', model: 'Swift', color: 'White', plateNumber: 'KA-01-MH-1234', vin: 'MA3BJ7S...' },
  { make: 'Hyundai', model: 'i20', color: 'Red', plateNumber: 'GJ-05-AL-5566', vin: 'MALH31...' },
  { make: 'Honda', model: 'City', color: 'Silver', plateNumber: 'MH-02-BQ-9988', vin: 'MAK523...' },
  { make: 'Toyota', model: 'Innova', color: 'Black', plateNumber: 'KA-05-NP-2233', vin: 'MATY77...' },
  { make: 'Tata', model: 'Nexon', color: 'Blue', plateNumber: 'UK-07-RT-0001', vin: 'MATN88...' }
];

export async function seedDummyData() {
  if (!auth.currentUser) {
    throw new Error('You must be signed in to seed data.');
  }

  const userId = auth.currentUser.uid;
  const timestamp = serverTimestamp();

  console.log('Starting seeding process...');

  try {
    // 1. Seed Parts
    const partRefs = [];
    for (const part of DUMMY_PARTS) {
      const ref = await addDoc(collection(db, 'parts'), {
        ...part,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      partRefs.push({ ...part, id: ref.id });
    }
    console.log('Parts seeded.');

    // 2. Seed Customers and Vehicles
    for (let i = 0; i < DUMMY_CUSTOMERS.length; i++) {
      const customerData = DUMMY_CUSTOMERS[i];
      const customerRef = await addDoc(collection(db, 'customers'), {
        ...customerData,
        technicianId: userId,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      console.log(`Customer ${customerData.name} seeded.`);

      // Seed Vehicle for this customer
      const vehicleData = VEHICLE_DATA[i];
      const vehicleRef = await addDoc(collection(db, 'vehicles'), {
        ...vehicleData,
        customerId: customerRef.id,
        technicianId: userId,
        createdAt: timestamp,
        updatedAt: timestamp
      });

      console.log(`Vehicle ${vehicleData.make} ${vehicleData.model} seeded for ${customerData.name}.`);

      // 3. Seed 1-2 Service Records for some customers
      if (i < 3) {
        const recordsCount = i === 0 ? 2 : 1;
        for (let j = 0; j < recordsCount; j++) {
          const status = j === 0 ? 'completed' : 'pending';
          const laborCost = 1500 + (j * 500);
          
          // Randomly pick 2 parts
          const usedParts = [
             { partId: partRefs[0].id, name: partRefs[0].name, quantity: 1, unitPrice: partRefs[0].price },
             { partId: partRefs[1].id, name: partRefs[1].name, quantity: 1, unitPrice: partRefs[1].price }
          ];

          const partsCost = usedParts.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0);
          
          await addDoc(collection(db, 'serviceRecords'), {
            vehicleId: vehicleRef.id,
            customerId: customerRef.id,
            technicianId: userId,
            date: new Date().toISOString(),
            mileage: 15000 + (i * 2000),
            description: j === 0 ? 'Regular full service and oil change.' : 'Customer reported noise from front brakes.',
            remarks: j === 0 ? 'Vehicle in good condition. Advised brake pad replacement in 5000km.' : 'Inspected front discs. Needs pad replacement.',
            status: status,
            laborCost: laborCost,
            partsCost: partsCost,
            totalCost: laborCost + partsCost,
            partsUsed: usedParts,
            createdAt: timestamp,
            updatedAt: timestamp
          });
        }
        console.log(`Service records seeded for ${customerData.name}.`);
      }
    }

    console.log('Seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

export async function clearExistingUserData() {
  if (!auth.currentUser) return;

  // We should ideally check if user is admin here to allow clearing everything,
  // but for now we'll try to delete docs and log failures.
  const collections = ['customers', 'vehicles', 'serviceRecords', 'parts'];
  
  for (const coll of collections) {
    try {
      const q = collection(db, coll);
      const snap = await getDocs(q);
      
      for (const document of snap.docs) {
        // If it's the current user's data or it's a shared collection (parts)
        // Or if the user is an admin (we try anyway and rules will decide)
        // For shared collections or apps where admin can clear all, we just try.
        try {
          await deleteDoc(doc(db, coll, document.id));
        } catch {
          // If we can't delete it, it's likely not ours and we're not admin
          console.warn(`Permission denied or error deleting doc ${document.id} in ${coll}.`);
        }
      }
    } catch (err) {
      console.error(`Error fetching collection ${coll} for clearing:`, err);
    }
  }
}
