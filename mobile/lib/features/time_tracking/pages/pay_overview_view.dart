import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/pay_overview_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../providers/pay_overview_provider.dart';

class PayOverviewView extends ConsumerWidget {
  const PayOverviewView({
    super.key,
    required this.monthKey,
    required this.monthLabel,
  });

  final String monthKey;
  final String monthLabel;

  @override
  Widget build(
    BuildContext context,
    WidgetRef ref,
  ) {
    final payAsync = ref.watch(
      payOverviewMonthProvider(monthKey),
    );

    return payAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(
          vertical: 60,
        ),
        child: Center(
          child: CircularProgressIndicator(),
        ),
      ),
      error: (error, stackTrace) {
        return DiperaCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(
                Icons.error_outline_rounded,
                size: 46,
                color: Color(0xFFD92D20),
              ),
              const SizedBox(height: 16),
              const Text(
                'Lohnübersicht konnte nicht geladen werden',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF101828),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Bitte versuche es erneut.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF667085),
                ),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: () {
                  ref.invalidate(
                    payOverviewMonthProvider(
                      monthKey,
                    ),
                  );
                },
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
      },
      data: (pay) {
        if (pay == null) {
          return DiperaCard(
            padding: const EdgeInsets.all(26),
            child: Column(
              children: [
                const Icon(
                  Icons.payments_outlined,
                  size: 46,
                  color: Color(0xFF98A2B3),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Keine Lohnübersicht',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF101828),
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  'Für $monthLabel liegen aktuell '
                  'keine Lohndaten vor.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF667085),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          );
        }

        return _PayContent(
          pay: pay,
          monthLabel: monthLabel,
        );
      },
    );
  }
}

class _PayContent extends StatelessWidget {
  const _PayContent({
    required this.pay,
    required this.monthLabel,
  });

  final EmployeePayOverview pay;
  final String monthLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        _GrossPayCard(
          pay: pay,
          monthLabel: monthLabel,
        ),
        const SizedBox(height: 20),
        _SectionTitle(
          title: 'Zusammensetzung',
        ),
        const SizedBox(height: 12),
        DiperaCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            children: [
              _PayRow(
                label: 'Grundlohn',
                value: pay.baseGross,
              ),
              if (pay.hourlyAllowanceGross !=
                  0) ...[
                const _CardDivider(),
                _PayRow(
                  label: 'Stundenzulage',
                  value:
                      pay.hourlyAllowanceGross,
                ),
              ],
              if (pay.overtimeGross != 0) ...[
                const _CardDivider(),
                _PayRow(
                  label:
                      'Überstundenvergütung',
                  value: pay.overtimeGross,
                ),
              ],
              if (pay.totalSurchargeGross !=
                  0) ...[
                const _CardDivider(),
                _PayRow(
                  label: 'Zuschläge',
                  value:
                      pay.totalSurchargeGross,
                ),
              ],
              const Padding(
                padding:
                    EdgeInsets.symmetric(
                  vertical: 14,
                ),
                child: Divider(
                  height: 1,
                  color:
                      Color(0xFFD0D5DD),
                ),
              ),
              _PayRow(
                label: 'Gesamt',
                value: pay.estimatedGross,
                emphasized: true,
              ),
            ],
          ),
        ),
        if (pay.totalSurchargeGross != 0) ...[
          const SizedBox(height: 24),
          const _SectionTitle(
            title: 'Zuschläge',
          ),
          const SizedBox(height: 12),
          DiperaCard(
            padding:
                const EdgeInsets.all(18),
            child: Column(
              children: [
                if (pay.nightSurchargeGross !=
                    0)
                  _PayRow(
                    label: 'Nachtzuschlag',
                    value:
                        pay.nightSurchargeGross,
                  ),
                if (pay.sundaySurchargeGross !=
                    0) ...[
                  if (pay.nightSurchargeGross !=
                      0)
                    const _CardDivider(),
                  _PayRow(
                    label:
                        'Sonntagszuschlag',
                    value:
                        pay.sundaySurchargeGross,
                  ),
                ],
                if (pay.holidaySurchargeGross !=
                    0) ...[
                  if (pay.nightSurchargeGross !=
                          0 ||
                      pay.sundaySurchargeGross !=
                          0)
                    const _CardDivider(),
                  _PayRow(
                    label:
                        'Feiertagszuschlag',
                    value: pay
                        .holidaySurchargeGross,
                  ),
                ],
                if (pay.otherSurchargeGross !=
                    0) ...[
                  if (pay.nightSurchargeGross !=
                          0 ||
                      pay.sundaySurchargeGross !=
                          0 ||
                      pay.holidaySurchargeGross !=
                          0)
                    const _CardDivider(),
                  _PayRow(
                    label:
                        'Weitere Zuschläge',
                    value:
                        pay.otherSurchargeGross,
                  ),
                ],
              ],
            ),
          ),
        ],
        if (pay.hasTimeAccount) ...[
          const SizedBox(height: 24),
          const _SectionTitle(
            title: 'Stundenkonto',
          ),
          const SizedBox(height: 12),
          DiperaCard(
            padding:
                const EdgeInsets.all(18),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child:
                          _TimeAccountMetric(
                        label: 'Soll',
                        value: _formatMinutes(
                          pay.targetMinutes,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child:
                          _TimeAccountMetric(
                        label: 'Ist',
                        value: _formatMinutes(
                          pay.workedMinutes,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child:
                          _TimeAccountMetric(
                        label:
                            'Monatsdifferenz',
                        value:
                            _formatSignedMinutes(
                          pay.rawDifferenceMinutes,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child:
                          _TimeAccountMetric(
                        label:
                            'Aktueller Stand',
                        value:
                            _formatSignedMinutes(
                          pay.currentBalanceMinutes,
                        ),
                      ),
                    ),
                  ],
                ),
                if (pay
                    .targetMinutesRequiresReview) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding:
                        const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color:
                          const Color(
                        0xFFFFFAEB,
                      ),
                      borderRadius:
                          BorderRadius.circular(
                        14,
                      ),
                    ),
                    child: const Row(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons
                              .warning_amber_rounded,
                          size: 20,
                          color:
                              Color(
                            0xFFB54708,
                          ),
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Das Monatssoll muss '
                            'noch geprüft werden.',
                            style: TextStyle(
                              color:
                                  Color(
                                0xFF7A2E0E,
                              ),
                              height: 1.4,
                              fontWeight:
                                  FontWeight
                                      .w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 8),
      ],
    );
  }
}

class _GrossPayCard extends StatelessWidget {
  const _GrossPayCard({
    required this.pay,
    required this.monthLabel,
  });

  final EmployeePayOverview pay;
  final String monthLabel;

  @override
  Widget build(BuildContext context) {
    final closed = pay.isClosed;

    return DiperaCard(
      padding: EdgeInsets.zero,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF173FCE),
              Color(0xFF2F62F5),
            ],
          ),
          borderRadius:
              BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white
                        .withValues(
                      alpha: 0.15,
                    ),
                    borderRadius:
                        BorderRadius.circular(
                      14,
                    ),
                  ),
                  child: const Icon(
                    Icons.payments_outlined,
                    color: Colors.white,
                  ),
                ),
                const Spacer(),
                _PeriodBadge(
                  status:
                      pay.periodStatus,
                ),
              ],
            ),
            const SizedBox(height: 22),
            Text(
              closed
                  ? 'Bruttovergütung'
                  : 'Voraussichtliches Brutto',
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(
                    color: Colors.white
                        .withValues(
                      alpha: 0.82,
                    ),
                    fontWeight:
                        FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              _formatCurrency(
                pay.estimatedGross,
              ),
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(
                    color: Colors.white,
                    fontWeight:
                        FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 7),
            Text(
              monthLabel,
              style: TextStyle(
                color: Colors.white
                    .withValues(
                  alpha: 0.78,
                ),
                fontWeight:
                    FontWeight.w600,
              ),
            ),
            if (!closed) ...[
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: Colors.white
                      .withValues(
                    alpha: 0.12,
                  ),
                  borderRadius:
                      BorderRadius.circular(
                    14,
                  ),
                ),
                child: const Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons
                          .info_outline_rounded,
                      size: 19,
                      color: Colors.white,
                    ),
                    SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        'Der Monat ist noch '
                        'nicht abgeschlossen. '
                        'Der Betrag kann sich '
                        'durch weitere '
                        'Arbeitszeiten, '
                        'Zuschläge oder '
                        'Korrekturen ändern.',
                        style: TextStyle(
                          color:
                              Colors.white,
                          height: 1.4,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
  });

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context)
          .textTheme
          .titleMedium
          ?.copyWith(
            color:
                const Color(0xFF344054),
            fontWeight:
                FontWeight.w800,
          ),
    );
  }
}

class _PayRow extends StatelessWidget {
  const _PayRow({
    required this.label,
    required this.value,
    this.emphasized = false,
  });

  final String label;
  final double value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          const EdgeInsets.symmetric(
        vertical: 3,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: emphasized
                    ? const Color(
                        0xFF101828,
                      )
                    : const Color(
                        0xFF667085,
                      ),
                fontWeight: emphasized
                    ? FontWeight.w800
                    : FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            _formatCurrency(value),
            style: TextStyle(
              color:
                  const Color(0xFF101828),
              fontSize:
                  emphasized ? 17 : 15,
              fontWeight: emphasized
                  ? FontWeight.w900
                  : FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _CardDivider extends StatelessWidget {
  const _CardDivider();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding:
          EdgeInsets.symmetric(
        vertical: 11,
      ),
      child: Divider(
        height: 1,
        color: Color(0xFFEAECF0),
      ),
    );
  }
}

class _TimeAccountMetric
    extends StatelessWidget {
  const _TimeAccountMetric({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:
            const Color(0xFFF8FAFC),
        borderRadius:
            BorderRadius.circular(14),
        border: Border.all(
          color:
              const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color:
                  Color(0xFF667085),
              fontWeight:
                  FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              color:
                  Color(0xFF101828),
              fontWeight:
                  FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodBadge extends StatelessWidget {
  const _PeriodBadge({
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    final String label;

    switch (status) {
      case 'closed':
        label = 'Abgeschlossen';
        break;
      case 'review':
        label = 'In Prüfung';
        break;
      case 'reopened':
        label = 'Wieder geöffnet';
        break;
      default:
        label = 'Vorläufig';
    }

    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 11,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(
          alpha: 0.15,
        ),
        borderRadius:
            BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          color: Colors.white,
          fontWeight:
              FontWeight.w700,
        ),
      ),
    );
  }
}

String _formatCurrency(double value) {
  final negative = value < 0;
  final absolute = value.abs();

  final fixed =
      absolute.toStringAsFixed(2);
  final parts = fixed.split('.');

  final rawEuros = parts[0];
  final cents = parts[1];

  final buffer = StringBuffer();

  for (var i = 0;
      i < rawEuros.length;
      i++) {
    final remaining =
        rawEuros.length - i;

    buffer.write(rawEuros[i]);

    if (remaining > 1 &&
        remaining % 3 == 1) {
      buffer.write('.');
    }
  }

  return '${negative ? '−' : ''}'
      '${buffer.toString()},$cents €';
}

String _formatMinutes(
  int totalMinutes,
) {
  final absoluteMinutes =
      totalMinutes.abs();

  final hours =
      absoluteMinutes ~/ 60;
  final minutes =
      absoluteMinutes % 60;

  return '$hours:'
      '${minutes.toString().padLeft(2, '0')} h';
}

String _formatSignedMinutes(
  int totalMinutes,
) {
  final sign = totalMinutes > 0
      ? '+'
      : totalMinutes < 0
          ? '−'
          : '';

  return '$sign'
      '${_formatMinutes(totalMinutes)}';
}