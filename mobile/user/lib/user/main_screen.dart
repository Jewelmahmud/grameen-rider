import 'dart:async';

import 'package:flutter/material.dart';
import 'package:grameen_core/grameen_core.dart';
import 'package:provider/provider.dart';
import 'home_page.dart';
import 'trip_page.dart';
import 'notifications_screen.dart';
import 'settings_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  late final RealtimeClient _realtime;
  final List<StreamSubscription<Object>> _subscriptions = [];

  final List<Widget> _pages = [
    const HomePage(),
    const TripPage(),
    const NotificationsScreen(),
    const SettingsScreen(),
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

  void _setupRealtime() {
    _realtime = context.read<GrameenCore>().realtime;
    final session = context.read<Session>();
    if (session.profile == null) return;

    // The socket logs in with the access token; the server knows who we are from it.
    _realtime.connect(tokenProvider: session.accessToken);

    _subscriptions.add(_realtime.tripStatus.listen((event) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('ট্রিপ আপডেট: ${event.status.wire}')),
      );
    }));

    _subscriptions.add(_realtime.driverLocation.listen((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('ড্রাইভারের লাইভ লোকেশন আপডেট হয়েছে'),
          duration: Duration(seconds: 2),
        ),
      );
    }));
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
    _realtime.disconnect();
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
            icon: Icon(Icons.directions_car),
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
