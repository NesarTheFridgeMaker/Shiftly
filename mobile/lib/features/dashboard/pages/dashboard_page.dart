import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/employee_service.dart';
import '../../../core/services/shift_service.dart';
import '../../../shared/widgets/dipera_button.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../auth/providers/auth_providers.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  Future<void> _logout() async {
    await Supabase.instance.client.auth.signOut();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;

    if (hour < 11) {
      return 'Guten Morgen';
    }

    if (hour < 18) {
      return 'Guten Tag';
    }

    return 'Guten Abend';
  }

  String _getFormattedDate() {
    const weekdays = [
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
      'Sonntag',
    ];

    const months = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];

    final now = DateTime.now();

    return '${weekdays[now.weekday - 1]}, '
        '${now.day}. ${months[now.month - 1]}';
  }

  Future<void> _refreshDashboard(WidgetRef ref) async {
    ref.invalidate(currentEmployeeProvider);
    ref.invalidate(todayShiftsProvider);
    ref.invalidate(nextShiftProvider);

    await Future.wait([
      ref.read(currentEmployeeProvider.future),
      ref.read(todayShiftsProvider.future),
      ref.read(nextShiftProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final employeeAsync = ref.watch(currentEmployeeProvider);
    final todayShiftsAsync = ref.watch(todayShiftsProvider);
    final nextShiftAsync = ref.watch(nextShiftProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refreshDashboard(ref),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 36),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              employeeAsync.when(
                                loading: () => Text(
                                  '${_getGreeting()} 👋',
                                  style: theme.textTheme.headlineSmall
                                      ?.copyWith(
                                        color: const Color(0xFF101828),
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                error: (error, stackTrace) => Text(
                                  '${_getGreeting()} 👋',
                                  style: theme.textTheme.headlineSmall
                                      ?.copyWith(
                                        color: const Color(0xFF101828),
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                data: (employee) {
                                  final firstName = employee.name
                                      .trim()
                                      .split(' ')
                                      .first;

                                  return Text(
                                    '${_getGreeting()}, $firstName 👋',
                                    style: theme.textTheme.headlineSmall
                                        ?.copyWith(
                                          color: const Color(0xFF101828),
                                          fontWeight: FontWeight.w800,
                                        ),
                                  );
                                },
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _getFormattedDate(),
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  color: const Color(0xFF667085),
                                ),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuButton<String>(
                          tooltip: 'Menü',
                          icon: const Icon(
                            Icons.account_circle_outlined,
                            size: 32,
                            color: Color(0xFF475467),
                          ),
                          onSelected: (value) {
                            if (value == 'logout') {
                              _logout();
                            }
                          },
                          itemBuilder: (context) {
                            return const [
                              PopupMenuItem(
                                value: 'profile',
                                child: Row(
                                  children: [
                                    Icon(Icons.person_outline_rounded),
                                    SizedBox(width: 12),
                                    Text('Profil'),
                                  ],
                                ),
                              ),
                              PopupMenuItem(
                                value: 'logout',
                                child: Row(
                                  children: [
                                    Icon(Icons.logout_rounded),
                                    SizedBox(width: 12),
                                    Text('Abmelden'),
                                  ],
                                ),
                              ),
                            ];
                          },
                        ),
                      ],
                    ),

                    const SizedBox(height: 28),

                    employeeAsync.when(
                      loading: () => const _TodayCard(
                        status: EmployeeStatus.unknown,
                        shifts: [],
                        isLoadingShifts: true,
                        hasShiftError: false,
                        onClockIn: null,
                      ),
                      error: (error, stackTrace) => const _TodayCard(
                        status: EmployeeStatus.unknown,
                        shifts: [],
                        isLoadingShifts: false,
                        hasShiftError: true,
                        onClockIn: null,
                      ),
                      data: (employee) {
                        return todayShiftsAsync.when(
                          loading: () => _TodayCard(
                            status: employee.status,
                            shifts: const [],
                            isLoadingShifts: true,
                            hasShiftError: false,
                            onClockIn: null,
                          ),
                          error: (error, stackTrace) => _TodayCard(
                            status: employee.status,
                            shifts: const [],
                            isLoadingShifts: false,
                            hasShiftError: true,
                            onClockIn: () {
                              ref.invalidate(todayShiftsProvider);
                            },
                          ),
                          data: (shifts) => _TodayCard(
                            status: employee.status,
                            shifts: shifts,
                            isLoadingShifts: false,
                            hasShiftError: false,
                            onClockIn: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Die Zeiterfassung verbinden wir später.',
                                  ),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 18),

                    const _SectionTitle(title: 'Dein Überblick'),

                    const SizedBox(height: 12),

                    nextShiftAsync.when(
                      loading: () => const _NextShiftCard(
                        shift: null,
                        isLoading: true,
                        hasError: false,
                      ),
                      error: (error, stackTrace) => const _NextShiftCard(
                        shift: null,
                        isLoading: false,
                        hasError: true,
                      ),
                      data: (shift) => _NextShiftCard(
                        shift: shift,
                        isLoading: false,
                        hasError: false,
                      ),
                    ),

                    const SizedBox(height: 14),

                    const Row(
                      children: [
                        Expanded(child: _BalanceCard()),
                        SizedBox(width: 14),
                        Expanded(child: _VacationCard()),
                      ],
                    ),

                    const SizedBox(height: 18),

                    DiperaCard(
                      title: 'Dokumente',
                      subtitle: 'Neue Dokumente und Lohnabrechnungen',
                      leading: const _FeatureIcon(
                        icon: Icons.description_outlined,
                        foregroundColor: Color(0xFF6941C6),
                        backgroundColor: Color(0xFFF4EBFF),
                      ),
                      trailing: const Icon(
                        Icons.chevron_right_rounded,
                        color: Color(0xFF98A2B3),
                      ),
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Die Dokumentenansicht folgt später.',
                            ),
                          ),
                        );
                      },
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TodayCard extends StatelessWidget {
  const _TodayCard({
    required this.status,
    required this.shifts,
    required this.isLoadingShifts,
    required this.hasShiftError,
    required this.onClockIn,
  });

  final EmployeeStatus status;
  final List<EmployeeShift> shifts;
  final bool isLoadingShifts;
  final bool hasShiftError;
  final VoidCallback? onClockIn;

  String get statusText {
    switch (status) {
      case EmployeeStatus.checkedIn:
        return 'Eingestempelt';
      case EmployeeStatus.checkedOut:
        return 'Nicht eingestempelt';
      case EmployeeStatus.onBreak:
        return 'Pause';
      case EmployeeStatus.unknown:
        return 'Status wird geladen';
    }
  }

  String get buttonText {
    if (hasShiftError) {
      return 'Erneut versuchen';
    }

    switch (status) {
      case EmployeeStatus.checkedIn:
        return 'Zeiterfassung öffnen';
      case EmployeeStatus.checkedOut:
        return 'Einstempeln';
      case EmployeeStatus.onBreak:
        return 'Pause beenden';
      case EmployeeStatus.unknown:
        return 'Wird geladen';
    }
  }

  IconData get buttonIcon {
    if (hasShiftError) {
      return Icons.refresh_rounded;
    }

    switch (status) {
      case EmployeeStatus.checkedIn:
        return Icons.schedule_rounded;
      case EmployeeStatus.checkedOut:
        return Icons.login_rounded;
      case EmployeeStatus.onBreak:
        return Icons.play_arrow_rounded;
      case EmployeeStatus.unknown:
        return Icons.hourglass_empty_rounded;
    }
  }

  Widget _buildShiftInformation(BuildContext context) {
    final theme = Theme.of(context);

    if (isLoadingShifts) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Schicht wird geladen …',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Deine geplante Arbeitszeit wird abgerufen.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.78),
            ),
          ),
        ],
      );
    }

    if (hasShiftError) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Schichten konnten nicht geladen werden',
            style: theme.textTheme.titleLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Ziehe die Seite nach unten oder versuche es erneut.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.78),
            ),
          ),
        ],
      );
    }

    if (shifts.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Heute keine Schicht geplant',
            style: theme.textTheme.titleLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Für heute wurde keine Arbeitszeit eingetragen.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.78),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < shifts.length; index++) ...[
          Text(
            shifts[index].formattedTime,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (index < shifts.length - 1) const SizedBox(height: 6),
        ],
        const SizedBox(height: 7),
        Text(
          shifts.length == 1
              ? 'Deine geplante Arbeitszeit'
              : '${shifts.length} Schichten für heute',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: Colors.white.withValues(alpha: 0.78),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: EdgeInsets.zero,
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF173FCE), Color(0xFF2F62F5)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.schedule_rounded,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    'Heute',
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    statusText,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildShiftInformation(context),
            const SizedBox(height: 24),
            DiperaButton(
              text: buttonText,
              icon: Icon(buttonIcon),
              onPressed: onClockIn,
            ),
          ],
        ),
      ),
    );
  }
}

class _NextShiftCard extends StatelessWidget {
  const _NextShiftCard({
    required this.shift,
    required this.isLoading,
    required this.hasError,
  });

  final EmployeeShift? shift;
  final bool isLoading;
  final bool hasError;

  String _formatShiftDate(DateTime date) {
    final now = DateTime.now();

    final today = DateTime(now.year, now.month, now.day);

    final shiftDay = DateTime(date.year, date.month, date.day);

    final difference = shiftDay.difference(today).inDays;

    if (difference == 0) {
      return 'Heute';
    }

    if (difference == 1) {
      return 'Morgen';
    }

    const weekdays = [
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
      'Sonntag',
    ];

    const months = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];

    return '${weekdays[date.weekday - 1]}, '
        '${date.day}. ${months[date.month - 1]}';
  }

  String get subtitle {
    if (isLoading) {
      return 'Wird geladen …';
    }

    if (hasError) {
      return 'Konnte nicht geladen werden';
    }

    if (shift == null) {
      return 'Keine kommende Schicht geplant';
    }

    return '${_formatShiftDate(shift!.date)} · ${shift!.formattedTime}';
  }

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      title: 'Nächste Schicht',
      subtitle: subtitle,
      leading: const _FeatureIcon(
        icon: Icons.calendar_month_outlined,
        foregroundColor: Color(0xFF175CD3),
        backgroundColor: Color(0xFFEFF8FF),
      ),
      trailing: hasError
          ? const Icon(Icons.error_outline_rounded, color: Color(0xFFD92D20))
          : const Icon(Icons.chevron_right_rounded, color: Color(0xFF98A2B3)),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _FeatureIcon(
            icon: Icons.timelapse_rounded,
            foregroundColor: Color(0xFF027A48),
            backgroundColor: Color(0xFFECFDF3),
          ),
          const SizedBox(height: 18),
          Text(
            '+4:15 h',
            style: theme.textTheme.titleLarge?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Stundenkonto',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF667085),
            ),
          ),
        ],
      ),
    );
  }
}

class _VacationCard extends StatelessWidget {
  const _VacationCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _FeatureIcon(
            icon: Icons.beach_access_outlined,
            foregroundColor: Color(0xFFB54708),
            backgroundColor: Color(0xFFFFFAEB),
          ),
          const SizedBox(height: 18),
          Text(
            '21 Tage',
            style: theme.textTheme.titleLarge?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Urlaub verfügbar',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF667085),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureIcon extends StatelessWidget {
  const _FeatureIcon({
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Icon(icon, color: foregroundColor, size: 25),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        color: const Color(0xFF344054),
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
