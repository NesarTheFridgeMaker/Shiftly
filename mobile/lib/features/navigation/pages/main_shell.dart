
import 'package:flutter/material.dart';

import '../../dashboard/pages/dashboard_page.dart';
import '../../schedule/pages/schedule_page.dart';
import '../../time_tracking/pages/punch_page.dart';
import '../../time_tracking/pages/working_times_page.dart';
import 'more_page.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  static const List<Widget> _pages = [
    DashboardPage(),
    PunchPage(),
    WorkingTimesPage(),
    SchedulePage(),
    MorePage(),
  ];

  void _selectTab(int index) {
    if (_selectedIndex == index) {
      return;
    }

    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final textScaler = MediaQuery.textScalerOf(context);

    final useIconOnlyNavigation =
        textScaler.scale(14) > 18;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      body: IndexedStack(
        index: _selectedIndex,
        children: _pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _selectTab,
        height: 72,
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: const Color(0xFFEFF4FF),
        labelBehavior: useIconOnlyNavigation
            ? NavigationDestinationLabelBehavior.alwaysHide
            : NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            tooltip: 'Übersicht',
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Übersicht',
          ),
          NavigationDestination(
            tooltip: 'Stempeln',
            icon: Icon(Icons.fingerprint_outlined),
            selectedIcon: Icon(Icons.fingerprint_rounded),
            label: 'Stempeln',
          ),
          NavigationDestination(
            tooltip: 'Zeiten',
            icon: Icon(Icons.access_time_outlined),
            selectedIcon: Icon(Icons.access_time_rounded),
            label: 'Zeiten',
          ),
          NavigationDestination(
            tooltip: 'Schichten',
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month_rounded),
            label: 'Schichten',
          ),
          NavigationDestination(
            tooltip: 'Mehr',
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Mehr',
          ),
        ],
      ),
    );
  }
}
