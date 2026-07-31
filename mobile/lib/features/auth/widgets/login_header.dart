import 'package:flutter/material.dart';

class LoginHeader extends StatelessWidget {
  const LoginHeader({
    super.key,
    this.logoAssetPath = 'assets/images/dipera-logo-dark.png',
    this.compact = false,
  });

  final String logoAssetPath;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          logoAssetPath,
          height: compact ? 64 : 82,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            return _FallbackLogo(
              textTheme: textTheme,
              compact: compact,
            );
          },
        ),
        SizedBox(height: compact ? 8 : 12),
        Text(
          'Die Personal-App',
          textAlign: TextAlign.center,
          style: textTheme.titleMedium?.copyWith(
            color: const Color(0xFF667085),
            fontWeight: FontWeight.w500,
            fontSize: compact ? 14 : null,
          ),
        ),
      ],
    );
  }
}

class _FallbackLogo extends StatelessWidget {
  const _FallbackLogo({
    required this.textTheme,
    required this.compact,
  });

  final TextTheme textTheme;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final logoSize = compact ? 54.0 : 68.0;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: logoSize,
          height: logoSize,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF19C7E8),
                Color(0xFF2457F5),
              ],
            ),
            borderRadius: BorderRadius.circular(
              compact ? 16 : 20,
            ),
          ),
          child: Icon(
            Icons.schedule_rounded,
            size: compact ? 30 : 38,
            color: Colors.white,
          ),
        ),
        SizedBox(width: compact ? 9 : 12),
        Text(
          'Dipera',
          style: textTheme.displaySmall?.copyWith(
            color: const Color(0xFF101828),
            fontWeight: FontWeight.w700,
            fontSize: compact ? 30 : null,
            letterSpacing: -1.2,
          ),
        ),
      ],
    );
  }
}