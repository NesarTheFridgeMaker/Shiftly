import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/absence_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../auth/providers/auth_providers.dart';
import '../../dashboard/providers/vacation_balance_providers.dart';
import 'vacation_request_page.dart';

class AbsencesPage extends ConsumerStatefulWidget {
  const AbsencesPage({super.key});

  @override
  ConsumerState<AbsencesPage> createState() =>
      _AbsencesPageState();
}

class _AbsencesPageState extends ConsumerState<AbsencesPage> {
  bool _showAllHistory = false;

  Future<void> _refresh() async {
    ref.invalidate(employeeAbsencesProvider);
    ref.invalidate(currentVacationBalanceProvider);

    await Future.wait([
      ref.read(employeeAbsencesProvider.future),
      ref.read(currentVacationBalanceProvider.future),
    ]);
  }

  Future<void> _openVacationRequest() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => const VacationRequestPage(),
      ),
    );

    if (created == true && mounted) {
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final absencesAsync = ref.watch(employeeAbsencesProvider);
    final vacationBalanceAsync =
        ref.watch(currentVacationBalanceProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: absencesAsync.when(
            loading: () => const _LoadingView(),
            error: (error, stackTrace) => _ErrorView(
              onRetry: () {
                ref.invalidate(employeeAbsencesProvider);
                ref.invalidate(currentVacationBalanceProvider);
              },
            ),
            data: (absences) => _AbsencesContent(
              absences: absences,
              vacationBalanceAsync: vacationBalanceAsync,
              showAllHistory: _showAllHistory,
              onToggleHistory: () {
                setState(() {
                  _showAllHistory = !_showAllHistory;
                });
              },
              onRequestVacation: _openVacationRequest,
            ),
          ),
        ),
      ),
    );
  }
}

class _AbsencesContent extends StatelessWidget {
  const _AbsencesContent({
    required this.absences,
    required this.vacationBalanceAsync,
    required this.showAllHistory,
    required this.onToggleHistory,
    required this.onRequestVacation,
  });

  final List<EmployeeAbsence> absences;
  final AsyncValue<VacationBalance> vacationBalanceAsync;
  final bool showAllHistory;
  final VoidCallback onToggleHistory;
  final VoidCallback onRequestVacation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final today = DateTime.now();
    final todayDate = DateTime(
      today.year,
      today.month,
      today.day,
    );

    final current = absences.where((absence) {
      if (absence.status == AbsenceStatus.pending) {
        return true;
      }

      if (absence.status == AbsenceStatus.approved) {
        final endDate = DateTime(
          absence.endDate.year,
          absence.endDate.month,
          absence.endDate.day,
        );

        return !endDate.isBefore(todayDate);
      }

      return false;
    }).toList();

    final history = absences
        .where((absence) => !current.contains(absence))
        .toList();

    final visibleHistory =
        showAllHistory ? history : history.take(5).toList();

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
          'Urlaubskonto, aktuelle Anträge und deine bisherigen Abwesenheiten.',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: const Color(0xFF667085),
          ),
        ),
        const SizedBox(height: 24),
        _VacationBalanceCard(
          balanceAsync: vacationBalanceAsync,
          onRequestVacation: onRequestVacation,
        ),
        const SizedBox(height: 28),
        Text(
          'Aktuell',
          style: theme.textTheme.titleMedium?.copyWith(
            color: const Color(0xFF344054),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 12),
        if (current.isEmpty)
          const _CompactEmptyCard(
            text:
                'Aktuell gibt es keine offenen oder bevorstehenden Abwesenheiten.',
          )
        else
          ...current.asMap().entries.map((entry) {
            final index = entry.key;
            final absence = entry.value;

            return Padding(
              padding: EdgeInsets.only(
                bottom: index < current.length - 1 ? 12 : 0,
              ),
              child: _AbsenceCard(absence: absence),
            );
          }),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(
              child: Text(
                'Verlauf',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: const Color(0xFF344054),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            if (history.length > 5)
              TextButton(
                onPressed: onToggleHistory,
                child: Text(
                  showAllHistory
                      ? 'Weniger anzeigen'
                      : 'Alle anzeigen',
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (history.isEmpty)
          const _CompactEmptyCard(
            text: 'Noch keine vergangenen Abwesenheiten vorhanden.',
          )
        else
          ...visibleHistory.asMap().entries.map((entry) {
            final index = entry.key;
            final absence = entry.value;

            return Padding(
              padding: EdgeInsets.only(
                bottom: index < visibleHistory.length - 1 ? 12 : 0,
              ),
              child: _AbsenceCard(absence: absence),
            );
          }),
      ],
    );
  }
}

class _VacationBalanceCard extends StatelessWidget {
  const _VacationBalanceCard({
    required this.balanceAsync,
    required this.onRequestVacation,
  });

  final AsyncValue<VacationBalance> balanceAsync;
  final VoidCallback onRequestVacation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: const EdgeInsets.all(20),
      child: balanceAsync.when(
        loading: () => const SizedBox(
          height: 150,
          child: Center(
            child: CircularProgressIndicator(),
          ),
        ),
        error: (error, stackTrace) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Urlaubskonto nicht verfügbar',
              style: theme.textTheme.titleMedium?.copyWith(
                color: const Color(0xFF101828),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Ziehe die Seite nach unten, um es erneut zu laden.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF667085),
              ),
            ),
          ],
        ),
        data: (balance) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFAEB),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.beach_access_rounded,
                    color: Color(0xFFB54708),
                    size: 26,
                  ),
                ),
                const SizedBox(width: 15),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${balance.availableVacationDays} Tage verfügbar',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: const Color(0xFF101828),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Urlaubsjahr ${balance.vacationYear}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF667085),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _BalanceChip(
                  label:
                      '${balance.annualEntitlementDays} Tage Anspruch',
                ),
                _BalanceChip(
                  label:
                      '${balance.approvedVacationDays} genehmigt',
                ),
                _BalanceChip(
                  label:
                      '${balance.pendingVacationDays} offen',
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onRequestVacation,
                icon: const Icon(
                  Icons.add_circle_outline_rounded,
                ),
                label: const Text('Urlaub beantragen'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceChip extends StatelessWidget {
  const _BalanceChip({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 11,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F4F7),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: const Color(0xFF475467),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _CompactEmptyCard extends StatelessWidget {
  const _CompactEmptyCard({
    required this.text,
  });

  final String text;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          const Icon(
            Icons.event_available_rounded,
            color: Color(0xFF98A2B3),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF667085),
              ),
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
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: style.backgroundColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              style.icon,
              color: style.foregroundColor,
              size: 23,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        absence.typeLabel,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: const Color(0xFF101828),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusBadge(absence: absence),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  dateRange,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF344054),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (absence.note != null &&
                    absence.note!.trim().isNotEmpty) ...[
                  const SizedBox(height: 7),
                  Text(
                    absence.note!.trim(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF667085),
                    ),
                  ),
                ],
              ],
            ),
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
        break;

      case AbsenceStatus.approved:
        foregroundColor = const Color(0xFF027A48);
        backgroundColor = const Color(0xFFECFDF3);
        break;

      case AbsenceStatus.rejected:
        foregroundColor = const Color(0xFFB42318);
        backgroundColor = const Color(0xFFFEF3F2);
        break;

      case AbsenceStatus.unknown:
        foregroundColor = const Color(0xFF475467);
        backgroundColor = const Color(0xFFF2F4F7);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 9,
        vertical: 5,
      ),
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
  const _ErrorView({
    required this.onRetry,
  });

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
