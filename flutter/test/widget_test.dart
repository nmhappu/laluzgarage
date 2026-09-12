import 'package:flutter_test/flutter_test.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:laluz_garage/core/utils/formatters.dart';
import 'package:laluz_garage/data/models/whatsapp_preset.dart';
import 'package:laluz_garage/data/models/workshop_user.dart';
import 'package:laluz_garage/data/models/vehicle.dart';
import 'package:laluz_garage/data/models/customer.dart';
import 'package:laluz_garage/data/models/service_record.dart';
import 'package:laluz_garage/data/models/part.dart';

void main() {
  group('Formatters Tests', () {
    test('currency and odometer formatting', () {
      expect(Formatters.currency(1250), '₹1,250');
      expect(Formatters.formatCurrency(0), '₹0');
      expect(Formatters.formatOdometer(14250), '14,250');
      expect(Formatters.cleanPhoneNumber('9876543210'), '+919876543210');
      expect(Formatters.capitalize('john doe'), 'John Doe');
    });
  });

  group('WhatsApp Preset Generator Tests', () {
    final customer = Customer(
      id: 'c1',
      name: 'Rohan Sharma',
      phone: '+91 9876543210',
      technicianId: 't1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    );

    final vehicle = Vehicle(
      id: 'v1',
      customerId: 'c1',
      make: 'Ola',
      model: 'S1 Pro',
      color: 'Matte Black',
      plateNumber: 'MH12AB1234',
      passwordOrPin: 'Key',
      technicianId: 't1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    );

    final record = ServiceRecord(
      id: 'r1',
      vehicleId: 'v1',
      customerId: 'c1',
      technicianId: 't1',
      date: '2026-09-12',
      mileage: 12000,
      description: '[ ] Brake pads replacement\n[x] Oil change',
      status: ServiceStatus.completed,
      laborCost: 500,
      partsCost: 800,
      totalCost: 1300,
      partsUsed: [
        PartUsed(
          partId: 'p1',
          name: 'Front Brake Pads',
          quantity: 1,
          unitPrice: 800,
        ),
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    );

    test('generateIntakeMessage replaces placeholders', () {
      final msg = WhatsAppPresets.generateIntakeMessage(
        template: WhatsAppPresets.defaultIntakeTemplate,
        customerName: customer.name,
        vehicle: vehicle,
        record: record,
      );
      expect(msg.contains('Rohan Sharma'), isTrue);
      expect(msg.contains('MH12AB1234'), isTrue);
      expect(msg.contains('Ola S1 Pro'), isTrue);
      expect(msg.contains('[ ]'), isFalse);
    });

    test('generateDeliveryMessage formats costs and parts', () {
      final msg = WhatsAppPresets.generateDeliveryMessage(
        template: WhatsAppPresets.defaultDeliveryTemplate,
        customerName: customer.name,
        vehicle: vehicle,
        record: record,
      );
      expect(msg.contains('Rohan Sharma'), isTrue);
      expect(msg.contains('₹1,300'), isTrue);
      expect(msg.contains('Front Brake Pads'), isTrue);
    });
  });

  group('WorkshopUser Roles & Fallbacks', () {
    test('effectiveRole honors role string', () {
      final admin = WorkshopUser(
        id: 'u1',
        name: 'Admin User',
        email: 'admin@garage.com',
        status: 'online',
        role: 'admin',
        tags: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      );
      expect(admin.isAdmin, isTrue);
      expect(admin.effectiveRole, UserRole.admin);
    });

    test('effectiveRole falls back to tags', () {
      final tech = WorkshopUser(
        id: 'u2',
        name: 'Tech User',
        email: 'tech@garage.com',
        status: 'offline',
        role: null,
        tags: ['technician', 'battery'],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      );
      expect(tech.isTechnician, isTrue);
      expect(tech.effectiveRole, UserRole.technician);
    });
  });

  group('Vehicle and Part copyWith & properties', () {
    test('Vehicle isKey and copyWith', () {
      final v = Vehicle(
        id: 'v1',
        customerId: 'c1',
        make: 'Honda',
        model: 'Activa',
        color: 'White',
        plateNumber: 'MH14CD5678',
        passwordOrPin: 'key',
        technicianId: 't1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      );
      expect(v.isKey, isTrue);
      final v2 = v.copyWith(color: 'Blue');
      expect(v2.color, 'Blue');
      expect(v2.make, 'Honda');
    });

    test('Part total stock value and SKU', () {
      final p = Part(
        id: 'p1',
        name: 'Spark Plug',
        sku: 'SP-100',
        category: 'Engine',
        stockQuantity: 10,
        price: 250,
        minStockLevel: 3,
        location: 'Bin A1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      );
      expect(p.totalValue, 2500);
      expect(p.isLowStock, isFalse);
      expect(p.sku, 'SP-100');
    });

    test('generateDeliveryMessage handles empty parts cleanly', () {
      final recordWithoutParts = ServiceRecord(
        id: 'r2',
        vehicleId: 'v1',
        customerId: 'c1',
        technicianId: 't1',
        date: '2026-09-12',
        mileage: 5000,
        description: 'General Checkup',
        status: ServiceStatus.completed,
        laborCost: 350,
        partsCost: 0,
        totalCost: 350,
        partsUsed: const [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      );

      final msg = WhatsAppPresets.generateDeliveryMessage(
        template: WhatsAppPresets.defaultDeliveryTemplate,
        customerName: 'Aarav Patel',
        record: recordWithoutParts,
      );

      expect(msg.contains('Aarav Patel'), isTrue);
      expect(msg.contains('₹350'), isTrue);
      expect(msg.contains('None'), isTrue);
    });
  });
}

