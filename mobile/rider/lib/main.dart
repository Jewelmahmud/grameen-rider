import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'user/login_screen.dart';
import 'rider/rider_main_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  Future<bool> _checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('isLoggedIn') ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Grameen Rider (Driver)',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Nikosh',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1bc266),
          primary: const Color(0xFF1bc266),
          secondary: const Color(0xFF1bc266),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1bc266),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        cardTheme: const CardThemeData(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        useMaterial3: true,
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontFamily: 'Nikosh'),
          displayMedium: TextStyle(fontFamily: 'Nikosh'),
          displaySmall: TextStyle(fontFamily: 'Nikosh'),
          headlineLarge: TextStyle(fontFamily: 'Nikosh'),
          headlineMedium: TextStyle(
              fontFamily: 'Nikosh', fontSize: 24, fontWeight: FontWeight.bold),
          headlineSmall: TextStyle(fontFamily: 'Nikosh'),
          titleLarge: TextStyle(
              fontFamily: 'Nikosh', fontSize: 20, fontWeight: FontWeight.w600),
          titleMedium: TextStyle(fontFamily: 'Nikosh', fontSize: 16),
          titleSmall: TextStyle(fontFamily: 'Nikosh'),
          bodyLarge: TextStyle(fontFamily: 'Nikosh'),
          bodyMedium: TextStyle(fontFamily: 'Nikosh'),
          bodySmall: TextStyle(fontFamily: 'Nikosh'),
          labelLarge: TextStyle(fontFamily: 'Nikosh'),
          labelMedium: TextStyle(fontFamily: 'Nikosh'),
          labelSmall: TextStyle(fontFamily: 'Nikosh'),
        ),
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('bn', 'BD'), // Bangla
        Locale('en', 'US'), // English
      ],
      home: FutureBuilder<bool>(
        future: _checkLoginStatus(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }

          final isLoggedIn = snapshot.data ?? false;
          return isLoggedIn ? const RiderMainScreen() : const LoginScreen();
        },
      ),
    );
  }
}
