// Parsing helpers shared by the models.
//
// TypeORM returns Postgres `decimal`/`numeric` columns as strings
// ("150.00"), and some ids as numbers, so every reader here is lenient.

typedef Json = Map<String, dynamic>;

Json asJson(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

String? asString(Object? value) => value?.toString();

double? asDouble(Object? value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

int? asInt(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? double.tryParse(value.toString())?.toInt();
}

bool asBool(Object? value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) return value == 'true' || value == '1';
  return fallback;
}

DateTime? asDate(Object? value) =>
    value == null ? null : DateTime.tryParse(value.toString())?.toLocal();

List<String> asStringList(Object? value) =>
    value is List ? value.map((e) => e.toString()).toList() : const [];

List<T> asList<T>(Object? value, T Function(Json json) parse) =>
    value is List ? value.whereType<Map>().map((e) => parse(asJson(e))).toList() : <T>[];

/// Drops null entries so optional fields are left out of request bodies.
Json compactJson(Json json) => Map.of(json)..removeWhere((_, v) => v == null);

/// Finds the enum value whose wire name matches, or [fallback].
T enumFromWire<T extends Enum>(
  List<T> values,
  Object? wire,
  String Function(T) toWire,
  T fallback,
) {
  for (final value in values) {
    if (toWire(value) == wire) return value;
  }
  return fallback;
}
