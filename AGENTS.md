# Project Instructions

## Future Considerations
- **Database Migration**: The user intends to migrate from Firebase Firestore to a self-hosted database (e.g., PostgreSQL or MySQL) in the future. Keep this scalability and portability requirement in mind when designing data models or service layers.
- **Security & RBAC**: A role-based access control system is planned. Roles include 'admin' (full access), 'advisor' (job cards/customers, no pricing/deletions), and 'technician' (status updates, mileage, parts allocation). Implementation will involve a `users` collection in Firestore, client-side permission hooks, and server-side Firestore rules.
