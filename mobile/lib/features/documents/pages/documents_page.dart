import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/services/document_service.dart';
import '../../../shared/widgets/dipera_card.dart';
import '../../auth/providers/auth_providers.dart';

class DocumentsPage extends ConsumerStatefulWidget {
  const DocumentsPage({super.key});

  @override
  ConsumerState<DocumentsPage> createState() {
    return _DocumentsPageState();
  }
}

class _DocumentsPageState extends ConsumerState<DocumentsPage> {
  final TextEditingController _searchController =
      TextEditingController();

  DocumentCategory? _selectedCategory;
  String? _openingDocumentId;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(employeeDocumentsProvider);

    await ref.read(employeeDocumentsProvider.future);
  }

  Future<void> _openDocument(
    EmployeeDocument document,
  ) async {
    if (_openingDocumentId != null) {
      return;
    }

    setState(() {
      _openingDocumentId = document.id;
    });

    try {
      final service = ref.read(documentServiceProvider);

      final signedUrl = await service.createSignedUrl(
        document: document,
      );

      final uri = Uri.parse(signedUrl);

      final opened = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      if (!opened && mounted) {
        _showError(
          'Das Dokument konnte nicht geöffnet werden.',
        );
      }
    } catch (error) {
      if (mounted) {
        _showError(
          'Für das Dokument konnte kein sicherer Link erstellt werden.',
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _openingDocumentId = null;
        });
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  bool _matchesSearch(EmployeeDocument document) {
    final search =
        _searchController.text.trim().toLowerCase();

    if (search.isEmpty) {
      return true;
    }

    final searchableText = [
      document.title,
      document.description ?? '',
      document.fileName,
      document.categoryLabel,
      document.fileTypeLabel,
    ].join(' ').toLowerCase();

    return searchableText.contains(search);
  }

  bool _matchesCategory(EmployeeDocument document) {
    return _selectedCategory == null ||
        document.category == _selectedCategory;
  }

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');

    return '$day.$month.${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final documentsAsync = ref.watch(
      employeeDocumentsProvider,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: documentsAsync.when(
            loading: () => const _LoadingView(),
            error: (error, stackTrace) => _ErrorView(
              onRetry: () {
                ref.invalidate(employeeDocumentsProvider);
              },
            ),
            data: (documents) {
              final filteredDocuments = documents
                  .where(_matchesSearch)
                  .where(_matchesCategory)
                  .toList();

              final payslipCount = documents
                  .where(
                    (document) =>
                        document.category ==
                        DocumentCategory.payslip,
                  )
                  .length;

              return ListView(
                physics:
                    const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  20,
                  20,
                  20,
                  36,
                ),
                children: [
                  Row(
                    children: [
                      IconButton(
                        tooltip: 'Zurück',
                        onPressed: () {
                          Navigator.of(context).pop();
                        },
                        icon: const Icon(
                          Icons.arrow_back_rounded,
                        ),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor:
                              const Color(0xFF344054),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Dokumente',
                          style: theme
                              .textTheme.headlineSmall
                              ?.copyWith(
                            color:
                                const Color(0xFF101828),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Text(
                      'Deine persönlichen Dokumente und '
                      'Lohnabrechnungen.',
                      style:
                          theme.textTheme.bodyLarge?.copyWith(
                        color: const Color(0xFF667085),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  Row(
                    children: [
                      Expanded(
                        child: _StatisticCard(
                          icon:
                              Icons.description_outlined,
                          label: 'Dokumente',
                          value: '${documents.length}',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatisticCard(
                          icon:
                              Icons.receipt_long_outlined,
                          label: 'Abrechnungen',
                          value: '$payslipCount',
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  TextField(
                    controller: _searchController,
                    onChanged: (_) {
                      setState(() {});
                    },
                    decoration: InputDecoration(
                      hintText: 'Dokumente durchsuchen',
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                      ),
                      suffixIcon:
                          _searchController.text.isNotEmpty
                              ? IconButton(
                                  onPressed: () {
                                    _searchController.clear();

                                    setState(() {});
                                  },
                                  icon: const Icon(
                                    Icons.close_rounded,
                                  ),
                                )
                              : null,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: Color(0xFFE2E8F0),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: Color(0xFFE2E8F0),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: Color(0xFF2563EB),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _CategoryChip(
                          label: 'Alle',
                          isSelected:
                              _selectedCategory == null,
                          onSelected: () {
                            setState(() {
                              _selectedCategory = null;
                            });
                          },
                        ),
                        ...DocumentCategory.values.map(
                          (category) => Padding(
                            padding:
                                const EdgeInsets.only(
                              left: 8,
                            ),
                            child: _CategoryChip(
                              label:
                                  _categoryLabel(category),
                              isSelected:
                                  _selectedCategory ==
                                  category,
                              onSelected: () {
                                setState(() {
                                  _selectedCategory =
                                      category;
                                });
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 22),

                  if (documents.isEmpty)
                    const _NoDocumentsView()
                  else if (filteredDocuments.isEmpty)
                    const _NoSearchResultsView()
                  else
                    ...filteredDocuments.map(
                      (document) => Padding(
                        padding:
                            const EdgeInsets.only(
                          bottom: 12,
                        ),
                        child: _DocumentCard(
                          document: document,
                          formattedDate: _formatDate(
                            document.createdAt,
                          ),
                          isOpening:
                              _openingDocumentId ==
                              document.id,
                          onOpen: () {
                            _openDocument(document);
                          },
                        ),
                      ),
                    ),

                  const SizedBox(height: 10),

                  const _PrivacyNotice(),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _StatisticCard extends StatelessWidget {
  const _StatisticCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DiperaCard(
      padding: const EdgeInsets.all(16),
      child: Column(
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
              icon,
              color: const Color(0xFF2563EB),
              size: 22,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              color: const Color(0xFF101828),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF667085),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        onSelected();
      },
      showCheckmark: false,
      backgroundColor: Colors.white,
      selectedColor: const Color(0xFFEFF6FF),
      side: BorderSide(
        color: isSelected
            ? const Color(0xFF93C5FD)
            : const Color(0xFFE2E8F0),
      ),
      labelStyle:
          Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: isSelected
                    ? const Color(0xFF1D4ED8)
                    : const Color(0xFF475467),
                fontWeight: isSelected
                    ? FontWeight.w700
                    : FontWeight.w600,
              ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  const _DocumentCard({
    required this.document,
    required this.formattedDate,
    required this.isOpening,
    required this.onOpen,
  });

  final EmployeeDocument document;
  final String formattedDate;
  final bool isOpening;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categoryStyle = _categoryStyle(
      document.category,
    );

    return DiperaCard(
      padding: const EdgeInsets.all(18),
      onTap: isOpening ? null : onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: categoryStyle.backgroundColor,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  categoryStyle.icon,
                  color: categoryStyle.foregroundColor,
                  size: 25,
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            document.title,
                            style: theme
                                .textTheme.titleMedium
                                ?.copyWith(
                              color:
                                  const Color(0xFF101828),
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        if (isOpening)
                          const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                            ),
                          )
                        else
                          const Icon(
                            Icons.open_in_new_rounded,
                            color: Color(0xFF98A2B3),
                            size: 21,
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 7,
                      children: [
                        _DocumentBadge(
                          label: document.categoryLabel,
                          foregroundColor:
                              categoryStyle.foregroundColor,
                          backgroundColor:
                              categoryStyle.backgroundColor,
                        ),
                        _DocumentBadge(
                          label: document.fileTypeLabel,
                          foregroundColor:
                              const Color(0xFF475467),
                          backgroundColor:
                              const Color(0xFFF2F4F7),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (document.description != null &&
              document.description!.trim().isNotEmpty) ...[
            const SizedBox(height: 15),
            Text(
              document.description!.trim(),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF667085),
                height: 1.45,
              ),
            ),
          ],

          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                _DocumentMetaRow(
                  icon: Icons.calendar_today_outlined,
                  label: 'Hochgeladen',
                  value: formattedDate,
                ),
                const SizedBox(height: 9),
                _DocumentMetaRow(
                  icon: Icons.insert_drive_file_outlined,
                  label: 'Datei',
                  value: document.fileName,
                ),
              ],
            ),
          ),

          const SizedBox(height: 15),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: isOpening ? null : onOpen,
              icon: isOpening
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(
                      Icons.open_in_new_rounded,
                    ),
              label: Text(
                isOpening
                    ? 'Dokument wird geöffnet'
                    : 'Dokument öffnen',
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                backgroundColor:
                    const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                disabledBackgroundColor:
                    const Color(0xFF93C5FD),
                disabledForegroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DocumentBadge extends StatelessWidget {
  const _DocumentBadge({
    required this.label,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final String label;
  final Color foregroundColor;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
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
        label,
        style: Theme.of(context)
            .textTheme
            .bodySmall
            ?.copyWith(
              color: foregroundColor,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _DocumentMetaRow extends StatelessWidget {
  const _DocumentMetaRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 17,
          color: const Color(0xFF667085),
        ),
        const SizedBox(width: 9),
        Text(
          '$label:',
          style: theme.textTheme.bodySmall?.copyWith(
            color: const Color(0xFF667085),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            overflow: TextOverflow.ellipsis,
            maxLines: 2,
            style: theme.textTheme.bodySmall?.copyWith(
              color: const Color(0xFF344054),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        20,
        20,
        20,
        36,
      ),
      children: [
        Text(
          'Dokumente',
          style: Theme.of(context)
              .textTheme
              .headlineSmall
              ?.copyWith(
                color: const Color(0xFF101828),
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Deine Dokumente werden geladen.',
          style:
              Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: const Color(0xFF667085),
                  ),
        ),
        const SizedBox(height: 32),
        const Center(
          child: CircularProgressIndicator(),
        ),
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
      padding: const EdgeInsets.fromLTRB(
        20,
        20,
        20,
        36,
      ),
      children: [
        const SizedBox(height: 80),
        const Icon(
          Icons.error_outline_rounded,
          size: 48,
          color: Color(0xFFD92D20),
        ),
        const SizedBox(height: 18),
        Text(
          'Dokumente konnten nicht geladen werden',
          textAlign: TextAlign.center,
          style:
              Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: const Color(0xFF101828),
                    fontWeight: FontWeight.w800,
                  ),
        ),
        const SizedBox(height: 8),
        Text(
          'Prüfe deine Verbindung und versuche es erneut.',
          textAlign: TextAlign.center,
          style:
              Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF667085),
                  ),
        ),
        const SizedBox(height: 18),
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

class _NoDocumentsView extends StatelessWidget {
  const _NoDocumentsView();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(19),
            ),
            child: const Icon(
              Icons.description_outlined,
              color: Color(0xFF2563EB),
              size: 28,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Noch keine Dokumente',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(
                  color: const Color(0xFF101828),
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 7),
          Text(
            'Sobald dein Betrieb ein Dokument bereitstellt, '
            'erscheint es hier.',
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(
                  color: const Color(0xFF667085),
                ),
          ),
        ],
      ),
    );
  }
}

class _NoSearchResultsView extends StatelessWidget {
  const _NoSearchResultsView();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(
            Icons.search_off_rounded,
            size: 42,
            color: Color(0xFF667085),
          ),
          const SizedBox(height: 14),
          Text(
            'Keine passenden Dokumente',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(
                  color: const Color(0xFF101828),
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 7),
          Text(
            'Passe deine Suche oder den Filter an.',
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(
                  color: const Color(0xFF667085),
                ),
          ),
        ],
      ),
    );
  }
}

class _PrivacyNotice extends StatelessWidget {
  const _PrivacyNotice();

  @override
  Widget build(BuildContext context) {
    return DiperaCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFF4EBFF),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.lock_outline_rounded,
              color: Color(0xFF6941C6),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Geschützt und privat',
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(
                        color: const Color(0xFF101828),
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 5),
                Text(
                  'Deine Dokumente sind nur für dein eigenes '
                  'Mitarbeiterkonto sichtbar und werden über '
                  'zeitlich begrenzte Links geöffnet.',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(
                        color: const Color(0xFF667085),
                        height: 1.45,
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

class _DocumentCategoryStyle {
  const _DocumentCategoryStyle({
    required this.icon,
    required this.foregroundColor,
    required this.backgroundColor,
  });

  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;
}

_DocumentCategoryStyle _categoryStyle(
  DocumentCategory category,
) {
  switch (category) {
    case DocumentCategory.payslip:
      return const _DocumentCategoryStyle(
        icon: Icons.receipt_long_outlined,
        foregroundColor: Color(0xFF027A48),
        backgroundColor: Color(0xFFECFDF3),
      );

    case DocumentCategory.employmentContract:
      return const _DocumentCategoryStyle(
        icon: Icons.assignment_outlined,
        foregroundColor: Color(0xFF175CD3),
        backgroundColor: Color(0xFFEFF8FF),
      );

    case DocumentCategory.certificate:
      return const _DocumentCategoryStyle(
        icon: Icons.workspace_premium_outlined,
        foregroundColor: Color(0xFF6941C6),
        backgroundColor: Color(0xFFF4EBFF),
      );

    case DocumentCategory.tax:
      return const _DocumentCategoryStyle(
        icon: Icons.account_balance_outlined,
        foregroundColor: Color(0xFFB54708),
        backgroundColor: Color(0xFFFFFAEB),
      );

    case DocumentCategory.warning:
      return const _DocumentCategoryStyle(
        icon: Icons.warning_amber_rounded,
        foregroundColor: Color(0xFFC4320A),
        backgroundColor: Color(0xFFFFF6ED),
      );

    case DocumentCategory.termination:
      return const _DocumentCategoryStyle(
        icon: Icons.cancel_outlined,
        foregroundColor: Color(0xFFB42318),
        backgroundColor: Color(0xFFFEF3F2),
      );

    case DocumentCategory.other:
      return const _DocumentCategoryStyle(
        icon: Icons.insert_drive_file_outlined,
        foregroundColor: Color(0xFF475467),
        backgroundColor: Color(0xFFF2F4F7),
      );
  }
}

String _categoryLabel(DocumentCategory category) {
  switch (category) {
    case DocumentCategory.payslip:
      return 'Lohnabrechnung';

    case DocumentCategory.employmentContract:
      return 'Arbeitsvertrag';

    case DocumentCategory.certificate:
      return 'Bescheinigung';

    case DocumentCategory.tax:
      return 'Steuerdokument';

    case DocumentCategory.warning:
      return 'Abmahnung';

    case DocumentCategory.termination:
      return 'Kündigung';

    case DocumentCategory.other:
      return 'Sonstiges';
  }
}