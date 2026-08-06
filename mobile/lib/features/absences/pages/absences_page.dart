import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/absence_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../auth/providers/auth_providers.dart';

class AbsencesPage extends ConsumerWidget {
  const AbsencesPage({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(employeeAbsencesProvider);

    await ref.read(employeeAbsencesProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final absencesAsync = ref.watch(employeeAbsencesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refresh(ref),
          child: absencesAsync.when(
            loading: () => const _LoadingView(),
            error: (error, stackTrace) => _ErrorView(
              onRetry: () {
                ref.invalidate(employeeAbsencesProvider);
              },
            ),
            data: (absences) => _AbsencesContent(absences: absences),
          ),
        ),
      ),
    );
  }
}

class _AbsencesContent extends StatelessWidget {
  const _AbsencesContent({required this.absences});

  final List<EmployeeAbsence> absences;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final pendingCount = absences
        .where((absence) => absence.status == AbsenceStatus.pending)
        .length;

    final approvedCount = absences
        .where((absence) => absence.status == AbsenceStatus.approved)
        .length;

    final rejectedCount = absences
        .where((absence) => absence.status == AbsenceStatus.rejected)
        .length;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Zurück',
              onPressed: () {
                Navigator.of(context).pop();
              },
              icon: const Icon(Icons.arrow_back_rounded),
              style: IconButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF344054),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Abwesenheiten',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: const Color(0xFF101828),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 8),

        Text(
          'Deine Urlaubs-, Krankheits- und weiteren Abwesenheitseinträge.',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: const Color(0xFF667085),
          ),
        ),

        const SizedBox(height: 24),

        Row(
          children: [
            Expanded(
              child: _StatusStatisticCard(
                label: 'Ausstehend',
                value: pendingCount,
                icon: Icons.schedule_rounded,
                foregroundColor: const Color(0xFFB54708),
                backgroundColor: const Color(0xFFFFFAEB),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatusStatisticCard(
                label: 'Genehmigt',
                value: approvedCount,
                icon: Icons.check_circle_outline_rounded,
                foregroundColor: const Color(0xFF027A48),
                backgroundColor: const Color(0xFFECFDF3),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatusStatisticCard(
                label: 'Abgelehnt',
                value: rejectedCount,
                icon: Icons.cancel_outlined,
                foregroundColor: const Color(0xFFB42318),
                backgroundColor: const Color(0xFFFEF3F2),
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),

        Text(
          'Meine Einträge',
          style: theme.textTheme.titleMedium?.copyWith(
            color: const Color(0xFF344054),
            fontWeight: FontWeight.w800,
          ),
        ),

        const SizedBox(height: 12),

        if (absences.isEmpty)
          const _NoAbsencesView()
        else
          ...absences.asMap().entries.map((entry) {
            final index = entry.key;
            final absence = entry.value;

            return Padding(
              padding: EdgeInsets.only(
                bottom: index < absences.length - 1 ? 12 : 0,
              ),
              child: _AbsenceCard(absence: absence),
            );
          }),

        const SizedBox(height: 20),

        const _NoticeCard(),
      ],
    );
  }
}

class _StatusStatisticCard extends StatelessWidget {
  const _StatusStatisticCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final String label;
  final int value;
  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, size: 20, color: foregroundColor),
          ),
          const SizedBox(height: 12),
          Text(
            '$value',
            style: theme.textTheme.titleLarge?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF667085),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _AbsenceCard extends StatelessWidget {
  const _AbsenceCard({required this.absence});

  final EmployeeAbsence absence;

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');

    return '$day.$month.${date.year}';
  }

  String get dateRange {
    final start = _formatDate(absence.startDate);
    final end = _formatDate(absence.endDate);

    return start == end ? start : '$start – $end';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = _absenceStyle(absence);

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: style.backgroundColor,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(style.icon, color: style.foregroundColor, size: 25),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      absence.typeLabel,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: const Color(0xFF101828),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      dateRange,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: const Color(0xFF344054),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _StatusBadge(absence: absence),
            ],
          ),

          if (absence.note != null && absence.note!.trim().isNotEmpty) ...[
            const SizedBox(height: 15),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                absence.note!.trim(),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF667085),
                  height: 1.45,
                ),
              ),
            ),
          ],

          const SizedBox(height: 15),

          Row(
            children: [
              const Icon(
                Icons.history_rounded,
                size: 17,
                color: Color(0xFF98A2B3),
              ),
              const SizedBox(width: 7),
              Text(
                'Erstellt am ${_formatDate(absence.createdAt)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF667085),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.absence});

  final EmployeeAbsence absence;

  @override
  Widget build(BuildContext context) {
    late Color foregroundColor;
    late Color backgroundColor;

    switch (absence.status) {
      case AbsenceStatus.pending:
        foregroundColor = const Color(0xFFB54708);
        backgroundColor = const Color(0xFFFFFAEB);

      case AbsenceStatus.approved:
        foregroundColor = const Color(0xFF027A48);
        backgroundColor = const Color(0xFFECFDF3);

      case AbsenceStatus.rejected:
        foregroundColor = const Color(0xFFB42318);
        backgroundColor = const Color(0xFFFEF3F2);

      case AbsenceStatus.unknown:
        foregroundColor = const Color(0xFF475467);
        backgroundColor = const Color(0xFFF2F4F7);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        absence.statusLabel,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: foregroundColor,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _NoAbsencesView extends StatelessWidget {
  const _NoAbsencesView();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFFFFFAEB),
              borderRadius: BorderRadius.circular(19),
            ),
            child: const Icon(
              Icons.event_available_rounded,
              color: Color(0xFFB54708),
              size: 28,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Keine Abwesenheiten',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Derzeit sind für dich keine Abwesenheitseinträge vorhanden.',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF667085)),
          ),
        ],
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard();

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
              'Neue Anträge können derzeit noch nicht über die App '
              'gestellt werden. Diese Funktion wird später zusammen '
              'mit der vollständigen Urlaubslogik ergänzt.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
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

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      children: [
        Text(
          'Abwesenheiten',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: const Color(0xFF101828),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 32),
        const Center(child: CircularProgressIndicator()),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
      children: [
        const SizedBox(height: 80),
        const Icon(
          Icons.error_outline_rounded,
          size: 48,
          color: Color(0xFFD92D20),
        ),
        const SizedBox(height: 18),
        Text(
          'Abwesenheiten konnten nicht geladen werden',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
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

class _AbsenceStyle {
  const _AbsenceStyle({
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;
}

_AbsenceStyle _absenceStyle(EmployeeAbsence absence) {
  switch (absence.type.toLowerCase()) {
    case 'vacation':
    case 'urlaub':
      return const _AbsenceStyle(
        icon: Icons.beach_access_rounded,
        foregroundColor: Color(0xFFB54708),
        backgroundColor: Color(0xFFFFFAEB),
      );

    case 'sick':
    case 'sickness':
    case 'krankheit':
      return const _AbsenceStyle(
        icon: Icons.medical_services_outlined,
        foregroundColor: Color(0xFFB42318),
        backgroundColor: Color(0xFFFEF3F2),
      );

    case 'training':
    case 'fortbildung':
      return const _AbsenceStyle(
        icon: Icons.school_outlined,
        foregroundColor: Color(0xFF175CD3),
        backgroundColor: Color(0xFFEFF8FF),
      );

    default:
      return const _AbsenceStyle(
        icon: Icons.event_busy_outlined,
        foregroundColor: Color(0xFF6941C6),
        backgroundColor: Color(0xFFF4EBFF),
      );
  }
}
