import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class MobileMapWidget extends StatefulWidget {
  final LatLng? initialCenter;
  final double initialZoom;
  final List<Marker>? markers;
  final List<Polyline>? polylines;
  final VoidCallback? onTap;
  final Function(LatLng)? onPositionChanged;
  final MapController? mapController;

  const MobileMapWidget({
    super.key,
    this.initialCenter,
    this.initialZoom = 15.0,
    this.markers,
    this.polylines,
    this.onTap,
    this.onPositionChanged,
    this.mapController,
  });

  @override
  State<MobileMapWidget> createState() => _MobileMapWidgetState();
}

class _MobileMapWidgetState extends State<MobileMapWidget> {
  late MapController _mapController;
  bool _isLoading = true;
  String? _error;
  bool _isSatelliteView = true; // Default to satellite view

  @override
  void initState() {
    super.initState();
    _mapController = widget.mapController ?? MapController();

    // Add a small delay to ensure proper initialization
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  // Multiple tile server options for better reliability
  final List<String> _roadTileServers = [
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ];

  final List<String> _satelliteTileServers = [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ];

  int _currentServerIndex = 0;

  List<String> get _currentTileServers =>
      _isSatelliteView ? _satelliteTileServers : _roadTileServers;

  void _switchToNextServer() {
    if (_currentServerIndex < _currentTileServers.length - 1) {
      setState(() {
        _currentServerIndex++;
        _error = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          color: Colors.grey[200],
          child: FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter:
                  widget.initialCenter ?? const LatLng(23.8103, 90.4125),
              initialZoom: widget.initialZoom,
              minZoom: 5.0,
              maxZoom: 18.0,
              onTap: widget.onTap != null
                  ? (tapPosition, point) => widget.onTap!()
                  : null,
              onPositionChanged: widget.onPositionChanged != null
                  ? (position, hasGesture) {
                      if (hasGesture && position.center != null) {
                        widget.onPositionChanged!(position.center!);
                      }
                    }
                  : null,
            ),
            children: [
              TileLayer(
                urlTemplate: _currentTileServers[_currentServerIndex],
                userAgentPackageName: 'com.grameenride.user',
                maxZoom: 18,
                maxNativeZoom: 19,
                minZoom: 5,
                keepBuffer: 5,
                errorTileCallback: (tile, error, stackTrace) {
                  print('Tile loading error: $error');
                  if (_error == null) {
                    setState(() {
                      _error = 'Map tiles loading slowly...';
                    });
                    // Try next server after a delay
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) {
                        _switchToNextServer();
                      }
                    });
                  }
                },
                additionalOptions: {
                  'tileSize': '256',
                  'attribution': _isSatelliteView
                      ? '© Esri, Maxar, Earthstar Geographics'
                      : '© OpenStreetMap contributors',
                },
              ),
              if (widget.polylines != null)
                PolylineLayer(polylines: widget.polylines!),
              if (widget.markers != null) MarkerLayer(markers: widget.markers!),
            ],
          ),
        ),

        // Loading indicator
        if (_isLoading)
          Container(
            color: Colors.white.withOpacity(0.8),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('ম্যাপ লোড হচ্ছে...'),
                ],
              ),
            ),
          ),

        // Error indicator
        if (_error != null && !_isLoading)
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Card(
              color: Colors.orange[100],
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.warning, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: TextStyle(color: Colors.orange[800]),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _error = null;
                          _isLoading = true;
                        });
                        Future.delayed(const Duration(milliseconds: 500), () {
                          if (mounted) {
                            setState(() {
                              _isLoading = false;
                            });
                          }
                        });
                      },
                      child: const Text('পুনরায় চেষ্টা'),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // Satellite/Road view toggle button
        Positioned(
          top: 16,
          right: 16,
          child: FloatingActionButton(
            mini: true,
            onPressed: () {
              setState(() {
                _isSatelliteView = !_isSatelliteView;
                _currentServerIndex = 0; // Reset server index when switching
                _error = null;
              });
            },
            backgroundColor: Colors.white,
            child: Icon(
              _isSatelliteView ? Icons.map : Icons.satellite,
              color: Colors.grey[700],
            ),
          ),
        ),

        // Map attribution
        Positioned(
          bottom: 4,
          right: 4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.8),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              _isSatelliteView ? '© Esri, Maxar' : '© OpenStreetMap',
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey[600],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
