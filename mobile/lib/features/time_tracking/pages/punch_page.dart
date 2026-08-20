import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/clock_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../providers/clock_provider.dart';

class PunchPage extends ConsumerStatefulWidget {
  const PunchPage({super.key});

  @override
  ConsumerState<PunchPage> createState() => _PunchPageState();
}

class _PunchPageState extends ConsumerState<PunchPage> {
  late DateTime _now;
  DateTime? _businessClockBase;
  Stopwatch? _businessClockStopwatch;
  Timer? _clockTimer;
  Timer? _successTimer;

  ClockAction? _visibleSuccessAction;

  @override
  void initState() {
    super.initState();

    _now = DateTime.utc(2000, 1, 1);

    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;

      final base = _businessClockBase;
      final stopwatch = _businessClockStopwatch;

      if (base == null || stopwatch == null) {
        return;
      }

      setState(() {
        _now = base.add(stopwatch.elapsed);
      });
    });
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _businessClockStopwatch?.stop();
    _successTimer?.cancel();
    super.dispose();
  }

  void _showSuccessAnimation(ClockAction action) {
    _successTimer?.cancel();

    setState(() {
      _visibleSuccessAction = action;
    });

    _successTimer = Timer(const Duration(milliseconds: 1500), () {
      if (!mounted) return;

      setState(() {
        _visibleSuccessAction = null;
      });

      ref.read(clockControllerProvider.notifier).clearFeedback();
    });
  }

  Future<void> _refresh() async {
    await ref.read(clockControllerProvider.notifier).load();
  }

  void _syncBusinessClock(String businessLocalNow) {
    final parsed = _parseBusinessWallClock(businessLocalNow);

    _businessClockStopwatch?.stop();

    _businessClockBase = parsed;
    _businessClockStopwatch = Stopwatch()..start();
    _now = parsed;
  }

  String _formatCurrentTime(DateTime date) {
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');
    final second = date.second.toString().padLeft(2, '0');

    return '$hour:$minute:$second';
  }

  String _formatCurrentDate(DateTime date) {
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

  @override
  Widget build(BuildContext context) {
    final clockState = ref.watch(clockControllerProvider);

    ref.listen<ClockState>(clockControllerProvider, (previous, next) {
      final nextData = next.data;

      if (nextData != null &&
          previous?.data?.businessLocalNow != nextData.businessLocalNow) {
        _syncBusinessClock(nextData.businessLocalNow);
      }

      final successAction = next.successAction;

      if (successAction != null && previous?.successAction != successAction) {
        _showSuccessAnimation(successAction);
      }

      final errorMessage = next.errorMessage;

      if (errorMessage != null &&
          errorMessage.isNotEmpty &&
          previous?.errorMessage != errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: const Color(0xFFB42318),
          ),
        );
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: Stack(
          children: [
            _buildPageContent(context, clockState),
            if (_visibleSuccessAction != null)
              _SuccessOverlay(action: _visibleSuccessAction!),
          ],
        ),
      ),
    );
  }

  Widget _buildPageContent(BuildContext context, ClockState state) {
    if (state.isLoading && state.data == null) {
      return const _ClockLoadingView();
    }

    if (state.data == null) {
      return _ClockErrorView(
        message:
            state.errorMessage ??
            'Die Zeiterfassung konnte nicht geladen werden.',
        onRetry: _refresh,
      );
    }

    final data = state.data!;

    if (_businessClockBase == null) {
      _syncBusinessClock(data.businessLocalNow);
    }

    final displayNow = _now;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
        children: [
          _Header(employee: data.employee),
          const SizedBox(height: 22),
          _ClockHeroCard(
            now: displayNow,
            formattedTime: _formatCurrentTime(displayNow),
            formattedDate: _formatCurrentDate(displayNow),
            employee: data.employee,
            isProcessing: state.isProcessing,
          ),
          const SizedBox(height: 18),
          _ActionArea(
            employee: data.employee,
            isProcessing: state.isProcessing,
            isLocating: state.isLocating,
            onAction: (action) {
              ref.read(clockControllerProvider.notifier).performAction(action);
            },
          ),
          const SizedBox(height: 18),
          _ActivityCard(
            status: data.employee.status,
            workedMinutes: data.workedMinutes,
          ),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _InformationCard(
                  icon: Icons.timer_outlined,
                  title: 'Heute gearbeitet',
                  value: _formatMinutes(data.workedMinutes),
                  foregroundColor: const Color(0xFF027A48),
                  backgroundColor: const Color(0xFFECFDF3),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: _LastEntryCard(entry: data.lastEntry)),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Heutige Stempelungen',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF344054),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          if (data.entries.isEmpty)
            const _NoEntriesCard()
          else
            ...data.entries.reversed.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _EntryCard(entry: entry),
              ),
            ),
          const SizedBox(height: 12),
          _LocationNotice(trackingMode: data.employee.locationTrackingMode),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.employee});

  final ClockEmployee employee;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Stempeln',
          style: theme.textTheme.headlineSmall?.copyWith(
            color: const Color(0xFF101828),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          employee.businessName,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: const Color(0xFF667085),
          ),
        ),
      ],
    );
  }
}

class _ClockHeroCard extends StatelessWidget {
  const _ClockHeroCard({
    required this.now,
    required this.formattedTime,
    required this.formattedDate,
    required this.employee,
    required this.isProcessing,
  });

  final DateTime now;
  final String formattedTime;
  final String formattedDate;
  final ClockEmployee employee;
  final bool isProcessing;

  @override
  Widget build(BuildContext context) {
    final style = _clockStatusStyle(employee.status);

    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Hallo, ${employee.name}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: const Color(0xFF101828),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _ClockStatusBadge(status: employee.status),
            ],
          ),
          const SizedBox(height: 26),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 650),
            curve: Curves.easeOutBack,
            builder: (context, animationValue, child) {
              return Transform.scale(scale: animationValue, child: child);
            },
            child: Container(
              width: 210,
              height: 210,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: style.backgroundColor,
                border: Border.all(color: style.borderColor, width: 7),
                boxShadow: [
                  BoxShadow(
                    color: style.foregroundColor.withValues(alpha: 0.12),
                    blurRadius: 32,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 178,
                    height: 178,
                    child: CircularProgressIndicator(
                      value: isProcessing ? null : 1,
                      strokeWidth: 3,
                      color: style.foregroundColor,
                      backgroundColor: style.backgroundColor,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(style.icon, size: 34, color: style.foregroundColor),
                      const SizedBox(height: 10),
                      Text(
                        formattedTime,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(
                              color: const Color(0xFF101828),
                              fontWeight: FontWeight.w800,
                              letterSpacing: -1.5,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formattedDate,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF667085),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            _clockStatusHeadline(employee.status),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: style.foregroundColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            _clockStatusDescription(employee.status),
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

class _ActionArea extends StatelessWidget {
  const _ActionArea({
    required this.employee,
    required this.isProcessing,
    required this.isLocating,
    required this.onAction,
  });

  final ClockEmployee employee;
  final bool isProcessing;
  final bool isLocating;
  final ValueChanged<ClockAction> onAction;

  String get processingLabel {
    return isLocating
        ? 'Standort wird geprüft'
        : 'Wird gespeichert';
  }

  @override
  Widget build(BuildContext context) {
    switch (employee.status) {
      case ClockStatus.notCheckedIn:
      case ClockStatus.unknown:
        return _PrimaryActionButton(
          label: 'Einstempeln',
          icon: Icons.login_rounded,
          isProcessing: isProcessing,
          processingLabel: processingLabel,
          onPressed: () {
            onAction(ClockAction.checkIn);
          },
        );

      case ClockStatus.checkedIn:
        return Row(
          children: [
            Expanded(
              child: _SecondaryActionButton(
                label: 'Pause starten',
                icon: Icons.coffee_rounded,
                isProcessing: isProcessing,
                processingLabel: processingLabel,
                onPressed: () {
                  onAction(ClockAction.breakStart);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _PrimaryActionButton(
                label: 'Ausstempeln',
                icon: Icons.logout_rounded,
                isProcessing: isProcessing,
                processingLabel: processingLabel,
                onPressed: () {
                  onAction(ClockAction.checkOut);
                },
              ),
            ),
          ],
        );

      case ClockStatus.onBreak:
        return _PrimaryActionButton(
          label: 'Pause beenden',
          icon: Icons.play_arrow_rounded,
          isProcessing: isProcessing,
          processingLabel: processingLabel,
          onPressed: () {
            onAction(ClockAction.breakEnd);
          },
        );
    }
  }
}

class _PrimaryActionButton extends StatelessWidget {
  const _PrimaryActionButton({
    required this.label,
    required this.icon,
    required this.isProcessing,
    required this.processingLabel,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool isProcessing;
  final String processingLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 58,
      child: FilledButton.icon(
        onPressed: isProcessing ? null : onPressed,
        icon: isProcessing
            ? const SizedBox(
                width: 21,
                height: 21,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              )
            : Icon(icon),
        label: Text(
          isProcessing ? processingLabel : label,
        ),
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF2563EB),
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFF93C5FD),
          disabledForegroundColor: Colors.white,
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
    );
  }
}

class _SecondaryActionButton extends StatelessWidget {
  const _SecondaryActionButton({
    required this.label,
    required this.icon,
    required this.isProcessing,
    required this.processingLabel,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool isProcessing;
  final String processingLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 58,
      child: OutlinedButton.icon(
        onPressed: isProcessing ? null : onPressed,
        icon: isProcessing
            ? const SizedBox(
                width: 19,
                height: 19,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                ),
              )
            : Icon(icon),
        label: Text(
          isProcessing ? processingLabel : label,
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF344054),
          backgroundColor: Colors.white,
          side: const BorderSide(
            color: Color(0xFFD0D5DD),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
    );
  }
}

class _ActivityCard extends StatefulWidget {
  const _ActivityCard({required this.status, required this.workedMinutes});

  final ClockStatus status;
  final int workedMinutes;

  @override
  State<_ActivityCard> createState() => _ActivityCardState();
}

class _ActivityCardState extends State<_ActivityCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  bool get _isActive => widget.status == ClockStatus.checkedIn;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    if (_isActive) {
      _animationController.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant _ActivityCard oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (_isActive && !_animationController.isAnimating) {
      _animationController.repeat();
    } else if (!_isActive && _animationController.isAnimating) {
      _animationController.stop();
      _animationController.value = 0;
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isPaused = widget.status == ClockStatus.onBreak;

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: _isActive
                      ? const Color(0xFFECFDF3)
                      : isPaused
                      ? const Color(0xFFFFFAEB)
                      : const Color(0xFFF2F4F7),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  _isActive
                      ? Icons.bolt_rounded
                      : isPaused
                      ? Icons.pause_rounded
                      : Icons.timeline_rounded,
                  color: _isActive
                      ? const Color(0xFF027A48)
                      : isPaused
                      ? const Color(0xFFB54708)
                      : const Color(0xFF667085),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isActive
                          ? 'Arbeitszeit läuft'
                          : isPaused
                          ? 'Arbeitszeit pausiert'
                          : 'Noch nicht aktiv',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: const Color(0xFF101828),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _formatMinutes(widget.workedMinutes),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFF667085),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                final baseProgress = widget.workedMinutes == 0
                    ? 0.05
                    : (widget.workedMinutes % 120) / 120;

                final animationAddition = _isActive
                    ? _animationController.value * 0.15
                    : 0.0;

                final progress = (baseProgress + animationAddition).clamp(
                  0.04,
                  1.0,
                );

                return LinearProgressIndicator(
                  minHeight: 9,
                  value: progress,
                  backgroundColor: const Color(0xFFE4E7EC),
                  color: _isActive
                      ? const Color(0xFF12B76A)
                      : isPaused
                      ? const Color(0xFFF79009)
                      : const Color(0xFF98A2B3),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _InformationCard extends StatelessWidget {
  const _InformationCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final IconData icon;
  final String title;
  final String value;
  final Color foregroundColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: foregroundColor, size: 21),
          ),
          const SizedBox(height: 13),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF667085),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _LastEntryCard extends StatelessWidget {
  const _LastEntryCard({required this.entry});

  final ClockEntry? entry;

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(
              Icons.history_rounded,
              color: Color(0xFF2563EB),
              size: 21,
            ),
          ),
          const SizedBox(height: 13),
          Text(
            'Letzte Aktion',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF667085),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            entry == null ? 'Keine' : _formatEntryTime(entry!.localCreatedAt),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry});

  final ClockEntry entry;

  @override
  Widget build(BuildContext context) {
    final style = _entryStyle(entry.action);

    return DiperaCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: style.backgroundColor,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(style.icon, color: style.foregroundColor, size: 21),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Text(
              clockActionLabel(entry.action),
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: const Color(0xFF101828),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            _formatEntryTime(entry.localCreatedAt),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF667085),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoEntriesCard extends StatelessWidget {
  const _NoEntriesCard();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(
            Icons.history_toggle_off_rounded,
            size: 42,
            color: Color(0xFF98A2B3),
          ),
          const SizedBox(height: 12),
          Text(
            'Noch keine Stempelungen',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Deine heutigen Aktionen erscheinen hier.',
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

class _LocationNotice extends StatelessWidget {
  const _LocationNotice({required this.trackingMode});

  final String trackingMode;

  @override
  Widget build(BuildContext context) {
    final isDisabled = trackingMode == 'disabled';

    return DiperaCard(
      padding: const EdgeInsets.all(17),
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
            child: Icon(
              isDisabled
                  ? Icons.location_off_outlined
                  : Icons.location_on_outlined,
              color: const Color(0xFF2563EB),
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isDisabled
                      ? 'Standortprüfung deaktiviert'
                      : 'Standortprüfung aktiv',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: const Color(0xFF101828),
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isDisabled
                      ? 'Für deine Stempelungen wird derzeit '
                            'kein Standort benötigt.'
                      : 'Dein Standort wird ausschließlich beim '
                            'Auslösen einer Stempelung geprüft.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF667085),
                    height: 1.4,
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

class _ClockStatusBadge extends StatelessWidget {
  const _ClockStatusBadge({required this.status});

  final ClockStatus status;

  @override
  Widget build(BuildContext context) {
    final style = _clockStatusStyle(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: style.backgroundColor,
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
              color: style.foregroundColor,
            ),
          ),
          const SizedBox(width: 7),
          Text(
            _clockStatusShortLabel(status),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: style.foregroundColor,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _SuccessOverlay extends StatelessWidget {
  const _SuccessOverlay({required this.action});

  final ClockAction action;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.28),
        child: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.5, end: 1),
            duration: const Duration(milliseconds: 380),
            curve: Curves.easeOutBack,
            builder: (context, value, child) {
              return Transform.scale(
                scale: value,
                child: Opacity(opacity: value.clamp(0, 1), child: child),
              );
            },
            child: Container(
              margin: const EdgeInsets.all(28),
              padding: const EdgeInsets.fromLTRB(28, 30, 28, 26),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x30000000),
                    blurRadius: 32,
                    offset: Offset(0, 16),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 82,
                    height: 82,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFFECFDF3),
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      size: 48,
                      color: Color(0xFF12B76A),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    _successHeadline(action),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: const Color(0xFF101828),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    _successDescription(action),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF667085),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ClockLoadingView extends StatelessWidget {
  const _ClockLoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Stempeln',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: const Color(0xFF101828),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 100),
        const Center(child: CircularProgressIndicator()),
      ],
    );
  }
}

class _ClockErrorView extends StatelessWidget {
  const _ClockErrorView({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 80),
        const Icon(
          Icons.error_outline_rounded,
          size: 52,
          color: Color(0xFFD92D20),
        ),
        const SizedBox(height: 18),
        Text(
          'Zeiterfassung nicht verfügbar',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: const Color(0xFF101828),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF667085)),
        ),
        const SizedBox(height: 20),
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

class _ClockStatusStyle {
  const _ClockStatusStyle({
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
    required this.borderColor,
  });

  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;
  final Color borderColor;
}

_ClockStatusStyle _clockStatusStyle(ClockStatus status) {
  switch (status) {
    case ClockStatus.checkedIn:
      return const _ClockStatusStyle(
        icon: Icons.work_rounded,
        foregroundColor: Color(0xFF027A48),
        backgroundColor: Color(0xFFECFDF3),
        borderColor: Color(0xFFA6F4C5),
      );

    case ClockStatus.onBreak:
      return const _ClockStatusStyle(
        icon: Icons.coffee_rounded,
        foregroundColor: Color(0xFFB54708),
        backgroundColor: Color(0xFFFFFAEB),
        borderColor: Color(0xFFFEDFA7),
      );

    case ClockStatus.notCheckedIn:
    case ClockStatus.unknown:
      return const _ClockStatusStyle(
        icon: Icons.fingerprint_rounded,
        foregroundColor: Color(0xFF2563EB),
        backgroundColor: Color(0xFFEFF6FF),
        borderColor: Color(0xFFBFDBFE),
      );
  }
}

class _EntryStyle {
  const _EntryStyle({
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;
}

_EntryStyle _entryStyle(String action) {
  switch (action) {
    case 'check_in':
      return const _EntryStyle(
        icon: Icons.login_rounded,
        foregroundColor: Color(0xFF027A48),
        backgroundColor: Color(0xFFECFDF3),
      );

    case 'break_start':
      return const _EntryStyle(
        icon: Icons.coffee_rounded,
        foregroundColor: Color(0xFFB54708),
        backgroundColor: Color(0xFFFFFAEB),
      );

    case 'break_end':
      return const _EntryStyle(
        icon: Icons.play_arrow_rounded,
        foregroundColor: Color(0xFF175CD3),
        backgroundColor: Color(0xFFEFF8FF),
      );

    case 'check_out':
      return const _EntryStyle(
        icon: Icons.logout_rounded,
        foregroundColor: Color(0xFF6941C6),
        backgroundColor: Color(0xFFF4EBFF),
      );

    default:
      return const _EntryStyle(
        icon: Icons.schedule_rounded,
        foregroundColor: Color(0xFF475467),
        backgroundColor: Color(0xFFF2F4F7),
      );
  }
}

String _formatMinutes(int totalMinutes) {
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;

  if (hours <= 0) {
    return '$minutes Min.';
  }

  return '$hours Std. ${minutes.toString().padLeft(2, '0')} Min.';
}

String _formatEntryTime(String? localCreatedAt) {
  if (localCreatedAt == null || localCreatedAt.isEmpty) {
    return '--:--';
  }

  final match = RegExp(
    r'^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})',
  ).firstMatch(localCreatedAt);

  if (match == null) {
    return '--:--';
  }

  return '${match.group(1)}:${match.group(2)}';
}

DateTime _parseBusinessWallClock(String value) {
  final match = RegExp(
    r'^(\d{4})-(\d{2})-(\d{2})T'
    r'(\d{2}):(\d{2}):(\d{2})'
    r'(?:\.(\d{1,6}))?$',
  ).firstMatch(value);

  if (match == null) {
    throw FormatException(
      'Ungültige Betriebszeit: $value',
    );
  }

  final fraction = (match.group(7) ?? '').padRight(6, '0');
  final microseconds = fraction.isEmpty ? 0 : int.parse(fraction);

  return DateTime.utc(
    int.parse(match.group(1)!),
    int.parse(match.group(2)!),
    int.parse(match.group(3)!),
    int.parse(match.group(4)!),
    int.parse(match.group(5)!),
    int.parse(match.group(6)!),
    microseconds ~/ 1000,
    microseconds % 1000,
  );
}

String _clockStatusShortLabel(ClockStatus status) {
  switch (status) {
    case ClockStatus.checkedIn:
      return 'Aktiv';

    case ClockStatus.onBreak:
      return 'Pause';

    case ClockStatus.notCheckedIn:
      return 'Bereit';

    case ClockStatus.unknown:
      return 'Unbekannt';
  }
}

String _clockStatusHeadline(ClockStatus status) {
  switch (status) {
    case ClockStatus.checkedIn:
      return 'Du bist eingestempelt';

    case ClockStatus.onBreak:
      return 'Du befindest dich in Pause';

    case ClockStatus.notCheckedIn:
      return 'Bereit für deinen Arbeitstag?';

    case ClockStatus.unknown:
      return 'Status wird geprüft';
  }
}

String _clockStatusDescription(ClockStatus status) {
  switch (status) {
    case ClockStatus.checkedIn:
      return 'Deine Arbeitszeit wird aktuell erfasst.';

    case ClockStatus.onBreak:
      return 'Deine Arbeitszeit ist momentan pausiert.';

    case ClockStatus.notCheckedIn:
      return 'Stempele dich ein, sobald du mit der Arbeit beginnst.';

    case ClockStatus.unknown:
      return 'Ziehe nach unten, um den Status neu zu laden.';
  }
}

String _successHeadline(ClockAction action) {
  switch (action) {
    case ClockAction.checkIn:
      return 'Erfolgreich eingestempelt';

    case ClockAction.breakStart:
      return 'Pause gestartet';

    case ClockAction.breakEnd:
      return 'Pause beendet';

    case ClockAction.checkOut:
      return 'Erfolgreich ausgestempelt';
  }
}

String _successDescription(ClockAction action) {
  switch (action) {
    case ClockAction.checkIn:
      return 'Viel Erfolg bei der Arbeit!';

    case ClockAction.breakStart:
      return 'Wir wünschen dir eine erholsame Pause.';

    case ClockAction.breakEnd:
      return 'Willkommen zurück!';

    case ClockAction.checkOut:
      return 'Schönen Feierabend!';
  }
}
