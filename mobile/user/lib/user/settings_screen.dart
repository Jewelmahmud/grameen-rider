import 'package:flutter/material.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Widget _buildSettingTile({
    required String title,
    required IconData icon,
    String? subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle) : null,
      trailing: trailing,
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Image with Overlay
          Positioned.fill(
            child: Image.asset(
              'assets/images/bg.jpeg',
              fit: BoxFit.cover,
            ),
          ),
          // Dark Overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.6),
                    Colors.black.withOpacity(0.4),
                  ],
                ),
              ),
            ),
          ),
          // Content
          SafeArea(
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
                      Text(
                        'সেটিংস',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                ),
                // Settings List
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    child: ListView(
                      children: [
                        _buildSettingTile(
                          title: 'প্রোফাইল',
                          icon: Icons.person,
                          onTap: () {
                            // TODO: Navigate to profile
                          },
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'ভাষা',
                          icon: Icons.language,
                          subtitle: 'বাংলা',
                          trailing:
                              const Icon(Icons.arrow_forward_ios, size: 16),
                          onTap: () {
                            // TODO: Show language picker
                          },
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'নোটিফিকেশন',
                          icon: Icons.notifications,
                          trailing: Switch(
                            value: true,
                            onChanged: (value) {
                              // TODO: Toggle notifications
                            },
                          ),
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'লোকেশন',
                          icon: Icons.location_on,
                          trailing: Switch(
                            value: true,
                            onChanged: (value) {
                              // TODO: Toggle location
                            },
                          ),
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'ডার্ক মোড',
                          icon: Icons.dark_mode,
                          trailing: Switch(
                            value: false,
                            onChanged: (value) {
                              // TODO: Toggle dark mode
                            },
                          ),
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'সহায়তা',
                          icon: Icons.help,
                          onTap: () {
                            // TODO: Navigate to help
                          },
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'শর্তাবলী',
                          icon: Icons.description,
                          onTap: () {
                            // TODO: Navigate to terms
                          },
                        ),
                        const Divider(),
                        _buildSettingTile(
                          title: 'লগ আউট',
                          icon: Icons.logout,
                          onTap: () {
                            // TODO: Handle logout
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
