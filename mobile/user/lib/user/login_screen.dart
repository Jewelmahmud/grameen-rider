import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/app_logo.dart';
import 'main_screen.dart';
import '../rider/rider_main_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isLoading = false;
  bool _otpSent = false;
  bool _isBangla = true;
  bool _isPasswordVisible = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _toggleLanguage() async {
    setState(() {
      _isBangla = !_isBangla;
    });

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isBangla', _isBangla);
  }

  Future<void> _sendOTP() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    // TODO: Implement actual OTP sending
    await Future.delayed(const Duration(seconds: 2)); // Simulating API call

    setState(() {
      _isLoading = false;
      _otpSent = true;
    });
  }

  Future<void> _verifyOTP() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    // TODO: Implement actual OTP verification
    await Future.delayed(const Duration(seconds: 2)); // Simulating API call

    // Save login state
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('phoneNumber', _phoneController.text);

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const MainScreen()),
      );
    }
  }

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) {
      return _isBangla ? 'মোবাইল নম্বর দিন' : 'Phone number required';
    }
    if (value.length != 11) {
      return _isBangla
          ? '১১ ডিজিটের মোবাইল নম্বর দিন'
          : 'Enter valid phone number';
    }
    if (!RegExp(r'^01[3-9]\d{8}').hasMatch(value)) {
      return _isBangla ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter valid phone number';
    }
    return null;
  }

  String? _validateOTP(String? value) {
    if (value == null || value.isEmpty) {
      return _isBangla ? 'ওটিপি দিন' : 'OTP is required';
    }
    if (value.length != 6) {
      return _isBangla ? '৬ ডিজিটের ওটিপি দিন' : 'Enter valid OTP';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background Image
          Image.asset(
            'assets/images/bg.jpeg',
            fit: BoxFit.cover,
          ),
          // Black Overlay
          Container(
            color: Colors.black.withOpacity(0.7),
          ),
          // Content
          SafeArea(
            child: Column(
              children: [
                // Language Switch
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(25),
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(25),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            GestureDetector(
                              onTap: _isBangla ? null : _toggleLanguage,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                color: _isBangla
                                    ? Colors.white
                                    : Colors.transparent,
                                child: Text(
                                  'বাং',
                                  style: TextStyle(
                                    color: _isBangla
                                        ? const Color(0xFF1bc266)
                                        : Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: _isBangla ? _toggleLanguage : null,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                color: !_isBangla
                                    ? Colors.white
                                    : Colors.transparent,
                                child: Text(
                                  'EN',
                                  style: TextStyle(
                                    color: !_isBangla
                                        ? const Color(0xFF1bc266)
                                        : Colors.white,
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
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 48),
                          // Logo and Title
                          const Center(
                            child: AppLogo(size: 120),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _isBangla
                                ? 'মাটির মানুষের বিশ্বস্ত পরিবহন পার্টনার'
                                : 'Trusted Transport Partner of Rural People',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 48),
                          // Phone Number Field
                          Center(
                            child: SizedBox(
                              width: size.width * 0.65,
                              child: Column(
                                children: [
                                  Container(
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(
                                          color: Colors.white, width: 2),
                                    ),
                                    child: TextFormField(
                                      controller: _phoneController,
                                      keyboardType: TextInputType.phone,
                                      style:
                                          const TextStyle(color: Colors.white),
                                      decoration: InputDecoration(
                                        labelText:
                                            _isBangla ? 'ফোন নাম্বার' : 'Phone',
                                        labelStyle: const TextStyle(
                                            color: Colors.white70),
                                        prefixIcon: const Icon(
                                            Icons.phone_android,
                                            color: Colors.white70),
                                        border: InputBorder.none,
                                        contentPadding:
                                            const EdgeInsets.symmetric(
                                                horizontal: 20, vertical: 16),
                                      ),
                                      validator: _validatePhone,
                                    ),
                                  ),
                                  const SizedBox(height: 24),
                                  if (_otpSent) ...[
                                    TextFormField(
                                      controller: _otpController,
                                      keyboardType: TextInputType.number,
                                      style:
                                          const TextStyle(color: Colors.white),
                                      decoration: InputDecoration(
                                        labelText: 'ওটিপি',
                                        labelStyle: const TextStyle(
                                            color: Colors.white70),
                                        hintText: '৬ ডিজিটের ওটিপি',
                                        hintStyle: const TextStyle(
                                            color: Colors.white60),
                                        prefixIcon: const Icon(Icons.lock,
                                            color: Colors.white70),
                                        border: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(5),
                                          borderSide: const BorderSide(
                                              color: Colors.white, width: 2),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(5),
                                          borderSide: const BorderSide(
                                              color: Colors.white, width: 2),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(5),
                                          borderSide: const BorderSide(
                                              color: Colors.white, width: 2),
                                        ),
                                      ),
                                      inputFormatters: [
                                        FilteringTextInputFormatter.digitsOnly,
                                        LengthLimitingTextInputFormatter(6),
                                      ],
                                      validator: _validateOTP,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      '${_phoneController.text} নম্বরে ওটিপি পাঠানো হয়েছে',
                                      style: const TextStyle(
                                          color: Colors.white70),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                  const SizedBox(height: 24),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 50,
                                    child: ElevatedButton(
                                      onPressed: _isLoading
                                          ? null
                                          : (_otpSent ? _verifyOTP : _sendOTP),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Theme.of(context)
                                            .colorScheme
                                            .primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(5),
                                        ),
                                      ),
                                      child: _isLoading
                                          ? const SizedBox(
                                              width: 24,
                                              height: 24,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                valueColor:
                                                    AlwaysStoppedAnimation<
                                                        Color>(Colors.white),
                                              ),
                                            )
                                          : Text(
                                              _otpSent
                                                  ? 'লগইন করুন'
                                                  : 'ওটিপি পাঠান',
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
                          if (_otpSent) ...[
                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: _isLoading
                                  ? null
                                  : () {
                                      setState(() {
                                        _otpSent = false;
                                        _otpController.clear();
                                      });
                                    },
                              child: const Text(
                                'মোবাইল নম্বর পরিবর্তন করুন',
                                style: TextStyle(color: Colors.white),
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          // Home Page Link
                          TextButton(
                            onPressed: () {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const MainScreen(),
                                ),
                              );
                            },
                            child: Text(
                              _isBangla ? 'কাস্টমার হোম' : 'Customer Home',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const RiderMainScreen(),
                                ),
                              );
                            },
                            child: Text(
                              _isBangla
                                  ? 'রাইডার ড্যাশবোর্ড'
                                  : 'Rider Dashboard',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Copyright Text
                          Padding(
                            padding: const EdgeInsets.only(bottom: 24),
                            child: Text(
                              _isBangla
                                  ? '© ২০২৪ গ্রামীণ ডেলিভারি। সর্বস্বত্ব সংরক্ষিত।'
                                  : '© 2024 Grameen Delivery. All rights reserved.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
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
        ],
      ),
    );
  }
}
