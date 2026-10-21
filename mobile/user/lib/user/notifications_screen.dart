import 'package:flutter/material.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<_AppNotification> _items = <_AppNotification>[
    _AppNotification(
        title: 'বুকিং কনফার্ম হয়েছে',
        body: 'আপনার ট্রিপ বুকিং নিশ্চিত করা হয়েছে।',
        time: '২ মিনিট আগে'),
    _AppNotification(
        title: 'ড্রাইভার পথে আছে',
        body: 'ড্রাইভার আপনার লোকেশনের দিকে আসছে।',
        time: '১ ঘন্টা আগে',
        unread: false),
    _AppNotification(
        title: 'অফার', body: 'আজকে সকল রাইডে ১০% ডিসকাউন্ট!', time: 'গতকাল'),
  ];

  Future<void> _refresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          'নোটিফিকেশন',
          style: theme.textTheme.titleLarge?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.2),
        surfaceTintColor: Colors.transparent,
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: _items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final n = _items[index];
            return Card(
              elevation: n.unread ? 3 : 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                  child: Icon(
                    n.unread ? Icons.notifications_active : Icons.notifications,
                    color: theme.colorScheme.primary,
                  ),
                ),
                title: Text(
                  n.title,
                  style: TextStyle(
                    fontWeight: n.unread ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    Text(n.body),
                    const SizedBox(height: 6),
                    Text(
                      n.time,
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                  ],
                ),
                onTap: () {
                  setState(() {
                    _items[index] = n.copyWith(unread: false);
                  });
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AppNotification {
  final String title;
  final String body;
  final String time;
  final bool unread;

  const _AppNotification({
    required this.title,
    required this.body,
    required this.time,
    this.unread = true,
  });

  _AppNotification copyWith(
      {String? title, String? body, String? time, bool? unread}) {
    return _AppNotification(
      title: title ?? this.title,
      body: body ?? this.body,
      time: time ?? this.time,
      unread: unread ?? this.unread,
    );
  }
}
