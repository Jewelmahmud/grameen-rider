import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grameen_core/grameen_core.dart';
import 'package:provider/provider.dart';
import 'auth_gate.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.isBangla});

  final bool isBangla;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;
  bool _isPasswordVisible = false;

  bool get _isBangla => widget.isBangla;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    final navigator = Navigator.of(context);
    try {
      final email = _emailController.text.trim();
      final session = context.read<Session>();
      final phone = toInternationalPhone(_phoneController.text);
      final outcome = await session.register(
            role: RegistrationRole.customer,
            phone: phone,
            password: _passwordController.text,
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            email: email.isEmpty ? null : email,
          );
      // GiLab texts a code; the phone must be verified before the first login.
      if (outcome == RegistrationOutcome.verificationRequired) {
        if (!mounted) return;
        final verified = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (_) => _VerifyPhoneDialog(
            phone: phone,
            password: _passwordController.text,
            session: session,
            isBangla: _isBangla,
          ),
        );
        if (verified != true) return;
      }
      // Signed in: back to the root, where AuthGate now shows MainScreen.
      navigator.popUntil((route) => route.isFirst);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(
              content: Text(authErrorMessage(e, isBangla: _isBangla))));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String? _required(String? value, String bn, String en) =>
      (value == null || value.trim().isEmpty) ? (_isBangla ? bn : en) : null;

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) {
      return _isBangla ? 'মোবাইল নম্বর দিন' : 'Phone number required';
    }
    if (!RegExp(r'^01[3-9]\d{8}$').hasMatch(value)) {
      return _isBangla
          ? '১১ ডিজিটের সঠিক মোবাইল নম্বর দিন'
          : 'Enter a valid 11-digit phone number';
    }
    return null;
  }

  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value.trim())) {
      return _isBangla ? 'সঠিক ইমেইল দিন' : 'Enter a valid email';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.length < 8) {
      return _isBangla
          ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'
          : 'Password must be at least 8 characters';
    }
    return null;
  }

  String? _validateConfirm(String? value) {
    if (value != _passwordController.text) {
      return _isBangla ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match';
    }
    return null;
  }

  InputDecoration _decoration(String label, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      suffixIcon: suffix,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(5)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visibilityToggle = IconButton(
      icon: Icon(_isPasswordVisible ? Icons.visibility_off : Icons.visibility),
      onPressed: () => setState(() {
        _isPasswordVisible = !_isPasswordVisible;
      }),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(_isBangla ? 'নতুন অ্যাকাউন্ট' : 'Create account'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              TextFormField(
                controller: _firstNameController,
                textCapitalization: TextCapitalization.words,
                decoration: _decoration(
                    _isBangla ? 'নামের প্রথম অংশ' : 'First name', Icons.person),
                validator: (v) =>
                    _required(v, 'নাম দিন', 'First name required'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _lastNameController,
                textCapitalization: TextCapitalization.words,
                decoration: _decoration(
                    _isBangla ? 'নামের শেষ অংশ' : 'Last name',
                    Icons.person_outline),
                validator: (v) =>
                    _required(v, 'নামের শেষ অংশ দিন', 'Last name required'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(11),
                ],
                decoration: _decoration(
                    _isBangla ? 'ফোন নাম্বার' : 'Phone', Icons.phone_android),
                validator: _validatePhone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: _decoration(
                    _isBangla ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)',
                    Icons.email),
                validator: _validateEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: !_isPasswordVisible,
                decoration: _decoration(
                    _isBangla ? 'পাসওয়ার্ড' : 'Password', Icons.lock,
                    suffix: visibilityToggle),
                validator: _validatePassword,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmController,
                obscureText: !_isPasswordVisible,
                decoration: _decoration(
                    _isBangla ? 'পাসওয়ার্ড আবার দিন' : 'Confirm password',
                    Icons.lock_outline),
                validator: _validateConfirm,
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _register,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          _isBangla ? 'অ্যাকাউন্ট খুলুন' : 'Sign up',
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
    );
  }
}

/// Enter the SMS code GiLab sent after registration; verifies the phone and
/// signs in with the password just chosen. Pops `true` once signed in.
class _VerifyPhoneDialog extends StatefulWidget {
  const _VerifyPhoneDialog({
    required this.phone,
    required this.password,
    required this.session,
    required this.isBangla,
  });

  final String phone;
  final String password;
  final Session session;
  final bool isBangla;

  @override
  State<_VerifyPhoneDialog> createState() => _VerifyPhoneDialogState();
}

class _VerifyPhoneDialogState extends State<_VerifyPhoneDialog> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _info;

  bool get _bn => widget.isBangla;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.session.verifyPhoneAndLogin(
        phone: widget.phone,
        code: _code.text.trim(),
        password: widget.password,
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = authErrorMessage(e, isBangla: _bn));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.session.resendVerificationCode(widget.phone);
      setState(() => _info = _bn ? 'নতুন কোড পাঠানো হয়েছে' : 'A new code was sent');
    } on ApiException catch (e) {
      setState(() => _error = authErrorMessage(e, isBangla: _bn));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_bn ? 'ফোন যাচাই করুন' : 'Verify your phone'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_bn
              ? 'অ্যাকাউন্ট তৈরি হয়েছে। আপনার ফোনে পাঠানো কোডটি লিখুন।'
              : 'Your account was created. Enter the code sent to your phone.'),
          const SizedBox(height: 16),
          TextField(
            controller: _code,
            keyboardType: TextInputType.number,
            maxLength: 8,
            autofocus: true,
            decoration: InputDecoration(
              labelText: _bn ? 'কোড' : 'Code',
              border: const OutlineInputBorder(),
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (_info != null && _error == null)
            Text(_info!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
          if (_error != null)
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(false),
          child: Text(_bn ? 'পরে' : 'Later'),
        ),
        TextButton(
          onPressed: _busy ? null : _resend,
          child: Text(_bn ? 'আবার পাঠান' : 'Resend'),
        ),
        FilledButton(
          onPressed: _busy || _code.text.trim().length < 4 ? null : _verify,
          child: Text(_bn ? 'যাচাই করুন' : 'Verify'),
        ),
      ],
    );
  }
}
