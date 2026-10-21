import 'package:flutter/material.dart';
import '../models/ride_type.dart';
import 'rental_type_screen.dart';
import 'profile_page.dart';
import 'favorite_locations_screen.dart';
import 'trip_page.dart';
import 'support_screen.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  void _onRideTypeSelected(BuildContext context, RideType rideType) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RentalTypeScreen(vehicleType: rideType),
      ),
    );
  }

  Widget _buildRideTypeCard(
    BuildContext context, {
    required RideType type,
    required String title,
    required IconData icon,
    required Color gradientStart,
    required Color gradientEnd,
  }) {
    return Card(
      elevation: 6,
      shadowColor: Colors.black.withOpacity(0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () => _onRideTypeSelected(context, type),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                gradientStart,
                gradientEnd,
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 32,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: Theme.of(context).colorScheme.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const Spacer(),
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: Colors.grey[400],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final itemHeight = (screenWidth - 64) / 2;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          'গ্রামীণ রাইডার (ড্রাইভার)',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
        ),
        backgroundColor: Colors.white,
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.2),
        surfaceTintColor: Colors.transparent,
        iconTheme: IconThemeData(
          color: Theme.of(context).colorScheme.primary,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            color: Theme.of(context).colorScheme.primary,
            onPressed: () {
              // TODO: Implement notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            color: Theme.of(context).colorScheme.primary,
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ProfilePage(),
                ),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 10),
          const SizedBox(height: 16),
          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 16,
              crossAxisSpacing: 16,
              mainAxisExtent: itemHeight,
            ),
            children: [
              _buildRideTypeCard(
                context,
                type: RideType.van,
                title: 'ভ্যান',
                icon: Icons.airport_shuttle,
                gradientStart: const Color(0xFF4CAF50),
                gradientEnd: const Color(0xFF45A049),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.rickshaw,
                title: 'রিকশা',
                icon: Icons.pedal_bike,
                gradientStart: const Color(0xFF2196F3),
                gradientEnd: const Color(0xFF1976D2),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.cng,
                title: 'সিএনজি',
                icon: Icons.electric_rickshaw,
                gradientStart: const Color(0xFFFF9800),
                gradientEnd: const Color(0xFFE68900),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.motorcycle,
                title: 'মটর বাইক',
                icon: Icons.motorcycle,
                gradientStart: const Color(0xFF9C27B0),
                gradientEnd: const Color(0xFF7B1FA2),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.auto,
                title: 'অটো',
                icon: Icons.electric_car,
                gradientStart: const Color(0xFF607D8B),
                gradientEnd: const Color(0xFF455A64),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.pickupVan,
                title: 'পিকাপ ভ্যান',
                icon: Icons.local_shipping,
                gradientStart: const Color(0xFF795548),
                gradientEnd: const Color(0xFF5D4037),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.carRental,
                title: 'কার রেন্টাল',
                icon: Icons.car_rental,
                gradientStart: const Color(0xFFE91E63),
                gradientEnd: const Color(0xFFC2185B),
              ),
              _buildRideTypeCard(
                context,
                type: RideType.boatRental,
                title: 'নৌকা রেন্টাল',
                icon: Icons.directions_boat,
                gradientStart: const Color(0xFF00BCD4),
                gradientEnd: const Color(0xFF0097A7),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Text(
            'দ্রুত অ্যাকশন',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          _buildQuickActionCard(
            context,
            title: 'প্রিয় লোকেশান',
            icon: Icons.star_border,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const FavoriteLocationsScreen(),
                ),
              );
            },
          ),
          _buildQuickActionCard(
            context,
            title: 'রাইড হিস্ট্রি',
            icon: Icons.history,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const TripPage(),
                ),
              );
            },
          ),
          _buildQuickActionCard(
            context,
            title: 'সাপোর্টের সাথে যোগাযোগ',
            icon: Icons.support_agent,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const SupportScreen(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
