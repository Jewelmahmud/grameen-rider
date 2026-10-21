import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../widgets/trip_map_widget.dart';
import '../services/map_service.dart';

class TripPage extends StatelessWidget {
  const TripPage({super.key});

  Widget _buildTripCard(
    BuildContext context, {
    required String status,
    required Color statusColor,
    required String price,
    required String pickupLocation,
    required String dropoffLocation,
    required String time,
    required String date,
    required String vehicleType,
    required LatLng pickupLatLng,
    required LatLng dropoffLatLng,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      elevation: 2,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.grey.withOpacity(0.1),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status and price
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: statusColor.withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          status == 'চলমান'
                              ? Icons.directions_car
                              : status == 'সম্পন্ন'
                                  ? Icons.check_circle
                                  : Icons.cancel,
                          size: 16,
                          color: statusColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          status,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        price,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      Text(
                        vehicleType,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Trip details
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pickup location
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 2,
                              ),
                            ),
                          ),
                          Container(
                            width: 2,
                            height: 30,
                            color: Colors.grey.withOpacity(0.3),
                          ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'পিকআপ লোকেশন',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              pickupLocation,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  // Dropoff location
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: 2,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'ড্রপ অফ লোকেশন',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              dropoffLocation,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Time and date
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          time,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.calendar_today,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          date,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _showTripMap(
                              context,
                              pickupLatLng: pickupLatLng,
                              dropoffLatLng: dropoffLatLng,
                              pickupAddress: pickupLocation,
                              dropoffAddress: dropoffLocation,
                            );
                          },
                          icon: const Icon(Icons.map),
                          label: const Text('ম্যাপ দেখুন'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (status == 'চলমান')
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              try {
                                // Show loading indicator
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('গুগল ম্যাপস খোলা হচ্ছে...'),
                                    duration: Duration(seconds: 2),
                                  ),
                                );

                                await MapService.launchGoogleMapsWithMode(
                                  dropoffLatLng,
                                  origin: pickupLatLng,
                                  destinationName: dropoffLocation,
                                  vehicleType: vehicleType,
                                );
                              } catch (e) {
                                // Show error message
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                        'গুগল ম্যাপস খুলতে সমস্যা হয়েছে: $e'),
                                    backgroundColor: Colors.red,
                                    duration: const Duration(seconds: 4),
                                    action: SnackBarAction(
                                      label: 'পুনরায় চেষ্টা',
                                      textColor: Colors.white,
                                      onPressed: () async {
                                        try {
                                          await MapService
                                              .launchGoogleMapsWithMode(
                                            dropoffLatLng,
                                            origin: pickupLatLng,
                                            destinationName: dropoffLocation,
                                            vehicleType: vehicleType,
                                          );
                                        } catch (e) {
                                          print('Retry failed: $e');
                                        }
                                      },
                                    ),
                                  ),
                                );
                              }
                            },
                            icon: const Icon(Icons.navigation),
                            label: const Text('নেভিগেশন'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  Theme.of(context).colorScheme.primary,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTripMap(
    BuildContext context, {
    required LatLng pickupLatLng,
    required LatLng dropoffLatLng,
    required String pickupAddress,
    required String dropoffAddress,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.3,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Text(
                      'ট্রিপ ম্যাপ',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              // Map
              Expanded(
                child: TripMapWidget(
                  pickupLocation: pickupLatLng,
                  dropoffLocation: dropoffLatLng,
                  pickupAddress: pickupAddress,
                  dropoffAddress: dropoffAddress,
                  showRoute: true,
                  onNavigatePressed: () async {
                    Navigator.pop(context);
                    try {
                      // Show loading indicator
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('গুগল ম্যাপস নেভিগেশন শুরু হচ্ছে...'),
                          duration: Duration(seconds: 2),
                        ),
                      );

                      await MapService.launchGoogleMapsWithMode(
                        dropoffLatLng,
                        origin: pickupLatLng,
                        destinationName: dropoffAddress,
                        vehicleType: 'সিএনজি', // Default vehicle type for demo
                      );
                    } catch (e) {
                      // Show error message
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('নেভিগেশন শুরু করতে সমস্যা হয়েছে: $e'),
                          backgroundColor: Colors.red,
                          duration: const Duration(seconds: 4),
                          action: SnackBarAction(
                            label: 'পুনরায় চেষ্টা',
                            textColor: Colors.white,
                            onPressed: () async {
                              try {
                                await MapService.launchGoogleMapsWithMode(
                                  dropoffLatLng,
                                  origin: pickupLatLng,
                                  destinationName: dropoffAddress,
                                  vehicleType: 'সিএনজি',
                                );
                              } catch (e) {
                                print('Navigation retry failed: $e');
                              }
                            },
                          ),
                        ),
                      );
                    }
                  },
                ),
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
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          'আমার ট্রিপসমূহ',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
        ),
        backgroundColor: Colors.white,
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.2),
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildTripCard(
            context,
            status: 'চলমান',
            statusColor: Colors.green,
            price: '৳ ৫০০',
            pickupLocation: 'মিরপুর ১০, ঢাকা',
            dropoffLocation: 'উত্তরা সেক্টর ৪, ঢাকা',
            time: '১০:৩০ AM',
            date: '২৫ মার্চ, ২০২৪',
            vehicleType: 'সিএনজি',
            pickupLatLng: LatLng(23.7956, 90.3537), // Mirpur 10
            dropoffLatLng: LatLng(23.8759, 90.3795), // Uttara Sector 4
          ),
          _buildTripCard(
            context,
            status: 'সম্পন্ন',
            statusColor: Colors.blue,
            price: '৳ ৩৫০',
            pickupLocation: 'বনানী, ঢাকা',
            dropoffLocation: 'গুলশান ২, ঢাকা',
            time: '০৯:১৫ AM',
            date: '২৪ মার্চ, ২০২৪',
            vehicleType: 'রিকশা',
            pickupLatLng: LatLng(23.7936, 90.4066), // Banani
            dropoffLatLng: LatLng(23.7925, 90.4077), // Gulshan 2
          ),
          _buildTripCard(
            context,
            status: 'বাতিল',
            statusColor: Colors.red,
            price: '৳ ৮০০',
            pickupLocation: 'শাহজালাল আন্তর্জাতিক বিমানবন্দর',
            dropoffLocation: 'মতিঝিল, ঢাকা',
            time: '০৮:০০ PM',
            date: '২৩ মার্চ, ২০২৪',
            vehicleType: 'কার রেন্টাল',
            pickupLatLng: LatLng(23.8434, 90.3983), // Airport
            dropoffLatLng: LatLng(23.7272, 90.4203), // Motijheel
          ),
        ],
      ),
    );
  }
}
