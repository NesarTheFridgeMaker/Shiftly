import 'package:flutter/material.dart';

class DiperaCard extends StatelessWidget {
  const DiperaCard({
    super.key,
    this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.child,
    this.onTap,
    this.accentColor,
    this.padding = const EdgeInsets.all(20),
  });

  final String? title;
  final String? subtitle;

  final Widget? leading;
  final Widget? trailing;
  final Widget? child;

  final VoidCallback? onTap;

  final Color? accentColor;

  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final cardContent = Stack(
      children: [
        if (accentColor != null)
          Positioned(
            top: 0,
            bottom: 0,
            left: 0,
            child: Container(
              width: 5,
              decoration: BoxDecoration(
                color: accentColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  bottomLeft: Radius.circular(20),
                ),
              ),
            ),
          ),
        Padding(
          padding: accentColor == null
              ? padding
              : EdgeInsets.only(
                  left: 25,
                  top: _getTopPadding(),
                  right: _getRightPadding(),
                  bottom: _getBottomPadding(),
                ),
          child: child ??
              Row(
                children: [
                  if (leading != null) ...[
                    leading!,
                    const SizedBox(width: 16),
                  ],
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (title != null)
                          Text(
                            title!,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF101828),
                            ),
                          ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            subtitle!,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFF667085),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (trailing != null) ...[
                    const SizedBox(width: 16),
                    trailing!,
                  ],
                ],
              ),
        ),
      ],
    );

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F101828),
            blurRadius: 24,
            offset: Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: onTap == null
          ? cardContent
          : Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onTap,
                child: cardContent,
              ),
            ),
    );
  }

  double _getTopPadding() {
    if (padding is EdgeInsets) {
      return (padding as EdgeInsets).top;
    }

    return 20;
  }

  double _getRightPadding() {
    if (padding is EdgeInsets) {
      return (padding as EdgeInsets).right;
    }

    return 20;
  }

  double _getBottomPadding() {
    if (padding is EdgeInsets) {
      return (padding as EdgeInsets).bottom;
    }

    return 20;
  }
}