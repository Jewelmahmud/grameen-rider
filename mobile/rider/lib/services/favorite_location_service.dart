import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/favorite_location.dart';

class FavoriteLocationService {
  static const String _storageKey = 'favorite_locations_v1';

  Future<List<FavoriteLocation>> getFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_storageKey) ?? <String>[];
    return raw
        .map((s) => FavoriteLocation.fromMap(json.decode(s)))
        .toList(growable: false);
  }

  Future<void> addFavorite(FavoriteLocation location) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_storageKey) ?? <String>[];

    // Prevent duplicates by address + coordinates
    final exists = list.any((s) {
      final m = json.decode(s) as Map<String, dynamic>;
      return m['address'] == location.address &&
          m['latitude'] == location.latitude &&
          m['longitude'] == location.longitude;
    });
    if (exists) return;

    list.add(json.encode(location.toMap()));
    await prefs.setStringList(_storageKey, list);
  }

  Future<void> removeFavorite(FavoriteLocation location) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_storageKey) ?? <String>[];
    list.removeWhere((s) {
      final m = json.decode(s) as Map<String, dynamic>;
      return m['address'] == location.address &&
          m['latitude'] == location.latitude &&
          m['longitude'] == location.longitude;
    });
    await prefs.setStringList(_storageKey, list);
  }
}
