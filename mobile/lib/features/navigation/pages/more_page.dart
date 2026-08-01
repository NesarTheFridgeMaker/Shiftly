import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/widgets/dipera_card.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key});

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  void _showComingSoon(
    BuildContext context,
    String feature,
  ) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature wird später verbunden.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 36),
          children: [
            Text(
              'Mehr',
              style: theme.textTheme.headlineSmall?.copyWith(
                color: const Color(0xFF101828),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Weitere Funktionen und Einstellungen',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: const Color(0xFF667085),
              ),
            ),
            const SizedBox(height: 28),
            _MoreEntry(
              title: 'Abwesenheiten',
              subtitle: 'Urlaub und weitere Anträge',
              icon: Icons.beach_access_rounded,
              foregroundColor: const Color(0xFFB54708),
              backgroundColor: const Color(0xFFFFFAEB),
              onTap: () => _showComingSoon(
                context,
                'Abwesenheiten',
              ),
            ),
            const SizedBox(height: 14),
            _MoreEntry(
              title: 'Dokumente',
              subtitle: 'Lohnabrechnungen und Unterlagen',
              icon: Icons.description_outlined,
              foregroundColor: const Color(0xFF6941C6),
              backgroundColor: const Color(0xFFF4EBFF),
              onTap: () => _showComingSoon(
                context,
                'Dokumente',
              ),
            ),
            const SizedBox(height: 14),
            _MoreEntry(
              title: 'Profil',
              subtitle: 'Persönliche Daten und Zugang',
              icon: Icons.person_outline_rounded,
              foregroundColor: const Color(0xFF175CD3),
              backgroundColor: const Color(0xFFEFF8FF),
              onTap: () => _showComingSoon(
                context,
                'Profil',
              ),
            ),
            const SizedBox(height: 14),
            _MoreEntry(
              title: 'Abmelden',
              subtitle: 'Dipera-Konto auf diesem Gerät verlassen',
              icon: Icons.logout_rounded,
              foregroundColor: const Color(0xFFB42318),
              backgroundColor: const Color(0xFFFEF3F2),
              onTap: _signOut,
            ),
          ],
        ),
      ),
    );
  }
}

class _MoreEntry extends StatelessWidget {
  const _MoreEntry({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      title: title,
      subtitle: subtitle,
      leading: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(15),
        ),
        child: Icon(
          icon,
          color: foregroundColor,
          size: 24,
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: Color(0xFF98A2B3),
      ),
      onTap: onTap,
    );
  }
}