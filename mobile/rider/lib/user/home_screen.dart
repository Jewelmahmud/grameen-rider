import 'package:flutter/material.dart';
import '../models/ride_type.dart';
import 'rental_type_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

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
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
      child: InkWell(
        onTap: () => _onRideTypeSelected(context, type),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary.withOpacity(0.7),
                Theme.of(context).colorScheme.primary,
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 40,
                color: Colors.white,
              ),
              const SizedBox(height: 8),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(
                    'গাড়ির ধরন নির্বাচন করুন',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
            ),
            // Grid
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                padding: const EdgeInsets.all(16),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                children: [
                  _buildRideTypeCard(
                    context,
                    type: RideType.van,
                    title: 'ভ্যান',
                    icon: Icons.airport_shuttle,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.rickshaw,
                    title: 'রিকশা',
                    icon: Icons.pedal_bike,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.cng,
                    title: 'সিএনজি',
                    icon: Icons.electric_rickshaw,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.motorcycle,
                    title: 'মটর বাইক',
                    icon: Icons.motorcycle,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.auto,
                    title: 'অটো',
                    icon: Icons.electric_car,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.pickupVan,
                    title: 'পিকাপ ভ্যান',
                    icon: Icons.local_shipping,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.carRental,
                    title: 'কার রেন্টাল',
                    icon: Icons.car_rental,
                  ),
                  _buildRideTypeCard(
                    context,
                    type: RideType.boatRental,
                    title: 'নৌকা রেন্টাল',
                    icon: Icons.directions_boat,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
