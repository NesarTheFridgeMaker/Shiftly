import 'package:supabase_flutter/supabase_flutter.dart';

enum DocumentCategory {
  payslip,
  employmentContract,
  certificate,
  tax,
  warning,
  termination,
  other,
}

class EmployeeDocument {
  const EmployeeDocument({
    required this.id,
    required this.businessId,
    required this.employeeId,
    required this.category,
    required this.title,
    required this.fileName,
    required this.storagePath,
    required this.mimeType,
    required this.sizeBytes,
    required this.createdAt,
    this.description,
  });

  final String id;
  final String businessId;
  final String employeeId;
  final DocumentCategory category;
  final String title;
  final String? description;
  final String fileName;
  final String storagePath;
  final String mimeType;
  final int sizeBytes;
  final DateTime createdAt;

  String get categoryLabel {
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

  String get fileTypeLabel {
    switch (mimeType) {
      case 'application/pdf':
        return 'PDF';
      case 'image/jpeg':
        return 'JPG';
      case 'image/png':
        return 'PNG';
      default:
        return 'Datei';
    }
  }

  String get formattedFileSize {
    if (sizeBytes < 1024) {
      return '$sizeBytes B';
    }

    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    }

    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  static DocumentCategory parseCategory(String? value) {
    switch (value) {
      case 'payslip':
        return DocumentCategory.payslip;
      case 'employment_contract':
        return DocumentCategory.employmentContract;
      case 'certificate':
        return DocumentCategory.certificate;
      case 'tax':
        return DocumentCategory.tax;
      case 'warning':
        return DocumentCategory.warning;
      case 'termination':
        return DocumentCategory.termination;
      default:
        return DocumentCategory.other;
    }
  }
}

class DocumentService {
  DocumentService(this._client);

  static const String storageBucket = 'employee-documents';

  final SupabaseClient _client;

  Future<List<EmployeeDocument>> getEmployeeDocuments({
    required String employeeId,
  }) async {
    final data = await _client
        .from('employee_documents')
        .select(
          '''
          id,
          business_id,
          employee_id,
          category,
          title,
          description,
          file_name,
          storage_path,
          mime_type,
          size_bytes,
          created_at
          ''',
        )
        .eq('employee_id', employeeId)
        .order('created_at', ascending: false);

    return (data as List<dynamic>).map((row) {
      final map = row as Map<String, dynamic>;

      return EmployeeDocument(
        id: map['id'] as String,
        businessId: map['business_id'] as String,
        employeeId: map['employee_id'] as String,
        category: EmployeeDocument.parseCategory(
          map['category'] as String?,
        ),
        title: (map['title'] as String?)?.trim().isNotEmpty == true
            ? (map['title'] as String).trim()
            : 'Dokument',
        description: map['description'] as String?,
        fileName: map['file_name'] as String,
        storagePath: map['storage_path'] as String,
        mimeType: map['mime_type'] as String? ?? '',
        sizeBytes: (map['size_bytes'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.parse(map['created_at'] as String),
      );
    }).toList();
  }

  Future<String> createSignedUrl({
    required EmployeeDocument document,
  }) async {
    return _client.storage
        .from(storageBucket)
        .createSignedUrl(
          document.storagePath,
          60,
        );
  }
}