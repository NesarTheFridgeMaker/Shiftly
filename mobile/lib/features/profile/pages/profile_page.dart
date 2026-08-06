import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/employee_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../auth/providers/auth_providers.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(currentEmployeeProfileProvider);

    await ref.read(
      currentEmployeeProfileProvider.future,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(
      currentEmployeeProfileProvider,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refresh(ref),
          child: profileAsync.when(
            loading: () => const _ProfileLoadingView(),
            error: (error, stackTrace) => _ProfileErrorView(
              onRetry: () {
                ref.invalidate(
                  currentEmployeeProfileProvider,
                );
              },
            ),
            data: (profile) => _ProfileContent(
              profile: profile,
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileContent extends StatelessWidget {
  const _ProfileContent({
    required this.profile,
  });

  final EmployeeProfileData profile;

  String get initials {
    final parts = profile.name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .toList();

    if (parts.isEmpty) {
      return '?';
    }

    return parts
        .map((part) => part.substring(0, 1))
        .join()
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        20,
        20,
        20,
        36,
      ),
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Zurück',
              onPressed: () {
                Navigator.of(context).pop();
              },
              icon: const Icon(
                Icons.arrow_back_rounded,
              ),
              style: IconButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF344054),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Profil',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: const Color(0xFF101828),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        DiperaCard(
          padding: const EdgeInsets.all(22),
          child: Column(
            children: [
              Container(
                width: 82,
                height: 82,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(26),
                ),
                alignment: Alignment.center,
                child: Text(
                  initials,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: const Color(0xFF2563EB),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                profile.name,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF101828),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                profile.businessName ?? 'Kein Betrieb hinterlegt',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF667085),
                ),
              ),
              const SizedBox(height: 14),
              _StatusBadge(
                label: profile.accountStatusLabel,
                isActive:
                    profile.accountStatus.toLowerCase() == 'active',
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        Text(
          'Persönliche Daten',
          style: theme.textTheme.titleMedium?.copyWith(
            color: const Color(0xFF344054),
            fontWeight: FontWeight.w800,
          ),
        ),

        const SizedBox(height: 12),

        DiperaCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            children: [
              _ProfileRow(
                icon: Icons.person_outline_rounded,
                label: 'Name',
                value: profile.name,
              ),
              const _ProfileDivider(),
              _ProfileRow(
                icon: Icons.email_outlined,
                label: 'E-Mail-Adresse',
                value: profile.email.isEmpty
                    ? 'Nicht hinterlegt'
                    : profile.email,
              ),
              const _ProfileDivider(),
              _ProfileRow(
                icon: Icons.badge_outlined,
                label: 'Rolle',
                value: profile.roleLabel,
              ),
              const _ProfileDivider(),
              _ProfileRow(
                icon: Icons.business_outlined,
                label: 'Betrieb',
                value:
                    profile.businessName ?? 'Nicht hinterlegt',
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        const _ProfileNotice(),
      ],
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: 4,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFF2F4F7),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              icon,
              size: 21,
              color: const Color(0xFF475467),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF667085),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: const Color(0xFF101828),
                    fontWeight: FontWeight.w700,
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

class _ProfileDivider extends StatelessWidget {
  const _ProfileDivider();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(
        vertical: 12,
      ),
      child: Divider(
        height: 1,
        color: Color(0xFFE2E8F0),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.isActive,
  });

  final String label;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: isActive
            ? const Color(0xFFECFDF3)
            : const Color(0xFFFEF3F2),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive
                  ? const Color(0xFF12B76A)
                  : const Color(0xFFD92D20),
            ),
          ),
          const SizedBox(width: 7),
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(
                  color: isActive
                      ? const Color(0xFF027A48)
                      : const Color(0xFFB42318),
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _ProfileNotice extends StatelessWidget {
  const _ProfileNotice();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.info_outline_rounded,
              color: Color(0xFF2563EB),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              'Änderungen an deinen persönlichen oder '
              'betrieblichen Daten werden derzeit durch deinen '
              'Arbeitgeber vorgenommen.',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(
                    color: const Color(0xFF667085),
                    height: 1.45,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileLoadingView extends StatelessWidget {
  const _ProfileLoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        20,
        20,
        20,
        36,
      ),
      children: [
        Text(
          'Profil',
          style: Theme.of(context)
              .textTheme
              .headlineSmall
              ?.copyWith(
                color: const Color(0xFF101828),
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 32),
        const Center(
          child: CircularProgressIndicator(),
        ),
      ],
    );
  }
}

class _ProfileErrorView extends StatelessWidget {
  const _ProfileErrorView({
    required this.onRetry,
  });

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        20,
        20,
        20,
        36,
      ),
      children: [
        const SizedBox(height: 80),
        const Icon(
          Icons.error_outline_rounded,
          size: 48,
          color: Color(0xFFD92D20),
        ),
        const SizedBox(height: 18),
        Text(
          'Profil konnte nicht geladen werden',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(
                color: const Color(0xFF101828),
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 16),
        Center(
          child: FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Erneut versuchen'),
          ),
        ),
      ],
    );
  }
}