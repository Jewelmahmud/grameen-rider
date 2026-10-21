import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/favorite_location.dart';
import '../services/favorite_location_service.dart';
import 'location_picker_screen.dart';

class FavoriteLocationsScreen extends StatefulWidget {
  const FavoriteLocationsScreen({super.key});

  @override
  State<FavoriteLocationsScreen> createState() =>
      _FavoriteLocationsScreenState();
}

class _FavoriteLocationsScreenState extends State<FavoriteLocationsScreen> {
  final FavoriteLocationService _service = FavoriteLocationService();
  late Future<List<FavoriteLocation>> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.getFavorites();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _service.getFavorites();
    });
  }

  Future<void> _addFromMap() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const LocationPickerScreen(
          isPickup: true,
        ),
      ),
    );

    if (result != null && result is Map<String, dynamic>) {
      final location = result['location'] as LatLng?;
      final address = result['address'] as String?;
      if (location != null && address != null) {
        final fav = FavoriteLocation(
          name: 'প্রিয় লোকেশন',
          address: address,
          latitude: location.latitude,
          longitude: location.longitude,
        );
        await _service.addFavorite(fav);
        await _refresh();
      }
    }
  }

  Future<void> _remove(FavoriteLocation fav) async {
    await _service.removeFavorite(fav);
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('প্রিয় লোকেশনসমূহ'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<FavoriteLocation>>(
          future: _future,
          builder: (context, snapshot) {
            final items = snapshot.data ?? const <FavoriteLocation>[];

            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            if (items.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('কোনো প্রিয় লোকেশন নেই')),
                ],
              );
            }

            return ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final fav = items[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                    child: Icon(
                      Icons.place,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  title: Text(fav.name.isEmpty ? 'প্রিয় লোকেশন' : fav.name),
                  subtitle: Text(fav.address),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => _remove(fav),
                  ),
                );
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addFromMap,
        label: const Text('নতুন যোগ করুন'),
        icon: const Icon(Icons.add_location_alt),
      ),
    );
  }
}
