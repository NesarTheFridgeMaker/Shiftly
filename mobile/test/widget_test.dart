import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';

void main() {
  testWidgets('Dipera app starts successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const DiperaApp());

    expect(find.text('Dipera'), findsOneWidget);
    expect(find.text('Willkommen bei Dipera'), findsOneWidget);
  });
}