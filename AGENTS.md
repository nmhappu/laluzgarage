# Project Instructions

## Future Considerations
- **Database Migration**: The user intends to migrate from Firebase Firestore to a self-hosted database (e.g., PostgreSQL or MySQL) in the future. Keep this scalability and portability requirement in mind when designing data models or service layers.
- **Security & RBAC**: A role-based access control system is planned. Roles include 'admin' (full access), 'service manager' (job cards/customers, no pricing/deletions), and 'technician' (status updates, mileage, parts allocation). Implementation will involve a `users` collection in Firestore, client-side permission hooks, and server-side Firestore rules.
- **Performance Optimization**: The current UI uses `backdrop-blur` extensively in modals and overlays. If performance issues are observed on lower-end mobile devices, consider replacing these with solid or semi-opaque backgrounds for better efficiency.
- **GST Billing Integration**: A Goods and Services Tax (GST) system is planned for the service billing engine. This will involve updating the service record schemas in Firestore to track taxable amounts separately (e.g., labor subtotal, parts subtotal) and adding UI controls to compute, display, and invoice the breakdown of GST along with gross amounts.
