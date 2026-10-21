// DEMO: Google Maps Navigation WITHOUT API Keys
// This shows exactly how the navigation works using direct HTTP links

import 'package:latlong2/latlong.dart';

class NavigationDemo {
  // Example 1: Navigation from Mirpur 10 to Uttara Sector 4
  static void demoNavigation1() {
    final pickup = LatLng(23.7956, 90.3537); // Mirpur 10
    final dropoff = LatLng(23.8759, 90.3795); // Uttara Sector 4

    // This is the EXACT URL that gets generated:
    String googleMapsUrl = 'https://www.google.com/maps/dir/'
        '${pickup.latitude},${pickup.longitude}/'
        '${dropoff.latitude},${dropoff.longitude}'
        '/@${dropoff.latitude},${dropoff.longitude},15z'
        '/data=!3m1!4b1!4m2!4m1!3e0'; // 3e0 = driving mode

    print('🚗 CNG Navigation URL:');
    print(googleMapsUrl);
    print('');
  }

  // Example 2: Rickshaw navigation (bicycling mode)
  static void demoNavigation2() {
    final pickup = LatLng(23.7936, 90.4066); // Banani
    final dropoff = LatLng(23.7925, 90.4077); // Gulshan 2

    // For rickshaw, we use bicycling mode (3e1)
    String googleMapsUrl = 'https://www.google.com/maps/dir/'
        '${pickup.latitude},${pickup.longitude}/'
        '${dropoff.latitude},${dropoff.longitude}'
        '/@${dropoff.latitude},${dropoff.longitude},15z'
        '/data=!3m1!4b1!4m2!4m1!3e1'; // 3e1 = bicycling mode

    print('🚲 Rickshaw Navigation URL:');
    print(googleMapsUrl);
    print('');
  }

  // Example 3: Navigation from current location
  static void demoNavigation3() {
    final destination = LatLng(23.8434, 90.3983); // Airport

    // This uses Google Maps API v1 (free for URL schemes)
    String googleMapsUrl = 'https://www.google.com/maps/dir/?api=1'
        '&destination=${destination.latitude},${destination.longitude}'
        '&travelmode=driving';

    print('📍 Navigation from Current Location:');
    print(googleMapsUrl);
    print('');
  }

  // Example 4: Alternative URL schemes for better compatibility
  static void demoAlternativeUrls() {
    final destination = LatLng(23.7272, 90.4203); // Motijheel

    List<String> alternativeUrls = [
      // Google Maps app deep link (opens directly in app)
      'google.navigation:q=${destination.latitude},${destination.longitude}',

      // Web fallback (works in any browser)
      'https://maps.google.com/?q=${destination.latitude},${destination.longitude}',

      // Classic Google Maps URL
      'https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}',
    ];

    print('🔗 Alternative URL Schemes:');
    for (int i = 0; i < alternativeUrls.length; i++) {
      print('${i + 1}. ${alternativeUrls[i]}');
    }
    print('');
  }

  // Run all demos
  static void runAllDemos() {
    print('=== GOOGLE MAPS NAVIGATION DEMO ===');
    print('✅ NO API KEYS REQUIRED!');
    print('✅ NO BILLING REQUIRED!');
    print('✅ WORKS ON ALL DEVICES!');
    print('');

    demoNavigation1();
    demoNavigation2();
    demoNavigation3();
    demoAlternativeUrls();

    print('🎯 How it works:');
    print('1. Your app generates these URLs');
    print('2. url_launcher opens the URL');
    print('3. Android/iOS automatically opens Google Maps');
    print('4. Google Maps starts navigation');
    print('5. User gets full Google Maps experience!');
    print('');
    print('💰 Cost: COMPLETELY FREE!');
  }
}

/*
TRAVEL MODE PARAMETERS:
- 3e0 = Driving (Cars, CNG, Auto, Pickup Van)
- 3e1 = Bicycling (Rickshaw, Van)
- 3e2 = Walking
- 3e3 = Transit (Public transport)

URL PARAMETERS EXPLAINED:
- /dir/ = Directions mode
- /@lat,lng,zoom = Map center and zoom
- data=!3m1!4b1!4m2!4m1!3e0 = Travel mode
- api=1 = Uses Google Maps URLs API (free)
- travelmode= = Travel mode for API v1

FALLBACK STRATEGIES:
1. Try primary URL
2. Try app deep link (google.navigation:)
3. Try web fallback
4. Show error message
*/
