import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../services/location_service.dart';
import 'dart:async';

class LocationPickerScreen extends StatefulWidget {
  final bool isPickup;
  final LatLng? initialLocation;
  final String? initialAddress;

  const LocationPickerScreen({
    super.key,
    required this.isPickup,
    this.initialLocation,
    this.initialAddress,
  });

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  MapController? _mapController;
  LatLng? _selectedLocation;
  String _address = '';
  bool _isLoading = false;
  bool _isDragging = false;
  final TextEditingController _searchController = TextEditingController();
  List<LocationSearchResult> _searchResults = [];
  Timer? _debounce;
  bool _isSearching = false;
  bool _isSatelliteView = true; // Default to satellite view

  // Default to center of Bangladesh
  static const LatLng _defaultLocation = LatLng(23.8103, 90.4125);

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _selectedLocation = widget.initialLocation ?? _defaultLocation;
    _address = widget.initialAddress ?? '';
    if (widget.initialLocation == null) {
      _getCurrentLocation();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _searchLocation(String query) async {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () async {
      if (query.isEmpty) {
        setState(() {
          _searchResults = [];
          _isSearching = false;
        });
        return;
      }

      setState(() {
        _isSearching = true;
      });

      try {
        final results = await LocationService.searchLocation(query);
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      } catch (e) {
        setState(() {
          _searchResults = [];
          _isSearching = false;
        });
      }
    });
  }

  void _selectSearchResult(LocationSearchResult result) {
    setState(() {
      _selectedLocation = result.location;
      _address = result.displayName;
      _searchResults = [];
      _searchController.clear();
    });
    _mapController?.move(result.location, 15);
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final newLocation = LatLng(position.latitude, position.longitude);
      setState(() {
        _selectedLocation = newLocation;
      });

      _mapController?.move(newLocation, 15);
      _getAddressFromLatLng(newLocation);
    } catch (e) {
      // Handle error or use default location
      setState(() {
        _selectedLocation = _defaultLocation;
      });
    }
  }

  Future<void> _getAddressFromLatLng(LatLng position) async {
    if (_isDragging) return; // Don't fetch address while dragging

    setState(() {
      _isLoading = true;
    });

    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        String address = '';

        // Build a more detailed address
        if (place.name?.isNotEmpty ?? false) address += '${place.name}, ';
        if (place.street?.isNotEmpty ?? false) address += '${place.street}, ';
        if (place.subLocality?.isNotEmpty ?? false)
          address += '${place.subLocality}, ';
        if (place.locality?.isNotEmpty ?? false)
          address += '${place.locality}, ';
        if (place.subAdministrativeArea?.isNotEmpty ?? false)
          address += '${place.subAdministrativeArea}, ';
        if (place.administrativeArea?.isNotEmpty ?? false)
          address += place.administrativeArea!;

        final cleanAddress = address.trim().replaceAll(RegExp(r', $'), '');

        setState(() {
          _address = cleanAddress;
          _selectedLocation = position; // Ensure location is updated
        });
      }
    } catch (e) {
      // Handle error silently
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Get tile layer based on view mode
  TileLayer _getTileLayer() {
    if (_isSatelliteView) {
      // Esri World Imagery - Free satellite tiles
      return TileLayer(
        urlTemplate:
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        userAgentPackageName: 'com.grameenride.driver',
        maxZoom: 19,
        maxNativeZoom: 19,
        minZoom: 5,
        additionalOptions: const {
          'id': 'esri-satellite',
          'attribution': '© Esri, Maxar, Earthstar Geographics',
        },
        errorTileCallback: (tile, error, stackTrace) {
          print('Error loading satellite tile: $error');
        },
      );
    } else {
      // OpenStreetMap - Road view
      return TileLayer(
        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        userAgentPackageName: 'com.grameenride.driver',
        maxZoom: 19,
        maxNativeZoom: 19,
        minZoom: 5,
        subdomains: const ['a', 'b', 'c'],
        additionalOptions: const {
          'id': 'openstreetmap',
        },
        errorTileCallback: (tile, error, stackTrace) {
          print('Error loading map tile: $error');
        },
        fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.isPickup ? 'কোথায় থেকে উঠবেন' : 'কোথায় যাবেন',
        ),
        actions: [
          IconButton(
            icon: Icon(_isSatelliteView ? Icons.map : Icons.satellite),
            tooltip: _isSatelliteView ? 'রোড ভিউ' : 'স্যাটেলাইট ভিউ',
            onPressed: () {
              setState(() {
                _isSatelliteView = !_isSatelliteView;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: _getCurrentLocation,
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _selectedLocation ?? _defaultLocation,
              initialZoom: 15,
              onTap: (tapPosition, point) {
                setState(() {
                  _selectedLocation = point;
                });
                _getAddressFromLatLng(point);
              },
              onPositionChanged: (position, hasGesture) {
                if (hasGesture && position.center != null) {
                  setState(() {
                    _selectedLocation = position.center!;
                    _isDragging = true;
                  });
                }
              },
              onMapEvent: (MapEvent event) {
                if (event is MapEventMoveEnd && _isDragging) {
                  setState(() {
                    _isDragging = false;
                  });
                  if (_selectedLocation != null) {
                    _getAddressFromLatLng(_selectedLocation!);
                  }
                }
              },
            ),
            children: [
              _getTileLayer(),
              // Center indicator that stays fixed
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.location_on,
                      size: 50,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    // Small dot to indicate exact point
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // Search bar
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Column(
              children: [
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'লোকেশন খুঁজুন',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchResults = [];
                                });
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    onChanged: _searchLocation,
                  ),
                ),
                if (_isSearching)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (_searchResults.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      padding: EdgeInsets.zero,
                      itemCount: _searchResults.length,
                      itemBuilder: (context, index) {
                        final result = _searchResults[index];
                        return ListTile(
                          leading: const Icon(Icons.location_on),
                          title: Text(
                            result.displayName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () => _selectSearchResult(result),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
          // Bottom panel
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_isLoading)
                    const LinearProgressIndicator()
                  else if (_isDragging)
                    const Text('লোকেশন নির্বাচন করুন...')
                  else
                    Text(
                      _address,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isDragging || _isLoading
                          ? null
                          : () {
                              if (_selectedLocation != null) {
                                Navigator.pop(
                                  context,
                                  {
                                    'location': _selectedLocation,
                                    'address': _address,
                                  },
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Colors.white,
                      ),
                      child: Text(
                        _isDragging
                            ? 'লোকেশন নির্বাচন করুন...'
                            : 'এই লোকেশন নির্বাচন করুন',
                        style: const TextStyle(
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
        ],
      ),
    );
  }
}
