import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/workshop_user.dart';
import '../../../data/models/service_record.dart';

class PerformanceView extends StatefulWidget {
  final List<WorkshopUser> users;
  final List<ServiceRecord> records;
  final bool loading;

  const PerformanceView({
    super.key,
    required this.users,
    required this.records,
    required this.loading,
  });

  @override
  State<PerformanceView> createState() => _PerformanceViewState();
}

class _PerformanceViewState extends State<PerformanceView> {
  String _timeRange = 'all'; // 'all', '30days', 'month'

  List<ServiceRecord> _getFilteredRecords() {
    if (_timeRange == 'all') return widget.records;
    final now = DateTime.now();

    if (_timeRange == '30days') {
      final thirtyDaysAgo = now.subtract(const Duration(days: 30));
      return widget.records.where((r) {
        final d = DateTime.tryParse(r.date);
        return d != null && d.isAfter(thirtyDaysAgo);
      }).toList();
    }

    if (_timeRange == 'month') {
      final startOfMonth = DateTime(now.year, now.month, 1);
      return widget.records.where((r) {
        final d = DateTime.tryParse(r.date);
        return d != null && d.isAfter(startOfMonth);
      }).toList();
    }

    return widget.records;
  }

  @override
  Widget build(BuildContext context) {
    const cyanColor = Color(0xFF06B6D4);
    final filtered = _getFilteredRecords();

    // Group by technician
    final techMap = <String, _TechMetrics>{};

    for (final u in widget.users) {
      techMap[u.id] = _TechMetrics(
        id: u.id,
        name: u.name.isNotEmpty ? u.name : 'Unnamed Advisor',
      );
    }

    for (final r in filtered) {
      String key = r.technicianId;
      final techName = r.technicianName;

      if (key.isEmpty && techName != null && techName.isNotEmpty) {
        key = techName;
      } else if (key.isEmpty) {
        key = 'unassigned';
      }

      if (!techMap.containsKey(key)) {
        final name = (techName != null && techName.isNotEmpty)
            ? techName
            : (key == 'unassigned' ? 'Unassigned' : 'Unknown Advisor');
        techMap[key] = _TechMetrics(id: key, name: name);
      }

      final item = techMap[key]!;
      item.total += 1;
      if (r.status == ServiceStatus.completed) {
        item.completed += 1;
        item.totalRevenue += r.totalCost;
        item.laborRevenue += r.laborCost;
      } else if (r.status == ServiceStatus.inProgress) {
        item.inProgress += 1;
      } else if (r.status == ServiceStatus.pending) {
        item.pending += 1;
      }
    }

    final techList = techMap.values.toList()
      ..sort((a, b) => b.completed.compareTo(a.completed));

    final totalCompleted = techList.fold(0, (acc, t) => acc + t.completed);
    final totalActive = techList.fold(0, (acc, t) => acc + t.inProgress + t.pending);
    final totalRevenue = techList.fold(0.0, (acc, t) => acc + t.totalRevenue);

    if (widget.loading && widget.records.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(strokeWidth: 2, color: cyanColor),
              SizedBox(height: 12),
              Text(
                'CALCULATING TECHNICIAN METRICS...',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        // Time Range Filter Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: WorkshopTheme.darkSurface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: WorkshopTheme.darkBorder.withValues(alpha: 0.5)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.clock, size: 14, color: cyanColor),
                  SizedBox(width: 8),
                  Text(
                    'TIME RANGE FILTER',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: WorkshopTheme.darkSurface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: WorkshopTheme.darkBorder),
                ),
                child: Row(
                  children: [
                    _buildRangeButton('all', 'All Time', cyanColor),
                    _buildRangeButton('30days', 'Last 30 Days', cyanColor),
                    _buildRangeButton('month', 'This Month', cyanColor),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // 3 Summary Metric Tiles
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 500;
            return Flex(
              direction: isWide ? Axis.horizontal : Axis.vertical,
              children: [
                _buildSummaryCard(
                  icon: LucideIcons.checkCircle2,
                  iconColor: WorkshopTheme.statusSuccess,
                  label: 'COMPLETED JOBS',
                  value: totalCompleted.toString(),
                  isExpanded: isWide,
                ),
                SizedBox(width: isWide ? 8 : 0, height: isWide ? 0 : 8),
                _buildSummaryCard(
                  icon: LucideIcons.wrench,
                  iconColor: cyanColor,
                  label: 'ACTIVE JOBS',
                  value: totalActive.toString(),
                  isExpanded: isWide,
                ),
                SizedBox(width: isWide ? 8 : 0, height: isWide ? 0 : 8),
                _buildSummaryCard(
                  icon: LucideIcons.dollarSign,
                  iconColor: WorkshopTheme.emeraldAccent,
                  label: 'REVENUE GENERATED',
                  value: Formatters.currency(totalRevenue),
                  isExpanded: isWide,
                ),
              ],
            );
          },
        ),

        const SizedBox(height: 20),

        // Bar Chart Section
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: WorkshopTheme.darkSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: WorkshopTheme.darkBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(LucideIcons.barChart2, size: 16, color: cyanColor),
                  SizedBox(width: 8),
                  Text(
                    'Jobs Completed vs Active per Technician',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (techList.isEmpty || techList.every((t) => t.total == 0))
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  alignment: Alignment.center,
                  child: const Text(
                    'NO TECHNICIAN RECORDS FOUND FOR SELECTED PERIOD.',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: WorkshopTheme.darkTextMuted,
                      letterSpacing: 0.8,
                    ),
                  ),
                )
              else ...[
                SizedBox(
                  height: 200,
                  child: BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: (techList.map((t) => t.completed > (t.inProgress + t.pending) ? t.completed : (t.inProgress + t.pending)).fold(0, (a, b) => a > b ? a : b) + 2).toDouble(),
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: (_) => const Color(0xFF131B23),
                          tooltipBorder: const BorderSide(color: WorkshopTheme.darkBorder),
                          tooltipBorderRadius: BorderRadius.circular(8),
                          getTooltipItem: (group, groupIndex, rod, rodIndex) {
                            final tech = techList[group.x.toInt()];
                            final isCompleted = rodIndex == 0;
                            return BarTooltipItem(
                              '${tech.name}\n${isCompleted ? 'Completed' : 'Active'}: ${rod.toY.toInt()}',
                              const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            );
                          },
                        ),
                      ),
                      titlesData: FlTitlesData(
                        show: true,
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 28,
                            getTitlesWidget: (val, meta) {
                              if (val % 1 != 0) return const SizedBox.shrink();
                              return Text(
                                val.toInt().toString(),
                                style: const TextStyle(
                                  color: WorkshopTheme.darkTextMuted,
                                  fontSize: 10,
                                ),
                              );
                            },
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 24,
                            getTitlesWidget: (val, meta) {
                              final idx = val.toInt();
                              if (idx < 0 || idx >= techList.length) return const SizedBox.shrink();
                              final name = techList[idx].name;
                              final shortName = name.split(' ').first;
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  shortName,
                                  style: const TextStyle(
                                    color: WorkshopTheme.darkTextMuted,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: 2,
                        getDrawingHorizontalLine: (val) => FlLine(
                          color: Colors.white.withValues(alpha: 0.05),
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: techList.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final t = entry.value;
                        return BarChartGroupData(
                          x: idx,
                          barRods: [
                            BarChartRodData(
                              toY: t.completed.toDouble(),
                              color: WorkshopTheme.statusSuccess,
                              width: 12,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            ),
                            BarChartRodData(
                              toY: (t.inProgress + t.pending).toDouble(),
                              color: cyanColor,
                              width: 12,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildLegendItem(WorkshopTheme.statusSuccess, 'Completed'),
                    const SizedBox(width: 20),
                    _buildLegendItem(cyanColor, 'Active'),
                  ],
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Detailed Performance Breakdown
        const Text(
          'DETAILED PERFORMANCE BREAKDOWN',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 12),

        Container(
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: WorkshopTheme.darkBorder),
              bottom: BorderSide(color: WorkshopTheme.darkBorder),
            ),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: techList.length,
            separatorBuilder: (_, _) => const Divider(
              height: 1,
              color: WorkshopTheme.darkBorder,
            ),
            itemBuilder: (context, index) {
              final t = techList[index];
              final rate = t.total > 0 ? ((t.completed / t.total) * 100).round() : 0;
              final initials = t.name.length >= 2
                  ? t.name.substring(0, 2).toUpperCase()
                  : t.name.toUpperCase();

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: cyanColor.withValues(alpha: 0.15),
                          child: Text(
                            initials,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: cyanColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.name,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: WorkshopTheme.darkTextPrimary,
                                ),
                              ),
                              Text(
                                '${t.total} total assigned work orders',
                                style: WorkshopTheme.numeric(
                                  fontSize: 11,
                                  color: WorkshopTheme.darkTextMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            _buildMiniStat('COMPLETED', t.completed.toString(), WorkshopTheme.statusSuccess),
                            const SizedBox(width: 14),
                            _buildMiniStat('ACTIVE', (t.inProgress + t.pending).toString(), cyanColor),
                            const SizedBox(width: 14),
                            Container(
                              padding: const EdgeInsets.only(left: 14),
                              decoration: const BoxDecoration(
                                border: Border(left: BorderSide(color: WorkshopTheme.darkBorder)),
                              ),
                              child: _buildMiniStat(
                                'REVENUE',
                                Formatters.currency(t.totalRevenue),
                                WorkshopTheme.emeraldAccent,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Progress Bar
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Completion Rate',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                        Text(
                          '$rate%',
                          style: WorkshopTheme.numeric(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: Container(
                        height: 6,
                        width: double.infinity,
                        color: WorkshopTheme.darkSurface,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: rate / 100.0,
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [cyanColor, WorkshopTheme.statusSuccess],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMiniStat(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.6,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        Text(
          value,
          style: WorkshopTheme.numeric(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildRangeButton(String key, String label, Color accentColor) {
    final isSelected = _timeRange == key;
    return InkWell(
      onTap: () => setState(() => _timeRange = key),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.6,
            color: isSelected ? Colors.black : WorkshopTheme.darkTextMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required bool isExpanded,
  }) {
    final cardContent = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WorkshopTheme.darkSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: WorkshopTheme.darkBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: iconColor.withValues(alpha: 0.25)),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: WorkshopTheme.numeric(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: WorkshopTheme.darkTextPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );

    if (isExpanded) return Expanded(child: cardContent);
    return cardContent;
  }
}

class _TechMetrics {
  final String id;
  final String name;
  int completed = 0;
  int inProgress = 0;
  int pending = 0;
  int total = 0;
  double totalRevenue = 0;
  double laborRevenue = 0;

  _TechMetrics({required this.id, required this.name});
}
