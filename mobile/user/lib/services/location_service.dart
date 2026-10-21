import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class LocationSearchResult {
  final String displayName;
  final LatLng location;

  LocationSearchResult({
    required this.displayName,
    required this.location,
  });

  factory LocationSearchResult.fromJson(Map<String, dynamic> json) {
    return LocationSearchResult(
      displayName: json['display_name'] as String,
      location: LatLng(
        double.parse(json['lat']),
        double.parse(json['lon']),
      ),
    );
  }
}

class LocationService {
  static const String _baseUrl = 'https://nominatim.openstreetmap.org';

  static Future<List<LocationSearchResult>> searchLocation(String query) async {
    if (query.isEmpty) return [];

    final url = Uri.parse(
      '$_baseUrl/search?q=$query&format=json&countrycodes=bd&limit=5&accept-language=bn',
    );

    try {
      final response = await http.get(
        url,
        headers: {'User-Agent': 'GrameenTransport/1.0'},
      );

      if (response.statusCode == 200) {
        final List<dynamic> results = json.decode(response.body);
        return results
            .map((result) => LocationSearchResult.fromJson(result))
            .toList();
      }
    } catch (e) {
      print('Error searching location: $e');
    }

    return [];
  }
}
