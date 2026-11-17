import 'enums.dart';
import 'json.dart';

class Promotion {
  const Promotion({
    required this.id,
    required this.code,
    required this.title,
    required this.discountType,
    required this.discountValue,
    this.description,
    this.maxDiscountAmount,
    this.minTripAmount,
    this.validFrom,
    this.validUntil,
    this.applicableVehicleTypes = const [],
  });

  factory Promotion.fromJson(Json json) => Promotion(
        id: json['id'].toString(),
        code: asString(json['code']) ?? '',
        title: asString(json['title']) ?? '',
        description: asString(json['description']),
        discountType: DiscountType.fromWire(json['discountType']),
        discountValue: asDouble(json['discountValue']) ?? 0,
        maxDiscountAmount: asDouble(json['maxDiscountAmount']),
        minTripAmount: asDouble(json['minTripAmount']),
        validFrom: asDate(json['validFrom']),
        validUntil: asDate(json['validUntil']),
        applicableVehicleTypes: asStringList(json['applicableVehicleTypes'])
            .map(VehicleType.fromWire)
            .toList(),
      );

  final String id;
  final String code;
  final String title;
  final String? description;
  final DiscountType discountType;
  final double discountValue;
  final double? maxDiscountAmount;
  final double? minTripAmount;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final List<VehicleType> applicableVehicleTypes;
}

/// `POST /promotions/validate`. An invalid code comes back as an
/// [ApiException] (400), not as `valid: false`.
class PromoValidation {
  const PromoValidation({
    required this.valid,
    required this.discountAmount,
    required this.finalAmount,
    this.promotion,
  });

  factory PromoValidation.fromJson(Json json) => PromoValidation(
        valid: asBool(json['valid']),
        discountAmount: asDouble(json['discountAmount']) ?? 0,
        finalAmount: asDouble(json['finalAmount']) ?? 0,
        promotion: json['promotion'] is Map
            ? Promotion.fromJson(asJson(json['promotion']))
            : null,
      );

  final bool valid;
  final double discountAmount;
  final double finalAmount;
  final Promotion? promotion;
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.data = const {},
    this.tripId,
    this.isRead = false,
    this.createdAt,
  });

  factory AppNotification.fromJson(Json json) => AppNotification(
        id: json['id'].toString(),
        title: asString(json['title']) ?? '',
        body: asString(json['body']) ?? '',
        type: asString(json['notificationType']) ?? 'system',
        data: asJson(json['data']),
        tripId: asString(json['tripId']),
        isRead: asBool(json['isRead']),
        createdAt: asDate(json['createdAt']),
      );

  final String id;
  final String title;
  final String body;

  /// Backend `notificationType`, e.g. `driver_assigned`, `promotion`.
  final String type;
  final Json data;
  final String? tripId;
  final bool isRead;
  final DateTime? createdAt;
}

class FavoriteLocation {
  const FavoriteLocation({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.locationType = LocationType.other,
    this.isDefault = false,
  });

  factory FavoriteLocation.fromJson(Json json) => FavoriteLocation(
        id: json['id'].toString(),
        name: asString(json['name']) ?? '',
        address: asString(json['address']) ?? '',
        latitude: asDouble(json['latitude']) ?? 0,
        longitude: asDouble(json['longitude']) ?? 0,
        locationType: LocationType.fromWire(json['locationType']),
        isDefault: asBool(json['isDefault']),
      );

  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final LocationType locationType;
  final bool isDefault;
}

/// Body of `POST /locations/favorites` and `PUT /locations/favorites/:id`.
class FavoriteLocationInput {
  const FavoriteLocationInput({
    this.name,
    this.address,
    this.latitude,
    this.longitude,
    this.locationType,
    this.isDefault,
  });

  final String? name;
  final String? address;
  final double? latitude;
  final double? longitude;
  final LocationType? locationType;
  final bool? isDefault;

  Json toJson() => compactJson({
        'name': name,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
        'locationType': locationType?.wire,
        'isDefault': isDefault,
      });
}

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.subject,
    required this.description,
    required this.category,
    required this.status,
    required this.priority,
    this.tripId,
    this.resolution,
    this.createdAt,
    this.updatedAt,
  });

  factory SupportTicket.fromJson(Json json) => SupportTicket(
        id: json['id'].toString(),
        subject: asString(json['subject']) ?? '',
        description: asString(json['description']) ?? '',
        category: TicketCategory.fromWire(json['category']),
        status: TicketStatus.fromWire(json['status']),
        priority: TicketPriority.fromWire(json['priority']),
        tripId: asString(json['tripId']),
        resolution: asString(json['resolution']),
        createdAt: asDate(json['createdAt']),
        updatedAt: asDate(json['updatedAt']),
      );

  final String id;
  final String subject;
  final String description;
  final TicketCategory category;
  final TicketStatus status;
  final TicketPriority priority;
  final String? tripId;
  final String? resolution;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

/// Body of `POST /support/tickets`.
class CreateTicketRequest {
  const CreateTicketRequest({
    required this.subject,
    required this.description,
    required this.category,
    this.priority = TicketPriority.medium,
    this.tripId,
  });

  final String subject;
  final String description;
  final TicketCategory category;
  final TicketPriority priority;
  final String? tripId;

  Json toJson() => compactJson({
        'subject': subject,
        'description': description,
        'category': category.wire,
        'priority': priority.wire,
        'tripId': tripId,
      });
}

class SupportMessage {
  const SupportMessage({
    required this.id,
    required this.ticketId,
    required this.message,
    this.senderAuthUserId,
    this.createdAt,
  });

  factory SupportMessage.fromJson(Json json) => SupportMessage(
        id: json['id'].toString(),
        ticketId: asString(json['ticketId']) ?? '',
        message: asString(json['message']) ?? '',
        senderAuthUserId: asString(json['senderAuthUserId']),
        createdAt: asDate(json['createdAt']),
      );

  final String id;
  final String ticketId;
  final String message;

  /// Compare with `UserProfile.authUserId` to tell own messages from staff replies.
  final String? senderAuthUserId;
  final DateTime? createdAt;
}

class Payment {
  const Payment({
    required this.id,
    required this.tripId,
    required this.amount,
    required this.currency,
    required this.paymentMethod,
    required this.status,
    this.transactionId,
    this.paymentDate,
  });

  factory Payment.fromJson(Json json) => Payment(
        id: json['id'].toString(),
        tripId: asString(json['tripId']) ?? '',
        amount: asDouble(json['amount']) ?? 0,
        currency: asString(json['currency']) ?? 'BDT',
        paymentMethod: asString(json['paymentMethod']) ?? '',
        status: PaymentStatus.fromWire(json['paymentStatus']),
        transactionId: asString(json['transactionId']),
        paymentDate: asDate(json['paymentDate']),
      );

  final String id;
  final String tripId;
  final double amount;
  final String currency;

  /// e.g. `cash`, `bkash`.
  final String paymentMethod;
  final PaymentStatus status;
  final String? transactionId;
  final DateTime? paymentDate;
}

/// `POST /payments` returns the payment plus an optional provider checkout URL.
class PaymentCheckout {
  const PaymentCheckout({required this.payment, this.checkoutUrl});

  factory PaymentCheckout.fromJson(Json json) => PaymentCheckout(
        payment: Payment.fromJson(asJson(json['payment'])),
        checkoutUrl: asString(json['checkoutUrl']),
      );

  final Payment payment;
  final String? checkoutUrl;
}
