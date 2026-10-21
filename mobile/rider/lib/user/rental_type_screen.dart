import 'package:flutter/material.dart';
import '../models/rental_type.dart';
import '../models/ride_type.dart';
import 'rental_details_screen.dart';

class RentalTypeScreen extends StatelessWidget {
  final RideType vehicleType;

  const RentalTypeScreen({
    super.key,
    required this.vehicleType,
  });

  void _onRentalTypeSelected(BuildContext context, RentalType rentalType) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RentalDetailsScreen(
          vehicleType: vehicleType,
          rentalType: rentalType,
        ),
      ),
    );
  }

  Widget _buildRentalTypeCard(
    BuildContext context, {
    required RentalType type,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
      child: InkWell(
        onTap: () => _onRentalTypeSelected(context, type),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withOpacity(0.7),
                color,
              ],
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 48,
                color: Colors.white,
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 14,
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
            // App Bar
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    offset: const Offset(0, 2),
                    blurRadius: 4,
                  ),
                ],
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'ভাড়ার ধরন নির্বাচন করুন',
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
                  if (vehicleType != RideType.boatRental)
                    _buildRentalTypeCard(
                      context,
                      type: RentalType.single,
                      title: 'একক ভাড়া',
                      subtitle: 'একটি স্থান থেকে অন্য স্থানে যাওয়ার জন্য',
                      color: Colors.blue,
                      icon: Icons.arrow_forward,
                    ),
                  _buildRentalTypeCard(
                    context,
                    type: RentalType.hourly,
                    title: 'ঘন্টা ভিত্তিক ভাড়া',
                    subtitle: 'প্রতি ঘন্টার হিসাবে ভাড়া',
                    color: Colors.green,
                    icon: Icons.access_time,
                  ),
                  _buildRentalTypeCard(
                    context,
                    type: RentalType.daily,
                    title: 'দৈনিক ভাড়া',
                    subtitle: 'সারাদিনের জন্য ভাড়া',
                    color: Colors.orange,
                    icon: Icons.calendar_today,
                  ),
                  _buildRentalTypeCard(
                    context,
                    type: RentalType.custom,
                    title: 'পছন্দমতো ভাড়া',
                    subtitle: 'আপনার প্রয়োজন অনুযায়ী ভাড়া',
                    color: Colors.purple,
                    icon: Icons.settings,
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
