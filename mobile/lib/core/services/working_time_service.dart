import 'package:supabase_flutter/supabase_flutter.dart';

class WorkingTimeEntry {
  const WorkingTimeEntry({
    required this.id,
    required this.employeeId,
    required this.action,
    required this.createdAt,
  });

  final String id;
  final String employeeId;
  final String action;
  final DateTime createdAt;
}

class WorkingTimeDay {
  const WorkingTimeDay({
    required this.date,
    required this.entries,
    required this.workedMinutes,
    required this.breakMinutes,
    required this.isComplete,
  });

  final DateTime date;
  final List<WorkingTimeEntry> entries;
  final int workedMinutes;
  final int breakMinutes;
  final bool isComplete;

  WorkingTimeEntry? get firstCheckIn {
    for (final entry in entries) {
      if (entry.action == 'check_in') {
        return entry;
      }
    }

    return null;
  }

  WorkingTimeEntry? get lastCheckOut {
    for (final entry in entries.reversed) {
      if (entry.action == 'check_out') {
        return entry;
      }
    }

    return null;
  }
}

class WorkingTimeMonth {
  const WorkingTimeMonth({
    required this.days,
    required this.totalWorkedMinutes,
    required this.totalBreakMinutes,
  });

  final List<WorkingTimeDay> days;
  final int totalWorkedMinutes;
  final int totalBreakMinutes;
}

class TimeAccountDashboard {
  const TimeAccountDashboard({
    required this.employeeId,
    required this.periodYear,
    required this.periodMonth,
    required this.accountEnabled,
    required this.accountStatus,
    required this.openingBalanceMinutes,
    required this.fullTargetMinutes,
    required this.currentTargetMinutes,
    required this.futureTargetMinutes,
    required this.workedMinutes,
    required this.creditedMinutes,
    required this.accountableMinutes,
    required this.currentPeriodBalanceMinutes,
    required this.currentBalanceMinutes,
    required this.targetAchievedMinutes,
    required this.targetDueMinutes,
    required this.targetFutureMinutes,
    required this.futurePlannedMinutes,
    required this.projectionAvailable,
    required this.projectedBalanceMinutes,
  });

  final String employeeId;
  final int periodYear;
  final int periodMonth;

  final bool accountEnabled;
  final String accountStatus;

  final int openingBalanceMinutes;

  final int fullTargetMinutes;
  final int currentTargetMinutes;
  final int futureTargetMinutes;

  final int workedMinutes;
  final int creditedMinutes;
  final int accountableMinutes;

  final int currentPeriodBalanceMinutes;
  final int currentBalanceMinutes;

  final int targetAchievedMinutes;
  final int targetDueMinutes;
  final int targetFutureMinutes;

  final int futurePlannedMinutes;

  final bool projectionAvailable;
  final int? projectedBalanceMinutes;

  factory TimeAccountDashboard.fromJson(
    Map<String, dynamic> json,
  ) {
    int readInt(String key) {
      final value = json[key];

      if (value is num) {
        return value.toInt();
      }

      return int.tryParse(value?.toString() ?? '') ?? 0;
    }

    return TimeAccountDashboard(
      employeeId: json['employee_id']?.toString() ?? '',
      periodYear: readInt('period_year'),
      periodMonth: readInt('period_month'),
      accountEnabled: json['account_enabled'] == true,
      accountStatus:
          json['account_status']?.toString() ?? 'unknown',
      openingBalanceMinutes:
          readInt('opening_balance_minutes'),
      fullTargetMinutes:
          readInt('full_target_minutes'),
      currentTargetMinutes:
          readInt('current_target_minutes'),
      futureTargetMinutes:
          readInt('future_target_minutes'),
      workedMinutes:
          readInt('worked_minutes'),
      creditedMinutes:
          readInt('credited_minutes'),
      accountableMinutes:
          readInt('accountable_minutes'),
      currentPeriodBalanceMinutes:
          readInt('current_period_balance_minutes'),
      currentBalanceMinutes:
          readInt('current_balance_minutes'),
      targetAchievedMinutes:
          readInt('target_achieved_minutes'),
      targetDueMinutes:
          readInt('target_due_minutes'),
      targetFutureMinutes:
          readInt('target_future_minutes'),
      futurePlannedMinutes:
          readInt('future_planned_minutes'),
      projectionAvailable:
          json['projection_available'] == true,
      projectedBalanceMinutes:
          json['projected_balance_minutes'] == null
              ? null
              : readInt('projected_balance_minutes'),
    );
  }
}

class WorkingTimeService {
  WorkingTimeService(this._client);

  final SupabaseClient _client;

  Future<TimeAccountDashboard>
      getCurrentTimeAccountDashboard() async {
    final data = await _client.rpc(
      'get_my_current_time_account_dashboard',
    );

    if (data is! List || data.isEmpty) {
      throw Exception(
        'Für das aktuelle Stundenkonto wurden keine Daten gefunden.',
      );
    }

    final row = Map<String, dynamic>.from(
      data.first as Map,
    );

    return TimeAccountDashboard.fromJson(row);
  }

  Future<WorkingTimeMonth> getMonth({
    required String employeeId,
    required int year,
    required int month,
  }) async {
    final start = DateTime(year, month, 1);
    final end = DateTime(year, month + 1, 1);

    final data = await _client
        .from('time_entries')
        .select('''
          id,
          employee_id,
          action,
          created_at
          ''')
        .eq('employee_id', employeeId)
        .gte('created_at', start.toUtc().toIso8601String())
        .lt('created_at', end.toUtc().toIso8601String())
        .order('created_at', ascending: true);

    final entries = (data as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;

      return WorkingTimeEntry(
        id: map['id'] as String,
        employeeId: map['employee_id'] as String,
        action: map['action'] as String,
        createdAt: DateTime.parse(
          map['created_at'] as String,
        ).toLocal(),
      );
    }).toList();

    final grouped = <String, List<WorkingTimeEntry>>{};

    for (final entry in entries) {
      final local = entry.createdAt;

      final key =
          '${local.year.toString().padLeft(4, '0')}-'
          '${local.month.toString().padLeft(2, '0')}-'
          '${local.day.toString().padLeft(2, '0')}';

      grouped.putIfAbsent(
        key,
        () => <WorkingTimeEntry>[],
      );

      grouped[key]!.add(entry);
    }

    final days = <WorkingTimeDay>[];

    for (final group in grouped.entries) {
      final date = DateTime.parse(group.key);

      final dayEntries = [...group.value]
        ..sort(
          (a, b) => a.createdAt.compareTo(b.createdAt),
        );

      final calculation = _calculateDay(dayEntries);

      days.add(
        WorkingTimeDay(
          date: date,
          entries: dayEntries,
          workedMinutes: calculation.workedMinutes,
          breakMinutes: calculation.breakMinutes,
          isComplete: calculation.isComplete,
        ),
      );
    }

    days.sort(
      (a, b) => b.date.compareTo(a.date),
    );

    final totalWorkedMinutes = days.fold<int>(
      0,
      (sum, day) => sum + day.workedMinutes,
    );

    final totalBreakMinutes = days.fold<int>(
      0,
      (sum, day) => sum + day.breakMinutes,
    );

    return WorkingTimeMonth(
      days: days,
      totalWorkedMinutes: totalWorkedMinutes,
      totalBreakMinutes: totalBreakMinutes,
    );
  }

  _DayCalculation _calculateDay(
    List<WorkingTimeEntry> entries,
  ) {
    var workedMinutes = 0;
    var breakMinutes = 0;

    DateTime? workStart;
    DateTime? breakStart;

    var invalidSequence = false;

    for (final entry in entries) {
      switch (entry.action) {
        case 'check_in':
          if (workStart != null) {
            invalidSequence = true;
          }

          workStart = entry.createdAt;
          breakStart = null;
          break;

        case 'break_start':
          if (workStart == null) {
            invalidSequence = true;
            break;
          }

          workedMinutes +=
              entry.createdAt.difference(workStart).inMinutes;

          workStart = null;
          breakStart = entry.createdAt;
          break;

        case 'break_end':
          if (breakStart == null) {
            invalidSequence = true;
            break;
          }

          breakMinutes +=
              entry.createdAt.difference(breakStart).inMinutes;

          breakStart = null;
          workStart = entry.createdAt;
          break;

        case 'check_out':
          if (workStart == null) {
            invalidSequence = true;
            break;
          }

          workedMinutes +=
              entry.createdAt.difference(workStart).inMinutes;

          workStart = null;
          breakStart = null;
          break;
      }
    }

    final isComplete =
        !invalidSequence &&
        workStart == null &&
        breakStart == null;

    return _DayCalculation(
      workedMinutes:
          workedMinutes < 0 ? 0 : workedMinutes,
      breakMinutes:
          breakMinutes < 0 ? 0 : breakMinutes,
      isComplete: isComplete,
    );
  }
}

class _DayCalculation {
  const _DayCalculation({
    required this.workedMinutes,
    required this.breakMinutes,
    required this.isComplete,
  });

  final int workedMinutes;
  final int breakMinutes;
  final bool isComplete;
}
