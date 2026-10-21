import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'rider_home_screen.dart';
import '../services/realtime_service.dart';

class RiderMainScreen extends StatefulWidget {
  const RiderMainScreen({super.key});

  @override
  State<RiderMainScreen> createState() => _RiderMainScreenState();
}

class _RiderMainScreenState extends State<RiderMainScreen> {
  int _selectedIndex = 0;
  StreamSubscription<Position>? _locationSubscription;
  String? _activeTripId;
  String _driverId = 'driver-demo';

  final List<Widget> _pages = const [
    RiderHomeScreen(),
    Center(child: Text('ট্রিপ')),
    Center(child: Text('নোটিফিকেশন')),
    Center(child: Text('সেটিংস')),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  void initState() {
    super.initState();
    _setupRealtime();
  }

  Future<void> _setupRealtime() async {
    final prefs = await SharedPreferences.getInstance();
    final userProfileId = prefs.getString('phoneNumber') ?? 'driver-demo';
    _driverId = userProfileId;
    _activeTripId = prefs.getString('activeTripId');

    RealtimeService.instance.connect(userProfileId: userProfileId, role: 'driver');

    RealtimeService.instance.on('trip.new_request', (data) {
      if (!mounted) return;
      final pickupAddress = data is Map ? data['pickupAddress'] : null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('নতুন রাইড রিকোয়েস্ট: ${pickupAddress ?? 'পিকআপ লোকেশন'}'),
        ),
      );
    });

    RealtimeService.instance.on('trip.status.updated', (data) async {
      if (data is! Map) return;
      final tripId = data['tripId']?.toString();
      final status = data['status']?.toString();
      if (tripId == null || status == null) return;

      if (['accepted', 'driver_arriving', 'in_progress'].contains(status)) {
        await _setActiveTrip(tripId);
      } else if (['completed', 'cancelled'].contains(status) && _activeTripId == tripId) {
        await _clearActiveTrip();
      }
    });

    if (_activeTripId != null) {
      RealtimeService.instance.joinTrip(_activeTripId!);
      _startLiveLocationPings();
    }
  }

  Future<void> _setActiveTrip(String tripId) async {
    _activeTripId = tripId;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('activeTripId', tripId);
    RealtimeService.instance.joinTrip(tripId);
    _startLiveLocationPings();
  }

  Future<void> _clearActiveTrip() async {
    _activeTripId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('activeTripId');
  }

  Future<void> _startLiveLocationPings() async {
    if (_locationSubscription != null) return;

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }

    _locationSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 10,
      ),
    ).listen((position) {
      final tripId = _activeTripId;
      if (tripId == null) return;

      RealtimeService.instance.emitDriverLocationPing(
        tripId: tripId,
        driverId: _driverId,
        latitude: position.latitude,
        longitude: position.longitude,
      );
    });
  }

  @override
  void dispose() {
    RealtimeService.instance.off('trip.new_request');
    RealtimeService.instance.off('trip.status.updated');
    _locationSubscription?.cancel();
    RealtimeService.instance.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'হোম',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.directions_bike),
            label: 'ট্রিপ',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications),
            label: 'নোটিফিকেশন',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'সেটিংস',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Colors.grey,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        onTap: _onItemTapped,
      ),
    );
  }
}
