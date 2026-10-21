import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

class MapService {
  static const String openRouteServiceApiKey =
      'YOUR_OPENROUTESERVICE_API_KEY'; // Free API key
  static const String nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
  static const String openRouteServiceBaseUrl =
      'https://api.openrouteservice.org';

  // Calculate distance between two points using Haversine formula
  static double calculateDistance(LatLng point1, LatLng point2) {
    const Distance distance = Distance();
    return distance.as(LengthUnit.Kilometer, point1, point2);
  }

  // Calculate price based on distance, vehicle type, and passenger count
  static double calculatePrice(
    double distanceKm,
    String vehicleType, {
    int passengerCount = 1,
  }) {
    // Base fare + per km rate for different vehicle types in Bangladesh
    Map<String, Map<String, dynamic>> pricing = {
      'রিকশা': {
        'baseFare': 20.0,
        'perKm': 15.0,
        'maxPassengers': 2,
        'extraPassengerRate': 10.0, // Extra charge per additional passenger
      },
      'সিএনজি': {
        'baseFare': 50.0,
        'perKm': 25.0,
        'maxPassengers': 3,
        'extraPassengerRate': 15.0,
      },
      'ভ্যান': {
        'baseFare': 80.0,
        'perKm': 30.0,
        'maxPassengers': 8,
        'extraPassengerRate': 12.0,
      },
      'মটর বাইক': {
        'baseFare': 30.0,
        'perKm': 20.0,
        'maxPassengers': 1, // Only driver
        'extraPassengerRate': 0.0,
      },
      'অটো': {
        'baseFare': 60.0,
        'perKm': 28.0,
        'maxPassengers': 4,
        'extraPassengerRate': 12.0,
      },
      'পিকাপ ভ্যান': {
        'baseFare': 150.0,
        'perKm': 40.0,
        'maxPassengers': 10,
        'extraPassengerRate': 8.0,
      },
      'কার রেন্টাল': {
        'baseFare': 200.0,
        'perKm': 50.0,
        'maxPassengers': 4,
        'extraPassengerRate': 20.0,
      },
    };

    final vehiclePricing = pricing[vehicleType] ?? pricing['সিএনজি']!;
    final baseFare = vehiclePricing['baseFare']! as double;
    final perKm = vehiclePricing['perKm']! as double;
    final maxPassengers = vehiclePricing['maxPassengers']! as int;
    final extraPassengerRate = vehiclePricing['extraPassengerRate']! as double;

    // Calculate base price
    double basePrice = baseFare + (distanceKm * perKm);

    // Add extra passenger charges if applicable
    if (passengerCount > maxPassengers) {
      int extraPassengers = passengerCount - maxPassengers;
      basePrice += extraPassengers * extraPassengerRate * distanceKm;
    } else if (passengerCount > 1 && vehicleType != 'মটর বাইক') {
      // Small additional charge for multiple passengers even within limit
      basePrice += (passengerCount - 1) * extraPassengerRate * 0.5;
    }

    return basePrice;
  }

  // Get maximum passenger capacity for a vehicle type
  static int getMaxPassengerCapacity(String vehicleType) {
    Map<String, int> capacities = {
      'রিকশা': 2,
      'সিএনজি': 3,
      'ভ্যান': 8,
      'মটর বাইক': 1,
      'অটো': 4,
      'পিকাপ ভ্যান': 10,
      'কার রেন্টাল': 4,
    };

    return capacities[vehicleType] ?? 3;
  }

  // Check if vehicle type requires passenger count selection
  static bool requiresPassengerCount(String vehicleType) {
    List<String> vehiclesNeedingPassengerCount = [
      'ভ্যান',
      'রিকশা',
      'সিএনজি',
      'অটো',
    ];

    return vehiclesNeedingPassengerCount.contains(vehicleType);
  }

  // Get route using OpenRouteService (Free alternative to Google Directions)
  static Future<Map<String, dynamic>?> getRoute(LatLng start, LatLng end,
      {String profile = 'driving-car'}) async {
    try {
      final url = Uri.parse('$openRouteServiceBaseUrl/v2/directions/$profile'
          '?api_key=$openRouteServiceApiKey'
          '&start=${start.longitude},${start.latitude}'
          '&end=${end.longitude},${end.latitude}');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final route = data['features'][0];
        final properties = route['properties'];
        final geometry = route['geometry']['coordinates'];

        // Convert coordinates to LatLng list
        List<LatLng> routePoints = geometry.map<LatLng>((coord) {
          return LatLng(
              coord[1], coord[0]); // Note: OpenRouteService returns [lng, lat]
        }).toList();

        return {
          'distance':
              properties['segments'][0]['distance'] / 1000, // Convert to km
          'duration':
              properties['segments'][0]['duration'] / 60, // Convert to minutes
          'routePoints': routePoints,
        };
      }
    } catch (e) {
      print('Error getting route: $e');
    }
    return null;
  }

  // Enhanced route calculation with fallback for rural areas
  static Future<Map<String, dynamic>?> getRouteWithFallback(
    LatLng start,
    LatLng end, {
    String vehicleType = 'সিএনজি',
  }) async {
    // Convert vehicle type to routing profile
    String profile = _getRoutingProfile(vehicleType);

    // Try primary route calculation
    var routeData = await getRoute(start, end, profile: profile);

    if (routeData != null) {
      return routeData;
    }

    // Fallback 1: Try with different profile (driving-car as default)
    if (profile != 'driving-car') {
      routeData = await getRoute(start, end, profile: 'driving-car');
      if (routeData != null) {
        return routeData;
      }
    }

    // Fallback 2: Calculate straight-line distance and estimated time
    double distance = calculateDistance(start, end);
    double estimatedDuration =
        _estimateDurationForVehicle(distance, vehicleType);

    return {
      'distance': distance,
      'duration': estimatedDuration,
      'routePoints': [start, end], // Simple straight line
      'isFallback': true, // Flag to indicate this is a fallback calculation
    };
  }

  // Convert vehicle type to OpenRouteService profile
  static String _getRoutingProfile(String vehicleType) {
    switch (vehicleType) {
      case 'রিকশা':
      case 'ভ্যান':
        return 'cycling-regular';
      case 'মটর বাইক':
        return 'driving-car'; // Motorcycles can use car routes
      case 'সিএনজি':
      case 'অটো':
      case 'কার রেন্টাল':
      case 'পিকাপ ভ্যান':
        return 'driving-car';
      default:
        return 'driving-car';
    }
  }

  // Estimate duration based on vehicle type and distance (for fallback)
  static double _estimateDurationForVehicle(
      double distanceKm, String vehicleType) {
    // Average speeds in km/h for different vehicles in rural Bangladesh
    Map<String, double> averageSpeeds = {
      'রিকশা': 12.0,
      'ভ্যান': 15.0,
      'সিএনজি': 35.0,
      'মটর বাইক': 40.0,
      'অটো': 30.0,
      'পিকাপ ভ্যান': 25.0,
      'কার রেন্টাল': 45.0,
    };

    double speed = averageSpeeds[vehicleType] ?? 30.0;
    return (distanceKm / speed) * 60; // Convert to minutes
  }

  // Geocoding using Nominatim (Free alternative to Google Geocoding)
  static Future<LatLng?> geocodeAddress(String address) async {
    try {
      final url =
          Uri.parse('$nominatimBaseUrl/search?format=json&q=$address&limit=1');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data.isNotEmpty) {
          final result = data[0];
          return LatLng(
            double.parse(result['lat']),
            double.parse(result['lon']),
          );
        }
      }
    } catch (e) {
      print('Error geocoding address: $e');
    }
    return null;
  }

  // Reverse geocoding using Nominatim
  static Future<String?> reverseGeocode(LatLng location) async {
    try {
      final url = Uri.parse('$nominatimBaseUrl/reverse?format=json'
          '&lat=${location.latitude}&lon=${location.longitude}');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['display_name'];
      }
    } catch (e) {
      print('Error reverse geocoding: $e');
    }
    return null;
  }

  // Get current location
  static Future<LatLng?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return null;
      }

      Position position = await Geolocator.getCurrentPosition();
      return LatLng(position.latitude, position.longitude);
    } catch (e) {
      print('Error getting current location: $e');
      return null;
    }
  }

  // Launch Google Maps for navigation - NO API KEY REQUIRED!
  static Future<void> launchGoogleMapsNavigation(
    LatLng destination, {
    LatLng? origin,
    String? destinationName,
    String? originName,
    String travelMode = 'driving', // driving, walking, bicycling, transit
  }) async {
    String googleMapsUrl;

    if (origin != null) {
      // Navigation from specific origin to destination
      googleMapsUrl = 'https://www.google.com/maps/dir/'
          '${origin.latitude},${origin.longitude}/'
          '${destination.latitude},${destination.longitude}'
          '/@${destination.latitude},${destination.longitude},15z'
          '/data=!3m1!4b1!4m2!4m1!3e0'; // 3e0=driving, 3e2=walking, 3e1=bicycling, 3e3=transit
    } else {
      // Navigation from current location to destination
      googleMapsUrl = 'https://www.google.com/maps/dir/?api=1'
          '&destination=${destination.latitude},${destination.longitude}'
          '&travelmode=$travelMode';
    }

    // Add destination name if provided
    if (destinationName != null) {
      googleMapsUrl +=
          '&destination_place_id=${Uri.encodeComponent(destinationName)}';
    }

    // Add origin name if provided
    if (originName != null && origin != null) {
      googleMapsUrl += '&origin_place_id=${Uri.encodeComponent(originName)}';
    }

    final Uri url = Uri.parse(googleMapsUrl);

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        // Fallback: Try to launch with different URL scheme
        await _launchGoogleMapsAlternative(destination, origin: origin);
      }
    } catch (e) {
      print('Error launching Google Maps: $e');
      // Fallback: Try to launch with different URL scheme
      await _launchGoogleMapsAlternative(destination, origin: origin);
    }
  }

  // Alternative Google Maps URL schemes for better compatibility
  static Future<void> _launchGoogleMapsAlternative(
    LatLng destination, {
    LatLng? origin,
  }) async {
    List<String> alternativeUrls = [];

    if (origin != null) {
      // Try different URL formats
      alternativeUrls.addAll([
        // Google Maps app deep link
        'google.navigation:q=${destination.latitude},${destination.longitude}',
        // Web fallback with directions
        'https://maps.google.com/?saddr=${origin.latitude},${origin.longitude}&daddr=${destination.latitude},${destination.longitude}&directionsmode=driving',
        // Simple search
        'https://maps.google.com/?q=${destination.latitude},${destination.longitude}',
      ]);
    } else {
      alternativeUrls.addAll([
        // Google Maps app deep link
        'google.navigation:q=${destination.latitude},${destination.longitude}',
        // Web fallback
        'https://maps.google.com/?q=${destination.latitude},${destination.longitude}',
      ]);
    }

    for (String urlString in alternativeUrls) {
      try {
        final Uri url = Uri.parse(urlString);
        if (await canLaunchUrl(url)) {
          await launchUrl(url, mode: LaunchMode.externalApplication);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    throw 'Could not launch Google Maps with any URL scheme';
  }

  // Launch Google Maps with specific travel mode
  static Future<void> launchGoogleMapsWithMode(
    LatLng destination, {
    LatLng? origin,
    String? destinationName,
    required String vehicleType, // Will be converted to appropriate travel mode
  }) async {
    String travelMode;

    // Convert vehicle type to Google Maps travel mode
    switch (vehicleType.toLowerCase()) {
      case 'রিকশা':
      case 'ভ্যান':
        travelMode = 'bicycling';
        break;
      case 'মটর বাইক':
        travelMode = 'driving';
        break;
      case 'সিএনজি':
      case 'অটো':
      case 'কার রেন্টাল':
      case 'পিকাপ ভ্যান':
        travelMode = 'driving';
        break;
      default:
        travelMode = 'driving';
    }

    await launchGoogleMapsNavigation(
      destination,
      origin: origin,
      destinationName: destinationName,
      travelMode: travelMode,
    );
  }

  // Launch Google Maps for showing location
  static Future<void> launchGoogleMapsLocation(
    LatLng location, {
    String? locationName,
  }) async {
    String googleMapsUrl = 'https://www.google.com/maps/search/?api=1'
        '&query=${location.latitude},${location.longitude}';

    if (locationName != null) {
      googleMapsUrl += '&query_place_id=$locationName';
    }

    final Uri url = Uri.parse(googleMapsUrl);

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      throw 'Could not launch Google Maps';
    }
  }

  // Calculate estimated time of arrival
  static DateTime calculateETA(double durationMinutes) {
    return DateTime.now().add(Duration(minutes: durationMinutes.round()));
  }

  // Format distance for display
  static String formatDistance(double distanceKm) {
    if (distanceKm < 1) {
      return '${(distanceKm * 1000).round()} মিটার';
    } else {
      return '${distanceKm.toStringAsFixed(1)} কিলোমিটার';
    }
  }

  // Format duration for display
  static String formatDuration(double durationMinutes) {
    if (durationMinutes < 60) {
      return '${durationMinutes.round()} মিনিট';
    } else {
      final hours = (durationMinutes / 60).floor();
      final minutes = (durationMinutes % 60).round();
      return '$hours ঘন্টা $minutes মিনিট';
    }
  }

  // Format price for display
  static String formatPrice(double price) {
    return '৳ ${price.round()}';
  }

  // Help improve OpenStreetMap by reporting missing routes
  static Future<void> reportMissingRoute(
    LatLng start,
    LatLng end, {
    String? description,
    String? vehicleType,
  }) async {
    // Create a note for OpenStreetMap community
    String noteText = 'রুট অনুপস্থিত / Missing Route:\n';
    noteText += 'শুরু / Start: ${start.latitude}, ${start.longitude}\n';
    noteText += 'শেষ / End: ${end.latitude}, ${end.longitude}\n';

    if (vehicleType != null) {
      noteText += 'যানবাহনের ধরন / Vehicle: $vehicleType\n';
    }

    if (description != null) {
      noteText += 'বিবরণ / Description: $description\n';
    }

    noteText +=
        'গ্রামীণ রাইড অ্যাপ থেকে রিপোর্ট / Reported from Grameen Ride App';

    // Create OSM note URL (users can click to add the note)
    final center = LatLng(
      (start.latitude + end.latitude) / 2,
      (start.longitude + end.longitude) / 2,
    );

    String osmNoteUrl = 'https://www.openstreetmap.org/note/new'
        '?lat=${center.latitude}&lon=${center.longitude}'
        '&text=${Uri.encodeComponent(noteText)}';

    final Uri url = Uri.parse(osmNoteUrl);

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      print('Error opening OSM note URL: $e');
    }
  }

  // Check if route quality is good (not a fallback)
  static bool isRouteReliable(Map<String, dynamic>? routeData) {
    if (routeData == null) return false;
    return routeData['isFallback'] != true;
  }

  // Get route quality indicator for UI
  static String getRouteQualityIndicator(Map<String, dynamic>? routeData) {
    if (routeData == null) return 'রুট পাওয়া যায়নি';

    if (routeData['isFallback'] == true) {
      return 'আনুমানিক রুট'; // Estimated route
    } else {
      return 'নিশ্চিত রুট'; // Confirmed route
    }
  }

  // Enhanced route calculation specifically for rural areas
  static Future<Map<String, dynamic>?> getRuralRoute(
    LatLng start,
    LatLng end, {
    String vehicleType = 'সিএনজি',
    List<LatLng>? knownWaypoints, // Local knowledge waypoints
  }) async {
    // Step 1: Try standard routing first
    var routeData =
        await getRouteWithFallback(start, end, vehicleType: vehicleType);

    if (routeData != null && routeData['isFallback'] != true) {
      return routeData;
    }

    // Step 2: Use local knowledge routing if waypoints provided
    if (knownWaypoints != null && knownWaypoints.isNotEmpty) {
      return _calculateRouteViaWaypoints(
          start, end, knownWaypoints, vehicleType);
    }

    // Step 3: Rural-specific fallback with terrain consideration
    return _calculateRuralFallbackRoute(start, end, vehicleType);
  }

  // Calculate route using known waypoints (local knowledge)
  static Map<String, dynamic> _calculateRouteViaWaypoints(
      LatLng start, LatLng end, List<LatLng> waypoints, String vehicleType) {
    List<LatLng> fullRoute = [start, ...waypoints, end];
    double totalDistance = 0;
    double totalDuration = 0;

    // Calculate segments
    for (int i = 0; i < fullRoute.length - 1; i++) {
      double segmentDistance =
          calculateDistance(fullRoute[i], fullRoute[i + 1]);
      totalDistance += segmentDistance;
      totalDuration +=
          _estimateDurationForVehicle(segmentDistance, vehicleType);
    }

    return {
      'distance': totalDistance,
      'duration': totalDuration,
      'routePoints': fullRoute,
      'isLocalKnowledge': true,
      'confidence': 'medium', // Based on local knowledge
    };
  }

  // Rural fallback with terrain and road type consideration
  static Map<String, dynamic> _calculateRuralFallbackRoute(
      LatLng start, LatLng end, String vehicleType) {
    double straightDistance = calculateDistance(start, end);

    // Rural adjustment factors
    double terrainFactor = _getTerrainFactor(vehicleType);
    double ruralRoadFactor = _getRuralRoadFactor(vehicleType);

    // Adjusted distance (accounts for winding rural roads)
    double adjustedDistance =
        straightDistance * terrainFactor * ruralRoadFactor;

    // Adjusted duration (accounts for road conditions)
    double baseDuration =
        _estimateDurationForVehicle(adjustedDistance, vehicleType);
    double adjustedDuration = baseDuration * _getRuralSpeedFactor(vehicleType);

    // Create a more realistic route path for rural areas
    List<LatLng> estimatedRoute = _generateRuralRoutePath(start, end);

    return {
      'distance': adjustedDistance,
      'duration': adjustedDuration,
      'routePoints': estimatedRoute,
      'isRuralEstimate': true,
      'confidence': 'low',
      'note': 'গ্রামীণ এলাকার আনুমানিক রুট - প্রকৃত পথ ভিন্ন হতে পারে',
    };
  }

  // Terrain difficulty factor for different vehicles
  static double _getTerrainFactor(String vehicleType) {
    switch (vehicleType) {
      case 'রিকশা':
        return 1.4; // Rickshaws need easier paths
      case 'ভ্যান':
        return 1.3;
      case 'সিএনজি':
        return 1.2;
      case 'মটর বাইক':
        return 1.1; // Motorcycles can take shortcuts
      case 'অটো':
        return 1.2;
      case 'পিকাপ ভ্যান':
        return 1.3;
      case 'কার রেন্টাল':
        return 1.3;
      default:
        return 1.2;
    }
  }

  // Rural road condition factor
  static double _getRuralRoadFactor(String vehicleType) {
    switch (vehicleType) {
      case 'রিকশা':
      case 'ভ্যান':
        return 1.5; // Need better roads
      case 'মটর বাইক':
        return 1.2; // Can handle rough roads
      case 'সিএনজি':
      case 'অটো':
        return 1.3;
      case 'পিকাপ ভ্যান':
      case 'কার রেন্টাল':
        return 1.4; // Need decent roads
      default:
        return 1.3;
    }
  }

  // Speed reduction factor for rural conditions
  static double _getRuralSpeedFactor(String vehicleType) {
    switch (vehicleType) {
      case 'রিকশা':
        return 1.3; // Slower on rural roads
      case 'ভ্যান':
        return 1.4;
      case 'সিএনজি':
        return 1.2;
      case 'মটর বাইক':
        return 1.1; // Less affected
      case 'অটো':
        return 1.2;
      case 'পিকাপ ভ্যান':
        return 1.3;
      case 'কার রেন্টাল':
        return 1.2;
      default:
        return 1.2;
    }
  }

  // Generate a more realistic rural route path
  static List<LatLng> _generateRuralRoutePath(LatLng start, LatLng end) {
    List<LatLng> path = [start];

    // Add intermediate points to simulate rural road curves
    double latDiff = end.latitude - start.latitude;
    double lngDiff = end.longitude - start.longitude;

    final random = Random();

    // Add 2-3 intermediate waypoints with slight deviations
    for (int i = 1; i < 4; i++) {
      double ratio = i / 4.0;

      // Add some randomness to simulate rural road curves
      double latOffset = (random.nextDouble() - 0.5) * 0.002;
      double lngOffset = (random.nextDouble() - 0.5) * 0.002;

      LatLng waypoint = LatLng(
        start.latitude + (latDiff * ratio) + latOffset,
        start.longitude + (lngDiff * ratio) + lngOffset,
      );

      path.add(waypoint);
    }

    path.add(end);
    return path;
  }
}
