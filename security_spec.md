# Security Specification

## Data Invariants
1. A **Customer** must be registered by a technician.
2. A **Vehicle** must belong to an existing Customer.
3. A **ServiceRecord** must reference a valid Vehicle and Customer.
4. **ServiceRecords** are immutable once created, except for status and details updates.
5. Only **Admins** can purge (delete) records to maintain historical integrity.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing (Customer Creation)**: Attempt to create a customer with a `technicianId` that doesn't match the current user.
2. **Identity Spoofing (Update)**: Attempt to update a customer's `technicianId` to another user's ID.
3. **Privilege Escalation**: Non-admins attempting to delete a ServiceRecord.
4. **Data Corruption**: Attempting to set `laborCost` or `partsCost` to a non-numeric value or a string.
5. **Orphaned Record (Vehicle)**: Creating a vehicle with a non-existent `customerId`.
6. **Orphaned Record (ServiceRecord)**: Creating a service record with a non-existent `vehicleId`.
7. **Bypassing Server Timestamp**: Attempting to set `updatedAt` to a client-side date string instead of `request.time`.
8. **Shadow Field Injection**: Adding an `isAdmin: true` field to a user profile or customer document.
9. **State Shortcut**: Forcing a service record from `pending` straight to `completed` without entering required fields (handled by schema checks).
10. **ID Poisoning**: Using a 1MB string as a document ID.
11. **PII Blanket Read**: A signed-in user attempting to list all technicians' customers (rules should enforce list filtering).
12. **Unauthorized Stock Manipulation**: Manually updating a part's `stockQuantity` to an arbitrary high value (should be restricted).

## Test Runner (Draft)
The tests will be implemented in `DRAFT_firestore.rules.test.ts`.
