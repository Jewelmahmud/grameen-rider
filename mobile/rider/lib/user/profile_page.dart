import 'package:flutter/material.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  Widget _buildProfileHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.primary.withOpacity(0.8),
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          Stack(
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white,
                    width: 4,
                  ),
                ),
                child: const CircleAvatar(
                  radius: 48,
                  backgroundColor: Colors.white,
                  child: Icon(
                    Icons.person,
                    size: 50,
                    color: Colors.grey,
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.camera_alt,
                    size: 20,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'মোহাম্মদ রহিম',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '+৮৮০১৭১২৩৪৫৬৭৮',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'যাচাইকৃত ব্যবহারকারী',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCard(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem(
              context,
              title: 'মোট ট্রিপ',
              value: '২৫',
              icon: Icons.directions_car,
            ),
            Container(
              height: 40,
              width: 1,
              color: Colors.grey.withOpacity(0.3),
            ),
            _buildStatItem(
              context,
              title: 'রেটিং',
              value: '৪.৮',
              icon: Icons.star,
            ),
            Container(
              height: 40,
              width: 1,
              color: Colors.grey.withOpacity(0.3),
            ),
            _buildStatItem(
              context,
              title: 'সঞ্চয়',
              value: '৳১২০০',
              icon: Icons.account_balance_wallet,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(
    BuildContext context, {
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Column(
      children: [
        Icon(
          icon,
          color: Theme.of(context).colorScheme.primary,
          size: 24,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildMenuSection(
    BuildContext context, {
    required String title,
    required List<Widget> items,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[700],
                ),
          ),
        ),
        Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: items,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required String title,
    required IconData icon,
    required VoidCallback onTap,
    bool showDivider = true,
    Color? iconColor,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (iconColor ?? Theme.of(context).colorScheme.primary)
                        .withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    color: iconColor ?? Theme.of(context).colorScheme.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 16,
                  color: Colors.grey[400],
                ),
              ],
            ),
            if (showDivider) ...[
              const SizedBox(height: 12),
              Divider(
                height: 1,
                color: Colors.grey.withOpacity(0.2),
              ),
            ],
          ],
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
          'প্রোফাইল',
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
            icon: const Icon(Icons.edit),
            onPressed: () {
              // TODO: Navigate to edit profile
            },
          ),
        ],
      ),
      body: ListView(
        children: [
          _buildProfileHeader(context),
          _buildStatsCard(context),
          const SizedBox(height: 16),
          _buildMenuSection(
            context,
            title: 'অ্যাকাউন্ট',
            items: [
              _buildMenuItem(
                context,
                title: 'ব্যক্তিগত তথ্য',
                icon: Icons.person_outline,
                onTap: () {
                  // TODO: Navigate to personal info
                },
              ),
              _buildMenuItem(
                context,
                title: 'পেমেন্ট পদ্ধতি',
                icon: Icons.payment,
                onTap: () {
                  // TODO: Navigate to payment methods
                },
              ),
              _buildMenuItem(
                context,
                title: 'ট্রিপ হিস্টরি',
                icon: Icons.history,
                onTap: () {
                  // TODO: Navigate to trip history
                },
                showDivider: false,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildMenuSection(
            context,
            title: 'সেটিংস',
            items: [
              _buildMenuItem(
                context,
                title: 'নোটিফিকেশন',
                icon: Icons.notifications_none,
                onTap: () {
                  // TODO: Navigate to notification settings
                },
              ),
              _buildMenuItem(
                context,
                title: 'গোপনীয়তা',
                icon: Icons.privacy_tip_outlined,
                onTap: () {
                  // TODO: Navigate to privacy settings
                },
              ),
              _buildMenuItem(
                context,
                title: 'ভাষা',
                icon: Icons.language,
                onTap: () {
                  // TODO: Navigate to language settings
                },
                showDivider: false,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildMenuSection(
            context,
            title: 'সাহায্য',
            items: [
              _buildMenuItem(
                context,
                title: 'সাহায্য কেন্দ্র',
                icon: Icons.help_outline,
                onTap: () {
                  // TODO: Navigate to help center
                },
              ),
              _buildMenuItem(
                context,
                title: 'যোগাযোগ করুন',
                icon: Icons.phone,
                onTap: () {
                  // TODO: Navigate to contact
                },
              ),
              _buildMenuItem(
                context,
                title: 'রেট করুন',
                icon: Icons.star_outline,
                onTap: () {
                  // TODO: Rate app
                },
              ),
              _buildMenuItem(
                context,
                title: 'লগ আউট',
                icon: Icons.logout,
                iconColor: Colors.red,
                onTap: () {
                  // TODO: Logout
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('লগ আউট'),
                      content: const Text(
                          'আপনি কি নিশ্চিত যে আপনি লগ আউট করতে চান?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('বাতিল'),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                            // TODO: Implement logout logic
                          },
                          child: const Text('লগ আউট'),
                        ),
                      ],
                    ),
                  );
                },
                showDivider: false,
              ),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
