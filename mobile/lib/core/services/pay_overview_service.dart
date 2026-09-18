import 'package:supabase_flutter/supabase_flutter.dart';

class PayOverviewService {
  PayOverviewService(this._client);

  final SupabaseClient _client;

  Future<EmployeePayOverview?> getMonth({
    required int year,
    required int month,
  }) async {
    final response = await _client.rpc(
      'get_my_month_work_pay_overview',
      params: {
        'p_year': year,
        'p_month': month,
      },
    );

    if (response == null) {
      return null;
    }

    if (response is! List) {
      throw StateError(
        'Unerwartete Antwort von get_my_month_work_pay_overview.',
      );
    }

    if (response.isEmpty) {
      return null;
    }

    final firstRow = response.first;

    if (firstRow is! Map) {
      throw StateError(
        'Unerwartetes Datenformat der Lohnübersicht.',
      );
    }

    return EmployeePayOverview.fromJson(
      Map<String, dynamic>.from(firstRow),
    );
  }
}

class EmployeePayOverview {
  const EmployeePayOverview({
    required this.payrollPeriodId,
    required this.periodYear,
    required this.periodMonth,
    required this.periodStatus,
    required this.employeeId,
    required this.employeeName,
    required this.wageType,
    required this.timeAccountPeriod,
    required this.targetMinutes,
    required this.workedMinutes,
    required this.creditedMinutes,
    required this.accountableMinutes,
    required this.rawDifferenceMinutes,
    required this.openingBalanceMinutes,
    required this.currentBalanceMinutes,
    required this.carriedBalanceMinutes,
    required this.payoutOvertimeMinutes,
    required this.targetMinutesRequiresReview,
    required this.hourlyRate,
    required this.monthlySalary,
    required this.hourlyAllowanceRate,
    required this.baseGross,
    required this.hourlyAllowanceGross,
    required this.overtimeGross,
    required this.nightSurchargeGross,
    required this.sundaySurchargeGross,
    required this.holidaySurchargeGross,
    required this.otherSurchargeGross,
    required this.totalSurchargeGross,
    required this.estimatedGross,
  });

  final String payrollPeriodId;

  final int periodYear;
  final int periodMonth;
  final String periodStatus;

  final String employeeId;
  final String employeeName;

  final String wageType;
  final String timeAccountPeriod;

  final int targetMinutes;
  final int workedMinutes;
  final int creditedMinutes;
  final int accountableMinutes;
  final int rawDifferenceMinutes;

  final int openingBalanceMinutes;
  final int currentBalanceMinutes;
  final int carriedBalanceMinutes;
  final int payoutOvertimeMinutes;

  final bool targetMinutesRequiresReview;

  final double? hourlyRate;
  final double? monthlySalary;
  final double? hourlyAllowanceRate;

  final double baseGross;
  final double hourlyAllowanceGross;
  final double overtimeGross;

  final double nightSurchargeGross;
  final double sundaySurchargeGross;
  final double holidaySurchargeGross;
  final double otherSurchargeGross;

  final double totalSurchargeGross;
  final double estimatedGross;

  bool get hasTimeAccount => timeAccountPeriod != 'none';

  bool get isClosed => periodStatus == 'closed';

  factory EmployeePayOverview.fromJson(
    Map<String, dynamic> json,
  ) {
    return EmployeePayOverview(
      payrollPeriodId:
          json['payroll_period_id']?.toString() ?? '',
      periodYear: _toInt(json['period_year']),
      periodMonth: _toInt(json['period_month']),
      periodStatus:
          json['period_status']?.toString() ?? 'open',
      employeeId:
          json['employee_id']?.toString() ?? '',
      employeeName:
          json['employee_name']?.toString() ?? '',
      wageType:
          json['wage_type']?.toString() ?? '',
      timeAccountPeriod:
          json['time_account_period']?.toString() ?? 'none',
      targetMinutes:
          _toInt(json['target_minutes']),
      workedMinutes:
          _toInt(json['worked_minutes']),
      creditedMinutes:
          _toInt(json['credited_minutes']),
      accountableMinutes:
          _toInt(json['accountable_minutes']),
      rawDifferenceMinutes:
          _toInt(json['raw_difference_minutes']),
      openingBalanceMinutes:
          _toInt(json['opening_balance_minutes']),
      currentBalanceMinutes:
          _toInt(json['current_balance_minutes']),
      carriedBalanceMinutes:
          _toInt(json['carried_balance_minutes']),
      payoutOvertimeMinutes:
          _toInt(json['payout_overtime_minutes']),
      targetMinutesRequiresReview:
          json['target_minutes_requires_review'] == true,
      hourlyRate:
          _toNullableDouble(json['hourly_rate']),
      monthlySalary:
          _toNullableDouble(json['monthly_salary']),
      hourlyAllowanceRate:
          _toNullableDouble(
        json['hourly_allowance_rate'],
      ),
      baseGross:
          _toDouble(json['base_gross']),
      hourlyAllowanceGross:
          _toDouble(
        json['hourly_allowance_gross'],
      ),
      overtimeGross:
          _toDouble(json['overtime_gross']),
      nightSurchargeGross:
          _toDouble(
        json['night_surcharge_gross'],
      ),
      sundaySurchargeGross:
          _toDouble(
        json['sunday_surcharge_gross'],
      ),
      holidaySurchargeGross:
          _toDouble(
        json['holiday_surcharge_gross'],
      ),
      otherSurchargeGross:
          _toDouble(
        json['other_surcharge_gross'],
      ),
      totalSurchargeGross:
          _toDouble(
        json['total_surcharge_gross'],
      ),
      estimatedGross:
          _toDouble(json['estimated_gross']),
    );
  }

  static int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is num) return value.toInt();

    return int.tryParse(
          value.toString(),
        ) ??
        0;
  }

  static double _toDouble(dynamic value) {
    if (value == null) return 0;
    if (value is num) return value.toDouble();

    return double.tryParse(
          value.toString(),
        ) ??
        0;
  }

  static double? _toNullableDouble(
    dynamic value,
  ) {
    if (value == null) return null;
    if (value is num) return value.toDouble();

    return double.tryParse(
      value.toString(),
    );
  }
}