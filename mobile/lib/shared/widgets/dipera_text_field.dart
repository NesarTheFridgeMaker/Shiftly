import 'package:flutter/material.dart';

class DiperaTextField extends StatefulWidget {
  const DiperaTextField({
    super.key,
    this.controller,
    this.focusNode,
    this.label,
    this.hint,
    this.prefixIcon,
    this.suffixIcon,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.enabled = true,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.onChanged,
    this.onSubmitted,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;

  final String? label;
  final String? hint;

  final Widget? prefixIcon;
  final Widget? suffixIcon;

  final String? Function(String?)? validator;

  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;

  final bool obscureText;
  final bool enabled;
  final bool autocorrect;
  final bool enableSuggestions;

  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  State<DiperaTextField> createState() => _DiperaTextFieldState();
}

class _DiperaTextFieldState extends State<DiperaTextField> {
  late final FocusNode _internalFocusNode;

  FocusNode get _effectiveFocusNode =>
      widget.focusNode ?? _internalFocusNode;

  @override
  void initState() {
    super.initState();

    _internalFocusNode = FocusNode();
    _effectiveFocusNode.addListener(_handleFocusChange);
  }

  @override
  void didUpdateWidget(covariant DiperaTextField oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.focusNode != widget.focusNode) {
      (oldWidget.focusNode ?? _internalFocusNode)
          .removeListener(_handleFocusChange);

      _effectiveFocusNode.addListener(_handleFocusChange);
    }
  }

  @override
  void dispose() {
    _effectiveFocusNode.removeListener(_handleFocusChange);
    _internalFocusNode.dispose();
    super.dispose();
  }

  void _handleFocusChange() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isFocused = _effectiveFocusNode.hasFocus;

    const primaryBlue = Color(0xFF2457F5);
    const textColor = Color(0xFF101828);
    const mutedTextColor = Color(0xFF667085);
    const borderColor = Color(0xFFDCE3EE);
    const fieldBackground = Color(0xFFF8FAFD);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: isFocused
                ? const [
                    BoxShadow(
                      color: Color(0x1A2457F5),
                      blurRadius: 18,
                      offset: Offset(0, 6),
                    ),
                  ]
                : const [],
          ),
          child: TextFormField(
            controller: widget.controller,
            focusNode: _effectiveFocusNode,
            validator: widget.validator,
            keyboardType: widget.keyboardType,
            textInputAction: widget.textInputAction,
            obscureText: widget.obscureText,
            enabled: widget.enabled,
            autocorrect: widget.autocorrect,
            enableSuggestions: widget.enableSuggestions,
            onChanged: widget.onChanged,
            onFieldSubmitted: widget.onSubmitted,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: textColor,
              fontWeight: FontWeight.w500,
            ),
            cursorColor: primaryBlue,
            decoration: InputDecoration(
              hintText: widget.hint,
              hintStyle: theme.textTheme.bodyLarge?.copyWith(
                color: mutedTextColor.withValues(alpha: 0.7),
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: widget.prefixIcon == null
                  ? null
                  : IconTheme(
                      data: IconThemeData(
                        color: isFocused
                            ? primaryBlue
                            : mutedTextColor,
                        size: 22,
                      ),
                      child: widget.prefixIcon!,
                    ),
              suffixIcon: widget.suffixIcon,
              filled: true,
              fillColor: widget.enabled
                  ? fieldBackground
                  : const Color(0xFFF2F4F7),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 18,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: borderColor,
                  width: 1.2,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: primaryBlue,
                  width: 1.7,
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: Color(0xFFD92D20),
                  width: 1.2,
                ),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: Color(0xFFD92D20),
                  width: 1.7,
                ),
              ),
              disabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: Color(0xFFE4E7EC),
                ),
              ),
              errorStyle: theme.textTheme.bodySmall?.copyWith(
                color: const Color(0xFFD92D20),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }
}