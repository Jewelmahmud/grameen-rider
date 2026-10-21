import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'home_page.dart';
import 'trip_page.dart';
import 'notifications_screen.dart';
import 'settings_screen.dart';
import '../services/realtime_service.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

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

  Future<void> _setupRealtime() async {
    final prefs = await SharedPreferences.getInstance();
    final userProfileId = prefs.getString('phoneNumber') ?? 'rider-demo';

    RealtimeService.instance.connect(userProfileId: userProfileId, role: 'rider');

    RealtimeService.instance.on('trip.status.updated', (data) {
      if (!mounted) return;
      final status = data is Map ? data['status'] : null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('ট্রিপ আপডেট: ${status ?? 'স্ট্যাটাস পরিবর্তন হয়েছে'}')),
      );
    });

    RealtimeService.instance.on('driver.location.updated', (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('ড্রাইভারের লাইভ লোকেশন আপডেট হয়েছে'),
          duration: Duration(seconds: 2),
        ),
      );
    });
  }

  @override
  void dispose() {
    RealtimeService.instance.off('trip.status.updated');
    RealtimeService.instance.off('driver.location.updated');
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
