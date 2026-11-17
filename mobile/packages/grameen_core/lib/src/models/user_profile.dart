import 'enums.dart';
import 'json.dart';

/// GiLab employee benefits ("sparks"), as `GET /user-profiles/me` returns them.
/// Everything is off for non-employees or when an admin turns the perks off.
class Sparks {
  const Sparks({
    this.isEmployee = false,
    this.designation,
    this.badge,
    this.greetingName,
    this.discountPct = 0,
    this.monthlyCapBdt = 0,
    this.usedThisMonthBdt = 0,
    this.remainingThisMonthBdt = 0,
    this.vehicleTypes = const [],
    this.priorityDispatch = false,
  });

  factory Sparks.fromJson(Json json) => Sparks(
        isEmployee: asBool(json['isEmployee']),
        designation: asString(json['designation']),
        badge: asString(json['badge']),
        greetingName: asString(json['greetingName']),
        discountPct: asDouble(json['discountPct']) ?? 0,
        monthlyCapBdt: asDouble(json['monthlyCapBdt']) ?? 0,
        usedThisMonthBdt: asDouble(json['usedThisMonthBdt']) ?? 0,
        remainingThisMonthBdt: asDouble(json['remainingThisMonthBdt']) ?? 0,
        vehicleTypes: asStringList(json['vehicleTypes']).map(VehicleType.fromWire).toList(),
        priorityDispatch: asBool(json['priorityDispatch']),
      );

  final bool isEmployee;
  final String? designation;

  /// Text shown to drivers, e.g. "GiLab কর্মী · Administrative Assistant".
  final String? badge;

  /// Name to greet the user with; includes the designation when enabled.
  final String? greetingName;
  final double discountPct;
  final double monthlyCapBdt;
  final double usedThisMonthBdt;
  final double remainingThisMonthBdt;

  /// Empty means every vehicle type.
  final List<VehicleType> vehicleTypes;
  final bool priorityDispatch;
}

/// `GET /user-profiles/me`. [id] is the id the realtime gateway and all
/// trip/notification records use — not the auth user id or the phone number.
class UserProfile {
  const UserProfile({
    required this.id,
    required this.authUserId,
    required this.phoneNumber,
    this.email,
    this.firstName,
    this.lastName,
    this.profileImageUrl,
    this.userType = UserType.passenger,
    this.languagePreference = 'bn',
    this.isActive = true,
    this.phoneVerified = false,
    this.emailVerified = false,
    this.platformRoles = const [PlatformRole.customer],
    this.permissions = const [],
    this.isStaff = false,
    this.isEmployee = false,
    this.designation,
    this.isBlocked = false,
    this.sparks = const Sparks(),
  });

  factory UserProfile.fromJson(Json json) => UserProfile(
        id: json['id'].toString(),
        authUserId: asString(json['authUserId']) ?? '',
        phoneNumber: asString(json['phoneNumber']) ?? '',
        email: asString(json['email']),
        firstName: asString(json['firstName']),
        lastName: asString(json['lastName']),
        profileImageUrl: asString(json['profileImageUrl']),
        userType: UserType.fromWire(json['userType']),
        languagePreference: asString(json['languagePreference']) ?? 'bn',
        isActive: asBool(json['isActive'], fallback: true),
        phoneVerified: asBool(json['phoneVerified']),
        emailVerified: asBool(json['emailVerified']),
        platformRoles: json['platformRoles'] is List
            ? asStringList(json['platformRoles']).map(PlatformRole.fromWire).toList()
            : const [PlatformRole.customer],
        permissions: asStringList(json['permissions']),
        isStaff: asBool(json['isStaff']),
        isEmployee: asBool(json['isEmployee']),
        designation: asString(json['designation']),
        isBlocked: json['status'] == 'blocked',
        sparks: Sparks.fromJson(asJson(json['sparks'])),
      );

  final String id;
  final String authUserId;
  final String phoneNumber;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? profileImageUrl;

  /// Legacy; use [platformRoles] / [isDriver].
  final UserType userType;
  final String languagePreference;
  final bool isActive;
  final bool phoneVerified;
  final bool emailVerified;
  final List<PlatformRole> platformRoles;

  /// Server permission names such as `trips.book` or `trips.drive`.
  final List<String> permissions;
  final bool isStaff;
  final bool isEmployee;
  final String? designation;
  final bool isBlocked;
  final Sparks sparks;

  bool get isDriver => platformRoles.contains(PlatformRole.driver);
  bool can(String permission) => permissions.contains(permission);

  String get fullName =>
      [firstName, lastName].where((p) => p != null && p.isNotEmpty).join(' ');

  /// What to call the user: the designation greeting for GiLab employees, else the name.
  String get displayName => sparks.greetingName ?? fullName;
}
