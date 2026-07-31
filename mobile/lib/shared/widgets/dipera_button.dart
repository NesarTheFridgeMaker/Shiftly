import 'package:flutter/material.dart';

class DiperaButton extends StatefulWidget {
  const DiperaButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.expanded = true,
    this.enabled = true,
  });

  final String text;
  final VoidCallback? onPressed;
  final Widget? icon;

  final bool isLoading;
  final bool expanded;
  final bool enabled;

  @override
  State<DiperaButton> createState() => _DiperaButtonState();
}

class _DiperaButtonState extends State<DiperaButton> {
  bool _isHovered = false;
  bool _isPressed = false;

  bool get _isEnabled {
    return widget.enabled &&
        !widget.isLoading &&
        widget.onPressed != null;
  }

  void _setPressed(bool value) {
    if (!_isEnabled || _isPressed == value) {
      return;
    }

    setState(() {
      _isPressed = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final button = MouseRegion(
      cursor: _isEnabled
          ? SystemMouseCursors.click
          : SystemMouseCursors.basic,
      onEnter: (_) {
        if (_isEnabled) {
          setState(() {
            _isHovered = true;
          });
        }
      },
      onExit: (_) {
        setState(() {
          _isHovered = false;
          _isPressed = false;
        });
      },
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: _isEnabled ? (_) => _setPressed(true) : null,
        onTapUp: _isEnabled ? (_) => _setPressed(false) : null,
        onTapCancel: _isEnabled ? () => _setPressed(false) : null,
        onTap: _isEnabled ? widget.onPressed : null,
        child: AnimatedScale(
          scale: _isPressed ? 0.975 : 1,
          duration: const Duration(milliseconds: 120),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            height: 58,
            transform: Matrix4.translationValues(
              0,
              _isHovered && !_isPressed ? -2 : 0,
              0,
            ),
            decoration: BoxDecoration(
              gradient: _isEnabled
                  ? LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: _isPressed
                          ? const [
                              Color(0xFF214CD8),
                              Color(0xFF183FC6),
                            ]
                          : const [
                              Color(0xFF3D6BFF),
                              Color(0xFF2457F5),
                            ],
                    )
                  : const LinearGradient(
                      colors: [
                        Color(0xFFAEBCE8),
                        Color(0xFF9AAADB),
                      ],
                    ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: _isPressed || !_isEnabled
                  ? const []
                  : [
                      BoxShadow(
                        color: const Color(0xFF2457F5).withValues(
                          alpha: _isHovered ? 0.34 : 0.24,
                        ),
                        blurRadius: _isHovered ? 22 : 16,
                        offset: Offset(
                          0,
                          _isHovered ? 9 : 7,
                        ),
                      ),
                    ],
            ),
            child: Material(
              color: Colors.transparent,
              child: Semantics(
                button: true,
                enabled: _isEnabled,
                label: widget.text,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                  ),
                  child: Center(
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 180),
                      child: widget.isLoading
                          ? const SizedBox(
                              key: ValueKey('loading'),
                              width: 23,
                              height: 23,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : Row(
                              key: const ValueKey('content'),
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment:
                                  MainAxisAlignment.center,
                              children: [
                                if (widget.icon != null) ...[
                                  IconTheme(
                                    data: const IconThemeData(
                                      color: Colors.white,
                                      size: 21,
                                    ),
                                    child: widget.icon!,
                                  ),
                                  const SizedBox(width: 10),
                                ],
                                Text(
                                  widget.text,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    if (widget.expanded) {
      return SizedBox(
        width: double.infinity,
        child: button,
      );
    }

    return button;
  }
}