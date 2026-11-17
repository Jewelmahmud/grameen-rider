import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:grameen_core/grameen_core.dart';
import 'package:provider/provider.dart';
import 'user/auth_gate.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(MyApp(core: GrameenCore.create()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, required this.core});

  final GrameenCore core;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<GrameenCore>.value(value: core),
        ChangeNotifierProvider<Session>.value(value: core.session),
      ],
      child: _buildApp(),
    );
  }

  Widget _buildApp() {
    return MaterialApp(
      title: 'গ্রামীণ রাইড',
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
      home: const AuthGate(),
    );
  }
}
