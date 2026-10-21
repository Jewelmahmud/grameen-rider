import 'dart:convert';

class FavoriteLocation {
  final String name;
  final String address;
  final double latitude;
  final double longitude;

  const FavoriteLocation({
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
    };
  }

  factory FavoriteLocation.fromMap(Map<String, dynamic> map) {
    return FavoriteLocation(
      name: map['name'] as String? ?? '',
      address: map['address'] as String? ?? '',
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
    );
  }

  String toJson() => json.encode(toMap());

  factory FavoriteLocation.fromJson(String source) =>
      FavoriteLocation.fromMap(json.decode(source) as Map<String, dynamic>);
}
