import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/map_service.dart';

class TripMapWidget extends StatefulWidget {
  final LatLng? pickupLocation;
  final LatLng? dropoffLocation;
  final List<LatLng>? routePoints;
  final bool showRoute;
  final VoidCallback? onNavigatePressed;
  final String? pickupAddress;
  final String? dropoffAddress;

  const TripMapWidget({
    super.key,
    this.pickupLocation,
    this.dropoffLocation,
    this.routePoints,
    this.showRoute = false,
    this.onNavigatePressed,
    this.pickupAddress,
    this.dropoffAddress,
  });

  @override
  State<TripMapWidget> createState() => _TripMapWidgetState();
}

class _TripMapWidgetState extends State<TripMapWidget> {
  final MapController _mapController = MapController();
  LatLng? _currentLocation;
  bool _isLoading = false;
  bool _isSatelliteView = true; // Default to satellite view

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoading = true;
    });

    final location = await MapService.getCurrentLocation();
    if (location != null) {
      setState(() {
        _currentLocation = location;
      });
    }

    setState(() {
      _isLoading = false;
    });
  }

  LatLng _getMapCenter() {
    if (widget.pickupLocation != null && widget.dropoffLocation != null) {
      // Center between pickup and dropoff
      final lat =
          (widget.pickupLocation!.latitude + widget.dropoffLocation!.latitude) /
              2;
      final lng = (widget.pickupLocation!.longitude +
              widget.dropoffLocation!.longitude) /
          2;
      return LatLng(lat, lng);
    } else if (widget.pickupLocation != null) {
      return widget.pickupLocation!;
    } else if (widget.dropoffLocation != null) {
      return widget.dropoffLocation!;
    } else if (_currentLocation != null) {
      return _currentLocation!;
    } else {
      // Default to Dhaka, Bangladesh
      return LatLng(23.8103, 90.4125);
    }
  }

  double _getMapZoom() {
    if (widget.pickupLocation != null && widget.dropoffLocation != null) {
      final distance = MapService.calculateDistance(
        widget.pickupLocation!,
        widget.dropoffLocation!,
      );
      if (distance < 1) return 15.0;
      if (distance < 5) return 13.0;
      if (distance < 10) return 12.0;
      if (distance < 20) return 11.0;
      return 10.0;
    }
    return 14.0;
  }

  List<Marker> _buildMarkers() {
    List<Marker> markers = [];

    // Current location marker
    if (_currentLocation != null) {
      markers.add(
        Marker(
          point: _currentLocation!,
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
            ),
            child: const Icon(
              Icons.my_location,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    // Pickup location marker
    if (widget.pickupLocation != null) {
      markers.add(
        Marker(
          point: widget.pickupLocation!,
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
            ),
            child: const Icon(
              Icons.location_on,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    // Dropoff location marker
    if (widget.dropoffLocation != null) {
      markers.add(
        Marker(
          point: widget.dropoffLocation!,
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
            ),
            child: const Icon(
              Icons.location_on,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
    }

    return markers;
  }

  List<Polyline> _buildPolylines() {
    List<Polyline> polylines = [];

    if (widget.showRoute &&
        widget.routePoints != null &&
        widget.routePoints!.isNotEmpty) {
      polylines.add(
        Polyline(
          points: widget.routePoints!,
          strokeWidth: 4.0,
          color: Theme.of(context).colorScheme.primary,
        ),
      );
    }

    return polylines;
  }

  // Get tile layer based on view mode
  TileLayer _getTileLayer() {
    if (_isSatelliteView) {
      // Esri World Imagery - Free satellite tiles
      return TileLayer(
        urlTemplate:
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        userAgentPackageName: 'com.grameenride.user',
        maxNativeZoom: 19,
        maxZoom: 19,
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
        userAgentPackageName: 'com.grameenride.user',
        maxNativeZoom: 19,
        maxZoom: 19,
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
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _getMapCenter(),
            initialZoom: _getMapZoom(),
            minZoom: 5.0,
            maxZoom: 18.0,
          ),
          children: [
            _getTileLayer(),
            PolylineLayer(polylines: _buildPolylines()),
            MarkerLayer(markers: _buildMarkers()),
          ],
        ),

        // Loading indicator
        if (_isLoading)
          const Center(
            child: CircularProgressIndicator(),
          ),

        // Trip info overlay
        if (widget.pickupLocation != null || widget.dropoffLocation != null)
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.pickupAddress != null) ...[
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.pickupAddress!,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (widget.dropoffAddress != null) ...[
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.dropoffAddress!,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),

        // Navigation button
        if (widget.onNavigatePressed != null && widget.dropoffLocation != null)
          Positioned(
            bottom: 16,
            right: 16,
            child: FloatingActionButton.extended(
              onPressed: widget.onNavigatePressed,
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              label: const Text('নেভিগেশন'),
              icon: const Icon(Icons.navigation),
            ),
          ),

        // Center map button
        Positioned(
          bottom: widget.onNavigatePressed != null ? 80 : 16,
          right: 16,
          child: FloatingActionButton(
            mini: true,
            onPressed: () {
              _mapController.move(_getMapCenter(), _getMapZoom());
            },
            backgroundColor: Colors.white,
            foregroundColor: Theme.of(context).colorScheme.primary,
            child: const Icon(Icons.center_focus_strong),
          ),
        ),

        // Current location button
        Positioned(
          bottom: widget.onNavigatePressed != null ? 130 : 66,
          right: 16,
          child: FloatingActionButton(
            mini: true,
            onPressed: () async {
              final location = await MapService.getCurrentLocation();
              if (location != null) {
                setState(() {
                  _currentLocation = location;
                });
                _mapController.move(location, 15.0);
              }
            },
            backgroundColor: Colors.white,
            foregroundColor: Theme.of(context).colorScheme.primary,
            child: const Icon(Icons.my_location),
          ),
        ),

        // Satellite/Road view toggle button
        Positioned(
          bottom: widget.onNavigatePressed != null ? 180 : 116,
          right: 16,
          child: FloatingActionButton(
            mini: true,
            onPressed: () {
              setState(() {
                _isSatelliteView = !_isSatelliteView;
              });
            },
            backgroundColor: Colors.white,
            foregroundColor: Theme.of(context).colorScheme.primary,
            child: Icon(_isSatelliteView ? Icons.map : Icons.satellite),
          ),
        ),
      ],
    );
  }
}
