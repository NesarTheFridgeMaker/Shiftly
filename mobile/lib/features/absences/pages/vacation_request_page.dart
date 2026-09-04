import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_providers.dart';
import '../../dashboard/providers/vacation_balance_providers.dart';
import '../providers/vacation_request_providers.dart';

class VacationRequestPage extends ConsumerStatefulWidget {
  const VacationRequestPage({super.key});

  @override
  ConsumerState<VacationRequestPage> createState() =>
      _VacationRequestPageState();
}

class _VacationRequestPageState
    extends ConsumerState<VacationRequestPage> {
  final _noteController = TextEditingController();

  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();

    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? now,
      firstDate: DateTime(now.year - 1, 1, 1),
      lastDate: DateTime(now.year + 2, 12, 31),
      helpText: 'Urlaubsbeginn auswählen',
      cancelText: 'Abbrechen',
      confirmText: 'Übernehmen',
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _startDate = picked;

      if (_endDate != null && _endDate!.isBefore(picked)) {
        _endDate = picked;
      }
    });
  }

  Future<void> _pickEndDate() async {
    final now = DateTime.now();
    final firstDate = _startDate ?? DateTime(now.year - 1, 1, 1);

    final initialDate = _endDate ??
        _startDate ??
        now;

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate.isBefore(firstDate)
          ? firstDate
          : initialDate,
      firstDate: firstDate,
      lastDate: DateTime(now.year + 2, 12, 31),
      helpText: 'Urlaubsende auswählen',
      cancelText: 'Abbrechen',
      confirmText: 'Übernehmen',
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _endDate = picked;
    });
  }

  String _formatDate(DateTime? date) {
    if (date == null) {
      return 'Datum auswählen';
    }

    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');

    return '$day.$month.${date.year}';
  }

  Future<void> _submit() async {
    final startDate = _startDate;
    final endDate = _endDate;

    if (startDate == null || endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Bitte wähle Start- und Enddatum aus.',
          ),
        ),
      );
      return;
    }

    if (endDate.isBefore(startDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Das Enddatum darf nicht vor dem Startdatum liegen.',
          ),
        ),
      );
      return;
    }

    final success = await ref
        .read(vacationRequestControllerProvider.notifier)
        .submit(
          startDate: startDate,
          endDate: endDate,
          note: _noteController.text,
        );

    if (!mounted) {
      return;
    }

    if (!success) {
      final state = ref.read(vacationRequestControllerProvider);

      final message = state.hasError
          ? 'Der Urlaubsantrag konnte nicht gesendet werden.'
          : 'Der Urlaubsantrag konnte nicht gespeichert werden.';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
      return;
    }

    ref.invalidate(employeeAbsencesProvider);
    ref.invalidate(currentVacationBalanceProvider);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Dein Urlaubsantrag wurde gesendet.',
        ),
      ),
    );

    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final submitState =
        ref.watch(vacationRequestControllerProvider);
    final isSubmitting = submitState.isLoading;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      appBar: AppBar(
        title: const Text('Urlaub beantragen'),
        backgroundColor: const Color(0xFFF6F8FB),
        surfaceTintColor: const Color(0xFFF6F8FB),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            Text(
              'Zeitraum',
              style: theme.textTheme.titleMedium?.copyWith(
                color: const Color(0xFF344054),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            _DateField(
              label: 'Von',
              value: _formatDate(_startDate),
              onTap: isSubmitting ? null : _pickStartDate,
            ),
            const SizedBox(height: 12),
            _DateField(
              label: 'Bis',
              value: _formatDate(_endDate),
              onTap: isSubmitting ? null : _pickEndDate,
            ),
            const SizedBox(height: 24),
            Text(
              'Notiz (optional)',
              style: theme.textTheme.titleMedium?.copyWith(
                color: const Color(0xFF344054),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              enabled: !isSubmitting,
              minLines: 4,
              maxLines: 6,
              decoration: InputDecoration(
                hintText:
                    'Zum Beispiel: Familienurlaub oder Reise bereits gebucht.',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(
                    color: Color(0xFFD0D5DD),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(
                    color: Color(0xFFD0D5DD),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF8FF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    color: Color(0xFF175CD3),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Der Antrag wird zunächst als ausstehend gespeichert. '
                      'Dein verfügbarer Urlaub reduziert sich erst nach der '
                      'Genehmigung.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFF344054),
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: isSubmitting ? null : _submit,
              icon: isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
              label: Text(
                isSubmitting
                    ? 'Wird gesendet …'
                    : 'Urlaubsantrag senden',
              ),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  vertical: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFFD0D5DD),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFFFFAEB),
                borderRadius: BorderRadius.circular(13),
              ),
              child: const Icon(
                Icons.calendar_month_outlined,
                color: Color(0xFFB54708),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF667085),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: const Color(0xFF101828),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF98A2B3),
            ),
          ],
        ),
      ),
    );
  }
}
