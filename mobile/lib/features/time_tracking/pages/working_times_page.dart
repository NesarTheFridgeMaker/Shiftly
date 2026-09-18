import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/working_time_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../providers/pay_overview_provider.dart';
import '../providers/working_time_provider.dart';
import 'pay_overview_view.dart';

enum _OverviewMode {
  time,
  pay,
}

class WorkingTimesPage extends ConsumerStatefulWidget {
  const WorkingTimesPage({super.key});

  @override
  ConsumerState<WorkingTimesPage> createState() {
    return _WorkingTimesPageState();
  }
}

class _WorkingTimesPageState extends ConsumerState<WorkingTimesPage> {
  late DateTime _visibleMonth;

  _OverviewMode _mode = _OverviewMode.time;

  @override
  void initState() {
    super.initState();

    final now = DateTime.now();

    _visibleMonth = DateTime(
      now.year,
      now.month,
      1,
    );
  }

  String get _monthKey {
    return '${_visibleMonth.year}-'
        '${_visibleMonth.month.toString().padLeft(2, '0')}';
  }

  bool get _isCurrentMonth {
    final now = DateTime.now();

    return _visibleMonth.year == now.year &&
        _visibleMonth.month == now.month;
  }

  bool get _isFutureMonth {
    final now = DateTime.now();

    final currentMonth = DateTime(
      now.year,
      now.month,
      1,
    );

    return _visibleMonth.isAfter(currentMonth);
  }

  Future<void> _refresh() async {
    if (_mode == _OverviewMode.time) {
      ref.invalidate(
        workingTimeMonthProvider(_monthKey),
      );

      await ref.read(
        workingTimeMonthProvider(_monthKey).future,
      );

      return;
    }

    ref.invalidate(
      payOverviewMonthProvider(_monthKey),
    );

    await ref.read(
      payOverviewMonthProvider(_monthKey).future,
    );
  }

  void _changeMonth(int offset) {
    /*
     * Die Mitarbeiter-Payroll-RPC erlaubt bewusst
     * keine zukünftigen Payroll-Monate.
     */
    if (_mode == _OverviewMode.pay &&
        offset > 0 &&
        _isCurrentMonth) {
      return;
    }

    setState(() {
      _visibleMonth = DateTime(
        _visibleMonth.year,
        _visibleMonth.month + offset,
        1,
      );
    });
  }

  void _changeMode(_OverviewMode mode) {
    if (_mode == mode) {
      return;
    }

    setState(() {
      _mode = mode;

      /*
       * Falls der Nutzer in der Zeitansicht bereits
       * in einen zukünftigen Monat navigiert hat,
       * springen wir beim Wechsel auf Lohn auf den
       * aktuellen Monat zurück.
       */
      if (
          mode == _OverviewMode.pay &&
          _isFutureMonth
      ) {
        final now = DateTime.now();

        _visibleMonth = DateTime(
          now.year,
          now.month,
          1,
        );
      }
    });
  }

  String _monthLabel(DateTime date) {
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

    return '${months[date.month - 1]} ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final timeMonthAsync =
        _mode == _OverviewMode.time
            ? ref.watch(
                workingTimeMonthProvider(_monthKey),
              )
            : null;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics:
                const AlwaysScrollableScrollPhysics(),
            padding:
                const EdgeInsets.fromLTRB(
                  20,
                  20,
                  20,
                  36,
                ),
            children: [
              Text(
                'Arbeitsübersicht',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(
                      color:
                          const Color(0xFF101828),
                      fontWeight: FontWeight.w800,
                    ),
              ),

              const SizedBox(height: 6),

              Text(
                _mode == _OverviewMode.time
                    ? 'Deine tatsächlich erfassten Arbeitszeiten.'
                    : 'Deine Vergütung und Lohnbestandteile im Überblick.',
                style: Theme.of(context)
                    .textTheme
                    .bodyLarge
                    ?.copyWith(
                      color:
                          const Color(0xFF667085),
                    ),
              ),

              const SizedBox(height: 22),

              _ModeSelector(
                mode: _mode,
                onChanged: _changeMode,
              ),

              const SizedBox(height: 18),

              DiperaCard(
                padding:
                    const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      onPressed:
                          () => _changeMonth(-1),
                      icon: const Icon(
                        Icons.chevron_left_rounded,
                      ),
                    ),

                    Expanded(
                      child: Text(
                        _monthLabel(
                          _visibleMonth,
                        ),
                        textAlign:
                            TextAlign.center,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(
                              color:
                                  const Color(
                                    0xFF101828,
                                  ),
                              fontWeight:
                                  FontWeight.w800,
                            ),
                      ),
                    ),

                    IconButton(
                      onPressed:
                          _mode ==
                                      _OverviewMode
                                          .pay &&
                                  _isCurrentMonth
                              ? null
                              : () =>
                                  _changeMonth(1),
                      icon: const Icon(
                        Icons.chevron_right_rounded,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              if (_mode == _OverviewMode.time)
                _buildTimeContent(
                  timeMonthAsync!,
                )
              else
                PayOverviewView(
                  monthKey: _monthKey,
                  monthLabel: _monthLabel(
                    _visibleMonth,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimeContent(
    AsyncValue<WorkingTimeMonth> monthAsync,
  ) {
    return monthAsync.when(
      loading: () => const _InlineLoadingView(),

      error: (error, stackTrace) =>
          _InlineErrorView(
            title:
                'Arbeitszeiten konnten nicht geladen werden',
            onRetry: () {
              ref.invalidate(
                workingTimeMonthProvider(
                  _monthKey,
                ),
              );
            },
          ),

      data: (monthData) {
        return Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: _SummaryCard(
                    icon:
                        Icons.access_time_rounded,
                    label: 'Arbeitszeit',
                    value: _formatMinutes(
                      monthData
                          .totalWorkedMinutes,
                    ),
                    foregroundColor:
                        const Color(
                          0xFF027A48,
                        ),
                    backgroundColor:
                        const Color(
                          0xFFECFDF3,
                        ),
                  ),
                ),

                const SizedBox(width: 12),

                Expanded(
                  child: _SummaryCard(
                    icon:
                        Icons.coffee_rounded,
                    label: 'Pausen',
                    value: _formatMinutes(
                      monthData
                          .totalBreakMinutes,
                    ),
                    foregroundColor:
                        const Color(
                          0xFFB54708,
                        ),
                    backgroundColor:
                        const Color(
                          0xFFFFFAEB,
                        ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            Text(
              'Arbeitstage',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(
                    color:
                        const Color(0xFF344054),
                    fontWeight:
                        FontWeight.w800,
                  ),
            ),

            const SizedBox(height: 12),

            if (monthData.days.isEmpty)
              const _NoTimesView()
            else
              ...monthData.days.map(
                (day) => Padding(
                  padding:
                      const EdgeInsets.only(
                        bottom: 12,
                      ),
                  child:
                      _WorkingDayCard(
                    day: day,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ModeSelector extends StatelessWidget {
  const _ModeSelector({
    required this.mode,
    required this.onChanged,
  });

  final _OverviewMode mode;
  final ValueChanged<_OverviewMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFE9EEF4),
        borderRadius:
            BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: _ModeButton(
              label: 'Zeiten',
              icon:
                  Icons.access_time_rounded,
              selected:
                  mode == _OverviewMode.time,
              onTap: () {
                onChanged(
                  _OverviewMode.time,
                );
              },
            ),
          ),

          const SizedBox(width: 4),

          Expanded(
            child: _ModeButton(
              label: 'Lohn',
              icon:
                  Icons.payments_outlined,
              selected:
                  mode == _OverviewMode.pay,
              onTap: () {
                onChanged(
                  _OverviewMode.pay,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius:
            BorderRadius.circular(12),
        child: AnimatedContainer(
          duration:
              const Duration(milliseconds: 180),
          padding:
              const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
          decoration: BoxDecoration(
            color: selected
                ? Colors.white
                : Colors.transparent,
            borderRadius:
                BorderRadius.circular(12),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color:
                          Color(0x120F172A),
                      blurRadius: 10,
                      offset:
                          Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment:
                MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 19,
                color: selected
                    ? const Color(
                        0xFF175CD3,
                      )
                    : const Color(
                        0xFF667085,
                      ),
              ),

              const SizedBox(width: 8),

              Text(
                label,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(
                      color: selected
                          ? const Color(
                              0xFF101828,
                            )
                          : const Color(
                              0xFF667085,
                            ),
                      fontWeight:
                          FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color foregroundColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius:
                  BorderRadius.circular(14),
            ),
            child: Icon(
              icon,
              color: foregroundColor,
            ),
          ),

          const SizedBox(height: 12),

          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(
                  color:
                      const Color(0xFF667085),
                  fontWeight:
                      FontWeight.w600,
                ),
          ),

          const SizedBox(height: 5),

          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(
                  color:
                      const Color(0xFF101828),
                  fontWeight:
                      FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _WorkingDayCard extends StatelessWidget {
  const _WorkingDayCard({
    required this.day,
  });

  final WorkingTimeDay day;

  @override
  Widget build(BuildContext context) {
    final firstCheckIn =
        day.firstCheckIn;

    final lastCheckOut =
        day.lastCheckOut;

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _formatDate(day.date),
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(
                        color:
                            const Color(
                              0xFF101828,
                            ),
                        fontWeight:
                            FontWeight.w800,
                      ),
                ),
              ),

              _StatusBadge(
                isComplete:
                    day.isComplete,
              ),
            ],
          ),

          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: _TimeDetail(
                  label: 'Beginn',
                  value:
                      firstCheckIn == null
                          ? '—'
                          : _formatTime(
                              firstCheckIn
                                  .createdAt,
                            ),
                ),
              ),

              Expanded(
                child: _TimeDetail(
                  label: 'Ende',
                  value:
                      lastCheckOut == null
                          ? '—'
                          : _formatTime(
                              lastCheckOut
                                  .createdAt,
                            ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          Container(
            padding:
                const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color:
                  const Color(0xFFF8FAFC),
              borderRadius:
                  BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _Metric(
                    icon:
                        Icons.timer_outlined,
                    label: 'Arbeitszeit',
                    value: _formatMinutes(
                      day.workedMinutes,
                    ),
                  ),
                ),

                Container(
                  width: 1,
                  height: 36,
                  color:
                      const Color(
                        0xFFE2E8F0,
                      ),
                ),

                Expanded(
                  child: _Metric(
                    icon:
                        Icons.coffee_outlined,
                    label: 'Pause',
                    value: _formatMinutes(
                      day.breakMinutes,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          ...day.entries.map(
            (entry) => Padding(
              padding:
                  const EdgeInsets.only(
                    bottom: 8,
                  ),
              child: _EntryLine(
                entry: entry,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeDetail extends StatelessWidget {
  const _TimeDetail({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(
                color:
                    const Color(0xFF667085),
              ),
        ),

        const SizedBox(height: 4),

        Text(
          value,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(
                color:
                    const Color(0xFF101828),
                fontWeight:
                    FontWeight.w800,
              ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(
          icon,
          size: 18,
          color:
              const Color(0xFF667085),
        ),

        const SizedBox(height: 5),

        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(
                color:
                    const Color(0xFF667085),
              ),
        ),

        const SizedBox(height: 3),

        Text(
          value,
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(
                color:
                    const Color(0xFF101828),
                fontWeight:
                    FontWeight.w700,
              ),
        ),
      ],
    );
  }
}

class _EntryLine extends StatelessWidget {
  const _EntryLine({
    required this.entry,
  });

  final WorkingTimeEntry entry;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          _actionIcon(entry.action),
          size: 18,
          color:
              _actionColor(entry.action),
        ),

        const SizedBox(width: 9),

        Expanded(
          child: Text(
            _actionLabel(entry.action),
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(
                  color:
                      const Color(
                        0xFF475467,
                      ),
                  fontWeight:
                      FontWeight.w600,
                ),
          ),
        ),

        Text(
          _formatTime(entry.createdAt),
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(
                color:
                    const Color(0xFF101828),
                fontWeight:
                    FontWeight.w700,
              ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.isComplete,
  });

  final bool isComplete;

  @override
  Widget build(BuildContext context) {
    final foreground =
        isComplete
            ? const Color(0xFF027A48)
            : const Color(0xFFB54708);

    final background =
        isComplete
            ? const Color(0xFFECFDF3)
            : const Color(0xFFFFFAEB);

    return Container(
      padding:
          const EdgeInsets.symmetric(
            horizontal: 9,
            vertical: 6,
          ),
      decoration: BoxDecoration(
        color: background,
        borderRadius:
            BorderRadius.circular(999),
      ),
      child: Text(
        isComplete
            ? 'Vollständig'
            : 'Offen',
        style: Theme.of(context)
            .textTheme
            .bodySmall
            ?.copyWith(
              color: foreground,
              fontWeight:
                  FontWeight.w700,
            ),
      ),
    );
  }
}

class _NoTimesView extends StatelessWidget {
  const _NoTimesView();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(
            Icons.access_time_rounded,
            size: 44,
            color:
                Color(0xFF98A2B3),
          ),

          const SizedBox(height: 14),

          Text(
            'Keine Arbeitszeiten',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(
                  color:
                      const Color(
                        0xFF101828,
                      ),
                  fontWeight:
                      FontWeight.w800,
                ),
          ),

          const SizedBox(height: 7),

          Text(
            'Für diesen Monat wurden noch keine '
            'Stempelungen erfasst.',
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(
                  color:
                      const Color(
                        0xFF667085,
                      ),
                ),
          ),
        ],
      ),
    );
  }
}

class _InlineLoadingView
    extends StatelessWidget {
  const _InlineLoadingView();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding:
          EdgeInsets.symmetric(vertical: 60),
      child: Center(
        child:
            CircularProgressIndicator(),
      ),
    );
  }
}

class _InlineErrorView
    extends StatelessWidget {
  const _InlineErrorView({
    required this.title,
    required this.onRetry,
  });

  final String title;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 46,
            color:
                Color(0xFFD92D20),
          ),

          const SizedBox(height: 16),

          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(
                  color:
                      const Color(
                        0xFF101828,
                      ),
                  fontWeight:
                      FontWeight.w800,
                ),
          ),

          const SizedBox(height: 16),

          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(
              Icons.refresh_rounded,
            ),
            label: const Text(
              'Erneut versuchen',
            ),
          ),
        ],
      ),
    );
  }
}

String _formatMinutes(
  int totalMinutes,
) {
  final hours =
      totalMinutes ~/ 60;

  final minutes =
      totalMinutes % 60;

  if (hours == 0) {
    return '$minutes Min.';
  }

  return '$hours Std. '
      '${minutes.toString().padLeft(2, '0')} Min.';
}

String _formatDate(DateTime date) {
  const weekdays = [
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag',
  ];

  return '${weekdays[date.weekday - 1]}, '
      '${date.day.toString().padLeft(2, '0')}.'
      '${date.month.toString().padLeft(2, '0')}.'
      '${date.year}';
}

String _formatTime(DateTime date) {
  return '${date.hour.toString().padLeft(2, '0')}:'
      '${date.minute.toString().padLeft(2, '0')}';
}

String _actionLabel(String action) {
  switch (action) {
    case 'check_in':
      return 'Eingestempelt';

    case 'break_start':
      return 'Pause gestartet';

    case 'break_end':
      return 'Pause beendet';

    case 'check_out':
      return 'Ausgestempelt';

    default:
      return action;
  }
}

IconData _actionIcon(String action) {
  switch (action) {
    case 'check_in':
      return Icons.login_rounded;

    case 'break_start':
      return Icons.coffee_rounded;

    case 'break_end':
      return Icons.play_arrow_rounded;

    case 'check_out':
      return Icons.logout_rounded;

    default:
      return Icons.schedule_rounded;
  }
}

Color _actionColor(String action) {
  switch (action) {
    case 'check_in':
      return const Color(0xFF027A48);

    case 'break_start':
      return const Color(0xFFB54708);

    case 'break_end':
      return const Color(0xFF175CD3);

    case 'check_out':
      return const Color(0xFF6941C6);

    default:
      return const Color(0xFF667085);
  }
}