import 'package:flutter/material.dart';
import 'package:grameen_core/grameen_core.dart';
import 'package:provider/provider.dart';

import '../widgets/app_logo.dart';
import 'login_screen.dart';
import 'main_screen.dart';

/// Shows the login flow or the main screens depending on [Session.status].
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _restoreFailed = false;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    setState(() => _restoreFailed = false);
    try {
      await context.read<Session>().restore();
    } on ApiException {
      if (mounted) setState(() => _restoreFailed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    switch (session.status) {
      case SessionStatus.signedIn:
        return const MainScreen();
      case SessionStatus.signedOut:
        return const LoginScreen();
      case SessionStatus.unknown:
        return Scaffold(
          body: Center(
            child: _restoreFailed
                ? Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const AppLogo(size: 96),
                        const SizedBox(height: 24),
                        const Text(
                          'সার্ভারে সংযোগ করা যাচ্ছে না।\nইন্টারনেট সংযোগ পরীক্ষা করুন।',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _restore,
                          icon: const Icon(Icons.refresh),
                          label: const Text('আবার চেষ্টা করুন'),
                        ),
                      ],
                    ),
                  )
                : const CircularProgressIndicator(),
          ),
        );
    }
  }
}

/// Logs out and returns to the root, where [AuthGate] shows the login screen.
Future<void> signOut(BuildContext context) async {
  final session = context.read<Session>();
  Navigator.of(context).popUntil((route) => route.isFirst);
  await session.logout();
}

/// User-facing text for an API error.
String authErrorMessage(ApiException error, {required bool isBangla}) {
  if (error.isNetwork) {
    return isBangla
        ? 'সার্ভারে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।'
        : 'Could not reach the server. Check your connection.';
  }
  if (error.code == Session.tokenRejectedCode) {
    return isBangla
        ? 'লগইন সফল হয়েছে, কিন্তু সার্ভার যাচাই করতে পারছে না। কিছুক্ষণ পরে চেষ্টা করুন।'
        : 'Login succeeded, but the server could not verify it. Please try again later.';
  }
  // These arrive as 401/403/429/503 too, so check them before the generic cases.
  if (error.isVerificationRequired) {
    return isBangla
        ? 'লগইনের আগে ফোন নম্বর যাচাই করুন'
        : 'Verify your phone number before logging in';
  }
  if (error.isAccountBlocked) {
    return isBangla
        ? 'এই অ্যাকাউন্টটি বন্ধ আছে। সহায়তায় যোগাযোগ করুন।'
        : 'This account is blocked. Please contact support.';
  }
  if (error.isRateLimited) {
    return isBangla
        ? 'অনেকবার চেষ্টা হয়েছে। কয়েক মিনিট অপেক্ষা করুন।'
        : 'Too many attempts. Please wait a few minutes.';
  }
  if (error.isAuthServiceDown) {
    return isBangla
        ? 'লগইন সেবা এখন পাওয়া যাচ্ছে না। একটু পরে চেষ্টা করুন।'
        : 'The login service is unavailable. Please try again shortly.';
  }
  if (error.isUnauthorized) {
    return isBangla
        ? 'ফোন নম্বর বা পাসওয়ার্ড সঠিক নয়'
        : 'Incorrect phone number or password';
  }
  if (error.isConflict) {
    return isBangla
        ? 'এই ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে'
        : 'An account with this phone number already exists';
  }
  return error.message;
}

/// `01XXXXXXXXX` as typed → `+8801XXXXXXXXX` as the auth server expects.
String toInternationalPhone(String localPhone) => '+88${localPhone.trim()}';
