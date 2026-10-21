import 'package:flutter/material.dart';
import '../models/ride_type.dart';
import '../models/rental_type.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:latlong2/latlong.dart';
import '../services/price_calculator.dart';
import 'location_picker_screen.dart';

class RentalDetailsScreen extends StatefulWidget {
  final RideType vehicleType;
  final RentalType rentalType;

  const RentalDetailsScreen({
    super.key,
    required this.vehicleType,
    required this.rentalType,
  });

  @override
  State<RentalDetailsScreen> createState() => _RentalDetailsScreenState();
}

class _RentalDetailsScreenState extends State<RentalDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  int _selectedHours = 1;
  int _selectedDays = 1;
  int _passengerCount = 1;
  bool _isLoadingLocation = false;
  bool _isCalculatingPrice = false;
  double? _calculatedPrice;
  double? _calculatedDistance;
  LatLng? _pickupLocation;
  LatLng? _dropoffLocation;

  @override
  void initState() {
    super.initState();
    _checkLocationPermission();
    _selectedDate = DateTime.now();
    _selectedTime = TimeOfDay.now();

    // Listen to text changes for price calculation
    if (widget.rentalType == RentalType.single) {
      _pickupController.addListener(_calculatePriceDebounced);
      _dropoffController.addListener(_calculatePriceDebounced);
    }
  }

  Future<void> _checkLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _pickupLocation = LatLng(position.latitude, position.longitude);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('লোকেশন পাওয়া যায়নি। আবার চেষ্টা করুন'),
        ),
      );
    } finally {
      setState(() {
        _isLoadingLocation = false;
      });
    }
  }

  String get _rentalTypeTitle {
    switch (widget.rentalType) {
      case RentalType.single:
        return 'একক ভাড়া';
      case RentalType.hourly:
        return 'ঘন্টা ভিত্তিক ভাড়া';
      case RentalType.daily:
        return 'দৈনিক ভাড়া';
      case RentalType.custom:
        return 'পছন্দমতো ভাড়া';
    }
  }

  String get _vehicleTypeName {
    switch (widget.vehicleType) {
      case RideType.van:
        return 'ভ্যান';
      case RideType.rickshaw:
        return 'রিকশা';
      case RideType.cng:
        return 'সিএনজি';
      case RideType.motorcycle:
        return 'মটর বাইক';
      case RideType.auto:
        return 'অটো';
      case RideType.pickupVan:
        return 'পিকাপ ভ্যান';
      case RideType.car:
        return 'গাড়ি';
      case RideType.carRental:
        return 'কার রেন্টাল';
      case RideType.boatRental:
        return 'নৌকা রেন্টাল';
    }
  }

  @override
  void dispose() {
    _pickupController.removeListener(_calculatePriceDebounced);
    _dropoffController.removeListener(_calculatePriceDebounced);
    _pickupController.dispose();
    _dropoffController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _selectTime() async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  Future<void> _calculatePriceDebounced() async {
    if (widget.rentalType != RentalType.single) return;
    if (_pickupController.text.isEmpty || _dropoffController.text.isEmpty)
      return;

    setState(() {
      _isCalculatingPrice = true;
      _calculatedPrice = null;
      _calculatedDistance = null;
    });

    try {
      final distance = await PriceCalculator.calculateDistance(
        _pickupController.text,
        _dropoffController.text,
      );

      if (distance > 0) {
        final price = PriceCalculator.calculateSingleRidePrice(
          widget.vehicleType,
          distance,
          passengerCount: _passengerCount,
        );

        setState(() {
          _calculatedDistance = distance;
          _calculatedPrice = price;
        });
      }
    } catch (e) {
      // Handle error
    } finally {
      setState(() {
        _isCalculatingPrice = false;
      });
    }
  }

  Future<void> _calculatePrice() async {
    setState(() {
      _isCalculatingPrice = true;
      _calculatedPrice = null;
    });

    try {
      switch (widget.rentalType) {
        case RentalType.single:
          final distance = await PriceCalculator.calculateDistance(
            _pickupController.text,
            _dropoffController.text,
          );
          _calculatedDistance = distance;
          _calculatedPrice = PriceCalculator.calculateSingleRidePrice(
            widget.vehicleType,
            distance,
            passengerCount: _passengerCount,
          );
          break;
        case RentalType.hourly:
          _calculatedPrice = PriceCalculator.calculateHourlyPrice(
            widget.vehicleType,
            _selectedHours,
            passengerCount: _passengerCount,
          );
          break;
        case RentalType.daily:
          _calculatedPrice = PriceCalculator.calculateDailyPrice(
            widget.vehicleType,
            _selectedDays,
            passengerCount: _passengerCount,
          );
          break;
        case RentalType.custom:
          // Custom price will be determined by the service provider
          break;
      }
    } finally {
      setState(() {
        _isCalculatingPrice = false;
      });
    }
  }

  Future<void> _showPriceConfirmation() async {
    if (_calculatedPrice == null && widget.rentalType != RentalType.custom) {
      await _calculatePrice();
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'ভাড়ার পরিমাণ',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            // Show passenger count for relevant vehicles
            if (PriceCalculator.requiresPassengerCount(widget.vehicleType)) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color:
                        Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.people,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'যাত্রীর সংখ্যা: $_passengerCount জন',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (_calculatedDistance != null) ...[
              Text(
                'দূরত্ব: ${_calculatedDistance!.toStringAsFixed(1)} কিলোমিটার',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 10),
            ],
            if (widget.rentalType != RentalType.custom)
              Text(
                '৳ ${_calculatedPrice!.toStringAsFixed(0)}',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
              )
            else
              const Text(
                'সার্ভিস প্রোভাইডার আপনার সাথে যোগাযোগ করে ভাড়া নির্ধারণ করবে',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  // TODO: Implement booking request
                  Navigator.pop(context); // Close bottom sheet
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('বুকিং রিকোয়েস্ট পাঠানো হয়েছে'),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                ),
                child: const Text(
                  'বুকিং কনফার্ম করুন',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('বাতিল করুন'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationField({
    required TextEditingController controller,
    required String label,
    required String errorText,
    bool isPickup = false,
  }) {
    return Stack(
      children: [
        TextFormField(
          controller: controller,
          readOnly: true,
          style: const TextStyle(fontSize: 16),
          decoration: InputDecoration(
            labelText: label,
            hintText: isPickup ? 'কোথায় থেকে উঠবেন' : 'কোথায় যাবেন',
            prefixIcon: const Icon(Icons.location_on),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isPickup)
                  IconButton(
                    icon: _isLoadingLocation
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.my_location),
                    onPressed: _isLoadingLocation
                        ? null
                        : () async {
                            await _getCurrentLocation();
                            if (_pickupLocation != null) {
                              final placemarks = await placemarkFromCoordinates(
                                _pickupLocation!.latitude,
                                _pickupLocation!.longitude,
                              );
                              if (placemarks.isNotEmpty) {
                                final place = placemarks[0];
                                String address = '';
                                if (place.name?.isNotEmpty ?? false)
                                  address += '${place.name}, ';
                                if (place.street?.isNotEmpty ?? false)
                                  address += '${place.street}, ';
                                if (place.subLocality?.isNotEmpty ?? false)
                                  address += '${place.subLocality}, ';
                                if (place.locality?.isNotEmpty ?? false)
                                  address += '${place.locality}, ';
                                if (place.subAdministrativeArea?.isNotEmpty ??
                                    false)
                                  address += '${place.subAdministrativeArea}, ';
                                if (place.administrativeArea?.isNotEmpty ??
                                    false) address += place.administrativeArea!;

                                setState(() {
                                  controller.text = address
                                      .trim()
                                      .replaceAll(RegExp(r', $'), '');
                                });
                              }
                            }
                          },
                    tooltip: 'বর্তমান লোকেশন',
                  ),
                IconButton(
                  icon: const Icon(Icons.map),
                  onPressed: () => _openLocationPicker(isPickup),
                  tooltip: 'ম্যাপ থেকে নির্বাচন করুন',
                ),
              ],
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            filled: true,
            fillColor: Colors.white,
          ),
          onTap: () => _openLocationPicker(isPickup),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return errorText;
            }
            return null;
          },
        ),
      ],
    );
  }

  Future<void> _openLocationPicker(bool isPickup) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LocationPickerScreen(
          isPickup: isPickup,
          initialLocation: isPickup ? _pickupLocation : _dropoffLocation,
          initialAddress:
              isPickup ? _pickupController.text : _dropoffController.text,
        ),
      ),
    );

    if (result != null && result is Map<String, dynamic>) {
      final location = result['location'] as LatLng;
      final address = result['address'] as String;

      setState(() {
        if (isPickup) {
          _pickupLocation = location;
          _pickupController.text = address;
        } else {
          _dropoffLocation = location;
          _dropoffController.text = address;
        }
      });

      if (widget.rentalType == RentalType.single) {
        _calculatePriceDebounced();
      }
    }
  }

  Widget _buildPassengerSelection() {
    if (!PriceCalculator.requiresPassengerCount(widget.vehicleType)) {
      return const SizedBox.shrink();
    }

    final maxPassengers =
        PriceCalculator.getMaxPassengerCapacity(widget.vehicleType);
    final vehicleName = PriceCalculator.getVehicleTypeName(widget.vehicleType);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(5),
        color: Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'যাত্রীর সংখ্যা',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '$vehicleName এ সর্বোচ্চ $maxPassengers জন যাত্রী বসতে পারে',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              IconButton(
                onPressed: () {
                  if (_passengerCount > 1) {
                    setState(() {
                      _passengerCount--;
                    });
                    // Recalculate price when passenger count changes
                    if (widget.rentalType == RentalType.single) {
                      _calculatePriceDebounced();
                    }
                  }
                },
                icon: const Icon(Icons.remove_circle_outline),
                color: Theme.of(context).colorScheme.primary,
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$_passengerCount জন',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                onPressed: () {
                  if (_passengerCount < maxPassengers + 2) {
                    // Allow 2 extra passengers
                    setState(() {
                      _passengerCount++;
                    });
                    // Recalculate price when passenger count changes
                    if (widget.rentalType == RentalType.single) {
                      _calculatePriceDebounced();
                    }
                  }
                },
                icon: const Icon(Icons.add_circle_outline),
                color: Theme.of(context).colorScheme.primary,
              ),
            ],
          ),
          if (_passengerCount > maxPassengers)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'অতিরিক্ত যাত্রীর জন্য অতিরিক্ত ভাড়া প্রযোজ্য',
                style: TextStyle(
                  color: Colors.orange[700],
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSingleRideFields() {
    return Column(
      children: [
        _buildPassengerSelection(),
        _buildLocationField(
          controller: _pickupController,
          label: 'কোথায় থেকে উঠবেন',
          errorText: 'কোথায় থেকে উঠবেন তা লিখুন',
          isPickup: true,
        ),
        const SizedBox(height: 16),
        _buildLocationField(
          controller: _dropoffController,
          label: 'কোথায় যাবেন',
          errorText: 'কোথায় যাবেন তা লিখুন',
        ),
      ],
    );
  }

  Widget _buildHourlyFields() {
    return Column(
      children: [
        _buildPassengerSelection(),
        _buildLocationField(
          controller: _pickupController,
          label: 'কোথায় থেকে উঠবেন',
          errorText: 'কোথায় থেকে উঠবেন তা লিখুন',
          isPickup: true,
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('ঘন্টার সংখ্যা'),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (_selectedHours > 1) {
                        setState(() {
                          _selectedHours--;
                        });
                      }
                    },
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text(
                    '$_selectedHours ঘন্টা',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    onPressed: () {
                      setState(() {
                        _selectedHours++;
                      });
                    },
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDailyFields() {
    return Column(
      children: [
        _buildPassengerSelection(),
        _buildLocationField(
          controller: _pickupController,
          label: 'কোথায় থেকে উঠবেন',
          errorText: 'কোথায় থেকে উঠবেন তা লিখুন',
          isPickup: true,
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('দিনের সংখ্যা'),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton(
                    onPressed: () {
                      if (_selectedDays > 1) {
                        setState(() {
                          _selectedDays--;
                        });
                      }
                    },
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text(
                    '$_selectedDays দিন',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    onPressed: () {
                      setState(() {
                        _selectedDays++;
                      });
                    },
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCustomFields() {
    return Column(
      children: [
        _buildPassengerSelection(),
        _buildLocationField(
          controller: _pickupController,
          label: 'কোথায় থেকে উঠবেন',
          errorText: 'কোথায় থেকে উঠবেন তা লিখুন',
          isPickup: true,
        ),
        const SizedBox(height: 16),
        TextFormField(
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'আপনার প্রয়োজন বর্ণনা করুন',
            alignLabelWithHint: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
            ),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'আপনার প্রয়োজন বর্ণনা করুন';
            }
            return null;
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              theme.colorScheme.primary.withOpacity(0.1),
              Colors.white,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // App Bar
              Container(
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
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back),
                        color: theme.colorScheme.primary,
                        onPressed: () => Navigator.pop(context),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _vehicleTypeName,
                            style: theme.textTheme.titleLarge?.copyWith(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            _rentalTypeTitle,
                            style: theme.textTheme.titleSmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              // Form
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Date and Time Selection
                        if (widget.rentalType != RentalType.custom) ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(5),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  offset: const Offset(0, 2),
                                  blurRadius: 5,
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                ListTile(
                                  leading: const Icon(Icons.calendar_today),
                                  title: const Text('তারিখ নির্বাচন করুন'),
                                  subtitle: Text(
                                    _selectedDate != null
                                        ? '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}'
                                        : 'তারিখ নির্বাচন করুন',
                                    style: TextStyle(
                                      color: theme.colorScheme.primary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  onTap: _selectDate,
                                ),
                                const Divider(),
                                ListTile(
                                  leading: const Icon(Icons.access_time),
                                  title: const Text('সময় নির্বাচন করুন'),
                                  subtitle: Text(
                                    _selectedTime != null
                                        ? '${_selectedTime!.format(context)}'
                                        : 'সময় নির্বাচন করুন',
                                    style: TextStyle(
                                      color: theme.colorScheme.primary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  onTap: _selectTime,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),
                        ],
                        // Rental Type Specific Fields
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(5),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                offset: const Offset(0, 2),
                                blurRadius: 5,
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (widget.rentalType == RentalType.single)
                                _buildSingleRideFields()
                              else if (widget.rentalType == RentalType.hourly)
                                _buildHourlyFields()
                              else if (widget.rentalType == RentalType.daily)
                                _buildDailyFields()
                              else
                                _buildCustomFields(),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        if (_isCalculatingPrice)
                          const Center(
                            child: CircularProgressIndicator(),
                          )
                        else if (_calculatedPrice != null &&
                            widget.rentalType == RentalType.single)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  'আনুমানিক ভাড়া',
                                  style: theme.textTheme.titleMedium,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '৳ ${_calculatedPrice!.toStringAsFixed(0)}',
                                  style:
                                      theme.textTheme.headlineMedium?.copyWith(
                                    color: theme.colorScheme.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (_calculatedDistance != null)
                                  Text(
                                    'দূরত্ব: ${_calculatedDistance!.toStringAsFixed(1)} কিলোমিটার',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                if (PriceCalculator.requiresPassengerCount(
                                    widget.vehicleType))
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(
                                      'যাত্রী: $_passengerCount জন',
                                      style:
                                          theme.textTheme.bodyMedium?.copyWith(
                                        color: theme.colorScheme.primary,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 24),
                        // Submit Button
                        SizedBox(
                          height: 50,
                          child: ElevatedButton(
                            onPressed: () {
                              if (_formKey.currentState!.validate()) {
                                _showPriceConfirmation();
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: theme.colorScheme.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(5),
                              ),
                            ),
                            child: const Text(
                              'বুকিং করুন',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
