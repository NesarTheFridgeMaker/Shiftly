import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/shift_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../auth/providers/auth_providers.dart';

class SchedulePage extends ConsumerStatefulWidget {
  const SchedulePage({super.key});

  @override
  ConsumerState<SchedulePage> createState() {
    return _SchedulePageState();
  }
}

class _SchedulePageState extends ConsumerState<SchedulePage> {
  late DateTime _visibleMonth;
  late DateTime _selectedDay;

  @override
  void initState() {
    super.initState();

    final now = DateTime.now();

    _visibleMonth = DateTime(now.year, now.month, 1);

    _selectedDay = DateTime(now.year, now.month, now.day);
  }

  String get _monthKey {
    final year = _visibleMonth.year.toString();
    final month = _visibleMonth.month.toString().padLeft(2, '0');

    return '$year-$month';
  }

  Future<void> _refresh() async {
    ref.invalidate(monthShiftsProvider(_monthKey));

    ref.invalidate(teamMonthShiftsProvider(_monthKey));

    await Future.wait([
      ref.read(monthShiftsProvider(_monthKey).future),
      ref.read(teamMonthShiftsProvider(_monthKey).future),
    ]);
  }

  void _changeMonth(int difference) {
    final nextMonth = DateTime(
      _visibleMonth.year,
      _visibleMonth.month + difference,
      1,
    );

    final now = DateTime.now();

    setState(() {
      _visibleMonth = nextMonth;

      if (nextMonth.year == now.year && nextMonth.month == now.month) {
        _selectedDay = DateTime(now.year, now.month, now.day);
      } else {
        _selectedDay = DateTime(nextMonth.year, nextMonth.month, 1);
      }
    });
  }

  void _selectDay(DateTime date) {
    setState(() {
      _selectedDay = DateTime(date.year, date.month, date.day);
    });
  }

  bool _isSameDay(DateTime first, DateTime second) {
    return first.year == second.year &&
        first.month == second.month &&
        first.day == second.day;
  }

  String _formatMonth(DateTime date) {
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

  String _formatSelectedDate(DateTime date) {
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

  List<EmployeeShift> _getShiftsForDay(
    List<EmployeeShift> shifts,
    DateTime day,
  ) {
    return shifts.where((shift) {
      return _isSameDay(shift.date, day);
    }).toList();
  }

  bool _hasShiftOnDay(List<EmployeeShift> shifts, DateTime day) {
    return shifts.any((shift) {
      return _isSameDay(shift.date, day);
    });
  }

  List<DateTime?> _buildCalendarDays() {
    final firstDay = DateTime(_visibleMonth.year, _visibleMonth.month, 1);

    final lastDay = DateTime(_visibleMonth.year, _visibleMonth.month + 1, 0);

    final leadingEmptyDays = firstDay.weekday - 1;

    final calendarDays = <DateTime?>[];

    for (var index = 0; index < leadingEmptyDays; index++) {
      calendarDays.add(null);
    }

    for (var day = 1; day <= lastDay.day; day++) {
      calendarDays.add(DateTime(_visibleMonth.year, _visibleMonth.month, day));
    }

    while (calendarDays.length % 7 != 0) {
      calendarDays.add(null);
    }

    return calendarDays;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final employeeAsync = ref.watch(currentEmployeeProvider);

    final ownShiftsAsync = ref.watch(monthShiftsProvider(_monthKey));

    final teamShiftsAsync = ref.watch(teamMonthShiftsProvider(_monthKey));

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 36),
            children: [
              Text(
                'Schichten',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: const Color(0xFF101828),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Dein persönlicher Dienstplan im Überblick.',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: const Color(0xFF667085),
                ),
              ),
              const SizedBox(height: 24),

              DiperaCard(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    Row(
                      children: [
                        _MonthNavigationButton(
                          icon: Icons.chevron_left_rounded,
                          tooltip: 'Vorheriger Monat',
                          onPressed: () => _changeMonth(-1),
                        ),
                        Expanded(
                          child: Text(
                            _formatMonth(_visibleMonth),
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleLarge?.copyWith(
                              color: const Color(0xFF101828),
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        _MonthNavigationButton(
                          icon: Icons.chevron_right_rounded,
                          tooltip: 'Nächster Monat',
                          onPressed: () => _changeMonth(1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    const Row(
                      children: [
                        _WeekdayLabel('Mo'),
                        _WeekdayLabel('Di'),
                        _WeekdayLabel('Mi'),
                        _WeekdayLabel('Do'),
                        _WeekdayLabel('Fr'),
                        _WeekdayLabel('Sa'),
                        _WeekdayLabel('So'),
                      ],
                    ),

                    const SizedBox(height: 8),

                    ownShiftsAsync.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.symmetric(vertical: 70),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (error, stackTrace) {
                        return _CalendarError(
                          onRetry: () {
                            ref.invalidate(monthShiftsProvider(_monthKey));
                          },
                        );
                      },
                      data: (shifts) {
                        final calendarDays = _buildCalendarDays();

                        return GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 7,
                                mainAxisSpacing: 6,
                                crossAxisSpacing: 6,
                                childAspectRatio: 0.78,
                              ),
                          itemCount: calendarDays.length,
                          itemBuilder: (context, index) {
                            final day = calendarDays[index];

                            if (day == null) {
                              return const SizedBox.shrink();
                            }

                            return _CalendarDay(
                              day: day,
                              isToday: _isSameDay(day, DateTime.now()),
                              isSelected: _isSameDay(day, _selectedDay),
                              hasShift: _hasShiftOnDay(shifts, day),
                              onTap: () => _selectDay(day),
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              employeeAsync.when(
                loading: () => const _ShiftListLoading(),
                error: (error, stackTrace) => _ShiftListError(
                  onRetry: () {
                    ref.invalidate(currentEmployeeProvider);
                  },
                ),
                data: (employee) {
                  return teamShiftsAsync.when(
                    loading: () => const _ShiftListLoading(),
                    error: (error, stackTrace) => _ShiftListError(
                      onRetry: () {
                        ref.invalidate(teamMonthShiftsProvider(_monthKey));
                      },
                    ),
                    data: (teamShifts) {
                      final selectedShifts = _getShiftsForDay(
                        teamShifts,
                        _selectedDay,
                      );

                      final sortedShifts = [...selectedShifts]
                        ..sort((first, second) {
                          final firstIsOwn = first.employeeId == employee.id;
                          final secondIsOwn = second.employeeId == employee.id;

                          if (firstIsOwn && !secondIsOwn) {
                            return -1;
                          }

                          if (!firstIsOwn && secondIsOwn) {
                            return 1;
                          }

                          final timeComparison = first.startsAt.compareTo(
                            second.startsAt,
                          );

                          if (timeComparison != 0) {
                            return timeComparison;
                          }

                          return first.employeeName.compareTo(
                            second.employeeName,
                          );
                        });

                      return _SelectedDayShifts(
                        formattedDate: _formatSelectedDate(_selectedDay),
                        shifts: sortedShifts,
                        currentEmployeeId: employee.id,
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MonthNavigationButton extends StatelessWidget {
  const _MonthNavigationButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      icon: Icon(icon),
      style: IconButton.styleFrom(
        backgroundColor: const Color(0xFFF2F4F7),
        foregroundColor: const Color(0xFF344054),
      ),
    );
  }
}

class _WeekdayLabel extends StatelessWidget {
  const _WeekdayLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: const Color(0xFF667085),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _CalendarDay extends StatelessWidget {
  const _CalendarDay({
    required this.day,
    required this.isToday,
    required this.isSelected,
    required this.hasShift,
    required this.onTap,
  });

  final DateTime day;
  final bool isToday;
  final bool isSelected;
  final bool hasShift;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final backgroundColor = isSelected
        ? const Color(0xFF2563EB)
        : isToday
        ? const Color(0xFFEFF6FF)
        : Colors.transparent;

    final foregroundColor = isSelected ? Colors.white : const Color(0xFF344054);

    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: isToday && !isSelected
                ? Border.all(color: const Color(0xFFBFDBFE))
                : null,
          ),
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${day.day}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: foregroundColor,
                  fontWeight: isSelected || isToday
                      ? FontWeight.w800
                      : FontWeight.w600,
                ),
              ),
              const SizedBox(height: 5),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: hasShift
                      ? isSelected
                            ? Colors.white
                            : const Color(0xFF2563EB)
                      : Colors.transparent,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SelectedDayShifts extends StatelessWidget {
  const _SelectedDayShifts({
    required this.formattedDate,
    required this.shifts,
    required this.currentEmployeeId,
  });

  final String formattedDate;
  final List<EmployeeShift> shifts;
  final String currentEmployeeId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final ownShifts = shifts
        .where((shift) => shift.employeeId == currentEmployeeId)
        .toList();

    final colleagueShifts = shifts
        .where((shift) => shift.employeeId != currentEmployeeId)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          formattedDate,
          style: theme.textTheme.titleMedium?.copyWith(
            color: const Color(0xFF344054),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 12),

        if (shifts.isEmpty)
          const _NoShiftsCard()
        else ...[
          if (ownShifts.isNotEmpty) ...[
            const _ShiftSectionTitle(title: 'Deine Schicht'),
            const SizedBox(height: 10),

            for (var index = 0; index < ownShifts.length; index++) ...[
              _TeamShiftCard(shift: ownShifts[index], isCurrentEmployee: true),
              if (index < ownShifts.length - 1) const SizedBox(height: 10),
            ],

            if (colleagueShifts.isNotEmpty) const SizedBox(height: 20),
          ],

          if (colleagueShifts.isNotEmpty) ...[
            _ShiftSectionTitle(
              title: ownShifts.isEmpty
                  ? 'Eingeteilte Mitarbeiter'
                  : 'Weitere Mitarbeiter',
            ),
            const SizedBox(height: 10),

            for (var index = 0; index < colleagueShifts.length; index++) ...[
              _TeamShiftCard(
                shift: colleagueShifts[index],
                isCurrentEmployee: false,
              ),
              if (index < colleagueShifts.length - 1)
                const SizedBox(height: 10),
            ],
          ],
        ],
      ],
    );
  }
}

class _ShiftSectionTitle extends StatelessWidget {
  const _ShiftSectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
        color: const Color(0xFF667085),
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _TeamShiftCard extends StatelessWidget {
  const _TeamShiftCard({required this.shift, required this.isCurrentEmployee});

  final EmployeeShift shift;
  final bool isCurrentEmployee;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workType = shift.workTypeName?.trim();

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isCurrentEmployee
                  ? const Color(0xFFDBEAFE)
                  : const Color(0xFFF2F4F7),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(
              isCurrentEmployee
                  ? Icons.person_rounded
                  : Icons.person_outline_rounded,
              color: isCurrentEmployee
                  ? const Color(0xFF2563EB)
                  : const Color(0xFF667085),
            ),
          ),
          const SizedBox(width: 15),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        isCurrentEmployee ? 'Du' : shift.employeeName,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: const Color(0xFF101828),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),

                    if (isCurrentEmployee) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          'Eigene Schicht',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF2563EB),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),

                const SizedBox(height: 5),

                Text(
                  shift.formattedTime,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: const Color(0xFF344054),
                    fontWeight: FontWeight.w700,
                  ),
                ),

                if (workType != null && workType.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    workType,
                    style: theme.textTheme.bodyMedium?.copyWith(
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

class _NoShiftsCard extends StatelessWidget {
  const _NoShiftsCard();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(22),
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFFFFFAEB),
              borderRadius: BorderRadius.circular(17),
            ),
            child: const Icon(
              Icons.event_available_rounded,
              color: Color(0xFFB54708),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Keine Schicht geplant',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Für diesen Tag wurde keine Schicht eingetragen.',
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

class _CalendarError extends StatelessWidget {
  const _CalendarError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 45),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFD92D20),
            size: 34,
          ),
          const SizedBox(height: 12),
          Text(
            'Kalender konnte nicht geladen werden.',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF667085)),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Erneut versuchen'),
          ),
        ],
      ),
    );
  }
}

class _ShiftListLoading extends StatelessWidget {
  const _ShiftListLoading();

  @override
  Widget build(BuildContext context) {
    return const DiperaCard(
      padding: EdgeInsets.all(24),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

class _ShiftListError extends StatelessWidget {
  const _ShiftListError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(22),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFD92D20),
            size: 34,
          ),
          const SizedBox(height: 12),
          Text(
            'Die Schichten konnten nicht geladen werden.',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF667085)),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Erneut versuchen'),
          ),
        ],
      ),
    );
  }
}
