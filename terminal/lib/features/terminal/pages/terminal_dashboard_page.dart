import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/terminal_auth_service.dart';
import '../../../core/services/terminal_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/dipera_card.dart';

class TerminalDashboardPage extends StatefulWidget {
  const TerminalDashboardPage({
    required this.profile,
    required this.onLogout,
    super.key,
  });

  final TerminalAdminProfile profile;
  final Future<void> Function() onLogout;

  @override
  State<TerminalDashboardPage> createState() =>
      _TerminalDashboardPageState();
}

class _TerminalDashboardPageState extends State<TerminalDashboardPage> {
  late final TerminalService _service;

  Timer? _clockTimer;
  Timer? _refreshTimer;

  DateTime _now = DateTime.now();
  TerminalStatus? _status;

  bool _loadingStatus = true;
  bool _checkingPin = false;

  String _pin = '';
  String? _errorMessage;

  @override
  void initState() {
    super.initState();

    _service = TerminalService(
      supabase: Supabase.instance.client,
    );

    _clockTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) {
        if (mounted) {
          setState(() => _now = DateTime.now());
        }
      },
    );

    _refreshTimer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _loadStatus(silent: true),
    );

    _loadStatus();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _refreshTimer?.cancel();
    _service.dispose();
    super.dispose();
  }

  Future<void> _loadStatus({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loadingStatus = true;
        _errorMessage = null;
      });
    }

    try {
      final status = await _service.getStatus();

      if (!mounted) return;

      setState(() {
        _status = status;
        _loadingStatus = false;
      });
    } on TerminalApiException catch (error) {
      if (!mounted) return;

      setState(() {
        _loadingStatus = false;
        if (!silent) {
          _errorMessage = error.message;
        }
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _loadingStatus = false;
        if (!silent) {
          _errorMessage =
              'Der Teamstatus konnte nicht geladen werden.';
        }
      });
    }
  }

  void _appendDigit(String digit) {
    if (_checkingPin || _pin.length >= 4) return;

    setState(() {
      _pin += digit;
      _errorMessage = null;
    });

    if (_pin.length == 4) {
      Future<void>.delayed(
        const Duration(milliseconds: 180),
        _lookupPin,
      );
    }
  }

  void _backspace() {
    if (_checkingPin || _pin.isEmpty) return;

    setState(() {
      _pin = _pin.substring(0, _pin.length - 1);
      _errorMessage = null;
    });
  }

  void _clearPin() {
    if (_checkingPin) return;

    setState(() {
      _pin = '';
      _errorMessage = null;
    });
  }

  Future<void> _lookupPin() async {
    if (_pin.length != 4 || _checkingPin) return;

    final pin = _pin;

    setState(() {
      _checkingPin = true;
      _errorMessage = null;
    });

    try {
      final employee = await _service.lookupPin(pin);

      if (!mounted) return;

      setState(() {
        _checkingPin = false;
      });

      await _showActionDialog(
        pin: pin,
        employee: employee,
      );
    } on TerminalApiException catch (error) {
      if (!mounted) return;

      setState(() {
        _checkingPin = false;
        _pin = '';
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _checkingPin = false;
        _pin = '';
        _errorMessage =
            'Die PIN konnte nicht geprüft werden.';
      });
    }
  }

  Future<void> _showActionDialog({
    required String pin,
    required TerminalEmployeeLookup employee,
  }) async {
    final action = await showDialog<String>(
      context: context,
      barrierDismissible: true,
      builder: (context) {
        return _EmployeeActionDialog(
          employee: employee,
        );
      },
    );

    if (!mounted) return;

    if (action == null) {
      _clearPin();
      return;
    }

    await _performClock(
      pin: pin,
      action: action,
    );
  }

  Future<void> _performClock({
    required String pin,
    required String action,
  }) async {
    setState(() {
      _checkingPin = true;
      _errorMessage = null;
    });

    try {
      final result = await _service.clock(
        pin: pin,
        action: action,
      );

      if (!mounted) return;

      setState(() {
        _checkingPin = false;
        _pin = '';
      });

      await _loadStatus(silent: true);

      if (!mounted) return;

      await _showSuccessDialog(result);
    } on TerminalApiException catch (error) {
      if (!mounted) return;

      setState(() {
        _checkingPin = false;
        _pin = '';
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _checkingPin = false;
        _pin = '';
        _errorMessage =
            'Der Stempelschritt konnte nicht gespeichert werden.';
      });
    }
  }

  Future<void> _showSuccessDialog(
    TerminalClockResult result,
  ) async {
    final message = switch (result.action) {
      'check_in' => 'Willkommen, ${result.employeeName} 👋',
      'break_start' => 'Schöne Pause, ${result.employeeName} ☕',
      'break_end' => 'Willkommen zurück, ${result.employeeName} 👋',
      'check_out' => 'Schönen Feierabend, ${result.employeeName} 👋',
      _ => 'Erfolgreich gespeichert',
    };

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        Future<void>.delayed(
          const Duration(milliseconds: 1700),
          () {
            if (context.mounted &&
                Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        );

        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 78,
                  height: 78,
                  decoration: const BoxDecoration(
                    color: AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    color: AppColors.success,
                    size: 44,
                  ),
                ),
                const SizedBox(height: 22),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style:
                      Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                ),
                const SizedBox(height: 8),
                Text(
                  _actionSuccessSubtitle(result.action),
                  textAlign: TextAlign.center,
                  style:
                      Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String get _time =>
      '${_now.hour.toString().padLeft(2, '0')}:'
      '${_now.minute.toString().padLeft(2, '0')}';

  String get _date {
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

    return '${weekdays[_now.weekday - 1]}, '
        '${_now.day}. ${months[_now.month - 1]} ${_now.year}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = _status;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              _Header(
                businessName:
                    status?.businessName ?? widget.profile.businessName,
                time: _time,
                date: _date,
                onRefresh: () => _loadStatus(),
                onLogout: widget.onLogout,
              ),
              const SizedBox(height: 20),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final wide = constraints.maxWidth >= 900;

                    final pinPanel = _PinPanel(
                      pin: _pin,
                      loading: _checkingPin,
                      errorMessage: _errorMessage,
                      onDigit: _appendDigit,
                      onBackspace: _backspace,
                      onClear: _clearPin,
                    );

                    final teamPanel = _TeamPanel(
                      status: status,
                      loading: _loadingStatus,
                      onRetry: () => _loadStatus(),
                    );

                    if (wide) {
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            flex: 6,
                            child: pinPanel,
                          ),
                          const SizedBox(width: 20),
                          Expanded(
                            flex: 5,
                            child: teamPanel,
                          ),
                        ],
                      );
                    }

                    return ListView(
                      children: [
                        pinPanel,
                        const SizedBox(height: 20),
                        teamPanel,
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.businessName,
    required this.time,
    required this.date,
    required this.onRefresh,
    required this.onLogout,
  });

  final String businessName;
  final String time;
  final String date;
  final VoidCallback onRefresh;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [
                AppColors.gradientStart,
                AppColors.gradientEnd,
              ],
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.access_time_filled_rounded,
            color: Colors.white,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                businessName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$date · $time Uhr',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Aktualisieren',
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh_rounded),
        ),
        IconButton(
          tooltip: 'Terminal abmelden',
          onPressed: onLogout,
          icon: const Icon(Icons.logout_rounded),
        ),
      ],
    );
  }
}

class _PinPanel extends StatelessWidget {
  const _PinPanel({
    required this.pin,
    required this.loading,
    required this.errorMessage,
    required this.onDigit,
    required this.onBackspace,
    required this.onClear,
  });

  final String pin;
  final bool loading;
  final String? errorMessage;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: const EdgeInsets.all(26),
      child: Column(
        children: [
          Text(
            'Arbeitszeit stempeln',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Gib deine persönliche 4-stellige PIN ein.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              4,
              (index) => Container(
                width: 22,
                height: 22,
                margin: const EdgeInsets.symmetric(horizontal: 9),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index < pin.length
                      ? AppColors.primary
                      : AppColors.surfaceMuted,
                  border: Border.all(
                    color: index < pin.length
                        ? AppColors.primary
                        : AppColors.border,
                    width: 1.4,
                  ),
                ),
              ),
            ),
          ),
          if (errorMessage != null) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.dangerLight,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
          const SizedBox(height: 22),
          if (loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            )
          else
            _NumberPad(
              onDigit: onDigit,
              onBackspace: onBackspace,
              onClear: onClear,
            ),
        ],
      ),
    );
  }
}

class _NumberPad extends StatelessWidget {
  const _NumberPad({
    required this.onDigit,
    required this.onBackspace,
    required this.onClear,
  });

  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[
      for (final digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9'])
        _PinKey(
          label: digit,
          onTap: () => onDigit(digit),
        ),
      _PinKey(
        icon: Icons.close_rounded,
        onTap: onClear,
        muted: true,
      ),
      _PinKey(
        label: '0',
        onTap: () => onDigit('0'),
      ),
      _PinKey(
        icon: Icons.backspace_outlined,
        onTap: onBackspace,
        muted: true,
      ),
    ];

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 430),
      child: GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.7,
        children: items,
      ),
    );
  }
}

class _PinKey extends StatelessWidget {
  const _PinKey({
    required this.onTap,
    this.label,
    this.icon,
    this.muted = false,
  });

  final VoidCallback onTap;
  final String? label;
  final IconData? icon;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: muted ? AppColors.surfaceMuted : AppColors.primaryLight,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Center(
          child: label != null
              ? Text(
                  label!,
                  style:
                      Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppColors.primaryDark,
                            fontWeight: FontWeight.w800,
                          ),
                )
              : Icon(
                  icon,
                  color: AppColors.textSecondary,
                ),
        ),
      ),
    );
  }
}

class _TeamPanel extends StatelessWidget {
  const _TeamPanel({
    required this.status,
    required this.loading,
    required this.onRetry,
  });

  final TerminalStatus? status;
  final bool loading;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (loading && status == null) {
      return const DiperaCard(
        child: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (status == null) {
      return DiperaCard(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 42,
              color: AppColors.danger,
            ),
            const SizedBox(height: 14),
            const Text(
              'Teamstatus nicht verfügbar',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
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

    final presentRatio = status!.total == 0
        ? 0.0
        : status!.present / status!.total;

    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Team heute',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Live-Übersicht des aktuellen Status',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 22),
          Center(
            child: SizedBox(
              width: 150,
              height: 150,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 140,
                    height: 140,
                    child: CircularProgressIndicator(
                      value: presentRatio,
                      strokeWidth: 14,
                      backgroundColor: AppColors.surfaceMuted,
                      color: AppColors.primary,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${status!.present}',
                        style:
                            theme.textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                      ),
                      Text(
                        'von ${status!.total} da',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          _TeamStatusRow(
            label: 'Arbeitet gerade',
            count: status!.working,
            color: AppColors.success,
            background: AppColors.successLight,
            icon: Icons.play_circle_outline_rounded,
          ),
          const SizedBox(height: 10),
          _TeamStatusRow(
            label: 'In Pause',
            count: status!.onBreak,
            color: AppColors.warning,
            background: AppColors.warningLight,
            icon: Icons.coffee_outlined,
          ),
          const SizedBox(height: 10),
          _TeamStatusRow(
            label: 'Nicht da',
            count: status!.absent,
            color: AppColors.textSecondary,
            background: AppColors.surfaceMuted,
            icon: Icons.home_outlined,
          ),
          const SizedBox(height: 22),
          Expanded(
            child: _PresentEmployees(
              working: status!.workingEmployees,
              onBreak: status!.breakEmployees,
            ),
          ),
        ],
      ),
    );
  }
}

class _TeamStatusRow extends StatelessWidget {
  const _TeamStatusRow({
    required this.label,
    required this.count,
    required this.color,
    required this.background,
    required this.icon,
  });

  final String label;
  final int count;
  final Color color;
  final Color background;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
          Text(
            '$count',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

class _PresentEmployees extends StatelessWidget {
  const _PresentEmployees({
    required this.working,
    required this.onBreak,
  });

  final List<TerminalTeamMember> working;
  final List<TerminalTeamMember> onBreak;

  @override
  Widget build(BuildContext context) {
    final members = [
      ...working.map((member) => (member, false)),
      ...onBreak.map((member) => (member, true)),
    ];

    if (members.isEmpty) {
      return Center(
        child: Text(
          'Aktuell ist niemand eingestempelt.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
      );
    }

    return ListView.separated(
      itemCount: members.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final member = members[index].$1;
        final isBreak = members[index].$2;

        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(
            backgroundColor:
                isBreak ? AppColors.warningLight : AppColors.successLight,
            child: Icon(
              isBreak ? Icons.coffee_rounded : Icons.person_rounded,
              color: isBreak ? AppColors.warning : AppColors.success,
            ),
          ),
          title: Text(
            member.name,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
            ),
          ),
          trailing: Text(
            isBreak ? 'Pause' : 'Arbeitet',
            style: TextStyle(
              color: isBreak ? AppColors.warning : AppColors.success,
              fontWeight: FontWeight.w700,
            ),
          ),
        );
      },
    );
  }
}

class _EmployeeActionDialog extends StatelessWidget {
  const _EmployeeActionDialog({
    required this.employee,
  });

  final TerminalEmployeeLookup employee;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 34,
                backgroundColor: AppColors.primaryLight,
                child: const Icon(
                  Icons.person_rounded,
                  size: 34,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                employee.name,
                style:
                    Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
              ),
              const SizedBox(height: 6),
              Text(
                _employeeStatusLabel(employee.status),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
              const SizedBox(height: 24),
              for (final action in employee.allowedActions) ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => Navigator.of(context).pop(action),
                    icon: Icon(_actionIcon(action)),
                    label: Text(_actionLabel(action)),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Abbrechen'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _employeeStatusLabel(String status) {
  return switch (status) {
    'checked_in' => 'Aktuell eingestempelt',
    'on_break' => 'Aktuell in Pause',
    'not_checked_in' => 'Aktuell nicht eingestempelt',
    _ => 'Status unbekannt',
  };
}

String _actionLabel(String action) {
  return switch (action) {
    'check_in' => 'Einstempeln',
    'break_start' => 'Pause starten',
    'break_end' => 'Pause beenden',
    'check_out' => 'Ausstempeln',
    _ => action,
  };
}

IconData _actionIcon(String action) {
  return switch (action) {
    'check_in' => Icons.login_rounded,
    'break_start' => Icons.coffee_outlined,
    'break_end' => Icons.play_arrow_rounded,
    'check_out' => Icons.logout_rounded,
    _ => Icons.schedule_rounded,
  };
}

String _actionSuccessSubtitle(String action) {
  return switch (action) {
    'check_in' => 'Deine Arbeitszeit läuft jetzt.',
    'break_start' => 'Deine Pause wurde gestartet.',
    'break_end' => 'Deine Arbeitszeit läuft weiter.',
    'check_out' => 'Deine Arbeitszeit wurde beendet.',
    _ => 'Der Stempelschritt wurde gespeichert.',
  };
}
