import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grameen_core/grameen_core.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/app_logo.dart';
import 'auth_gate.dart';
import 'register_screen.dart';

enum _LoginMode { password, otp }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  _LoginMode _mode = _LoginMode.password;
  bool _isLoading = false;
  bool _isBangla = true;
  bool _isPasswordVisible = false;

  @override
  void initState() {
    super.initState();
    _loadLanguage();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final isBangla = prefs.getBool('isBangla') ?? true;
    if (mounted) setState(() => _isBangla = isBangla);
  }

  void _toggleLanguage() async {
    setState(() {
      _isBangla = !_isBangla;
    });

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isBangla', _isBangla);
  }

  Future<void> _loginWithPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // On success AuthGate swaps this screen for MainScreen.
      await context.read<Session>().login(
            phone: toInternationalPhone(_phoneController.text),
            password: _passwordController.text,
          );
    } on ApiException catch (e) {
      _showError(authErrorMessage(e, isBangla: _isBangla));
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // TODO: Call the OTP endpoints once the backend has them (plan item B4).
  Future<void> _sendOTP() async {
    if (!_formKey.currentState!.validate()) return;
    _showError(_isBangla
        ? 'ওটিপি লগইন শীঘ্রই আসছে। আপাতত পাসওয়ার্ড দিয়ে লগইন করুন।'
        : 'OTP login is coming soon. Please log in with your password.');
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _openRegister() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RegisterScreen(isBangla: _isBangla),
      ),
    );
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

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return _isBangla ? 'পাসওয়ার্ড দিন' : 'Password required';
    }
    return null;
  }

  Widget _buildToggle({
    required List<String> labels,
    required int selected,
    required ValueChanged<int> onSelected,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(25),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < labels.length; i++)
              GestureDetector(
                onTap: selected == i ? null : () => onSelected(i),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  color: selected == i ? Colors.white : Colors.transparent,
                  child: Text(
                    labels[i],
                    style: TextStyle(
                      color: selected == i
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
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required FormFieldValidator<String> validator,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    bool obscureText = false,
    Widget? suffixIcon,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        obscureText: obscureText,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: Colors.white70),
          prefixIcon: Icon(icon, color: Colors.white70),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
        validator: validator,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isPasswordMode = _mode == _LoginMode.password;

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
                    child: _buildToggle(
                      labels: const ['বাং', 'EN'],
                      selected: _isBangla ? 0 : 1,
                      onSelected: (_) => _toggleLanguage(),
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
                          const SizedBox(height: 24),
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
                          const SizedBox(height: 32),
                          // Password / OTP switch
                          Center(
                            child: _buildToggle(
                              labels: _isBangla
                                  ? const ['পাসওয়ার্ড', 'ওটিপি']
                                  : const ['Password', 'OTP'],
                              selected: _mode.index,
                              onSelected: (i) => setState(() {
                                _mode = _LoginMode.values[i];
                                _formKey.currentState?.reset();
                              }),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Center(
                            child: SizedBox(
                              width: size.width * 0.65,
                              child: Column(
                                children: [
                                  _buildField(
                                    controller: _phoneController,
                                    label: _isBangla ? 'ফোন নাম্বার' : 'Phone',
                                    icon: Icons.phone_android,
                                    keyboardType: TextInputType.phone,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly,
                                      LengthLimitingTextInputFormatter(11),
                                    ],
                                    validator: _validatePhone,
                                  ),
                                  if (isPasswordMode) ...[
                                    const SizedBox(height: 16),
                                    _buildField(
                                      controller: _passwordController,
                                      label:
                                          _isBangla ? 'পাসওয়ার্ড' : 'Password',
                                      icon: Icons.lock,
                                      obscureText: !_isPasswordVisible,
                                      validator: _validatePassword,
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _isPasswordVisible
                                              ? Icons.visibility_off
                                              : Icons.visibility,
                                          color: Colors.white70,
                                        ),
                                        onPressed: () => setState(() {
                                          _isPasswordVisible =
                                              !_isPasswordVisible;
                                        }),
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 24),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 50,
                                    child: ElevatedButton(
                                      onPressed: _isLoading
                                          ? null
                                          : (isPasswordMode
                                              ? _loginWithPassword
                                              : _sendOTP),
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
                                              isPasswordMode
                                                  ? (_isBangla
                                                      ? 'লগইন করুন'
                                                      : 'Log in')
                                                  : (_isBangla
                                                      ? 'ওটিপি পাঠান'
                                                      : 'Send OTP'),
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
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: _isLoading ? null : _openRegister,
                            child: Text(
                              _isBangla
                                  ? 'অ্যাকাউন্ট নেই? নতুন অ্যাকাউন্ট খুলুন'
                                  : "Don't have an account? Sign up",
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
