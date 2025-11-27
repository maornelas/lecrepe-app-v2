import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

interface ReportesScreenProps {
  navigation?: any;
}

const ReportesScreen: React.FC<ReportesScreenProps> = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'dia' | 'semana' | 'mes'>('semana');

  // Datos de ejemplo para ventas a través del tiempo
  const salesDataByPeriod = {
    dia: {
      labels: ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'],
      datasets: [
        {
          data: [120, 180, 250, 320, 280, 350, 420],
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    },
    semana: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [
        {
          data: [1250, 1380, 1520, 1450, 1680, 1950, 2100],
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    },
    mes: {
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      datasets: [
        {
          data: [5200, 6800, 7200, 8500],
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    },
  };

  // Datos de ejemplo para productos más vendidos
  const topProductsData = {
    labels: ['Crepa Dulce', 'Frappé', 'Smoothie', 'Capuchino', 'Té'],
    datasets: [
      {
        data: [45, 38, 32, 28, 22],
      },
    ],
  };

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64;
  const chartHeight = 220;

  // Helper function to render line chart
  const renderLineChart = (data: number[], labels: string[]) => {
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;
    const chartAreaHeight = 160;

    // Calculate positions for data points
    const points = data.map((value, index) => {
      const x = (index * chartWidth) / (data.length - 1 || 1);
      const y = chartAreaHeight - ((value - minValue) / range) * chartAreaHeight;
      return { x, y, value };
    });

    return (
      <View style={styles.chartInner}>
        <View style={styles.chartArea}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[4, 3, 2, 1, 0].map((i) => {
              const value = minValue + (range * i) / 4;
              return (
                <Text key={i} style={styles.yAxisLabel}>
                  {Math.round(value).toLocaleString()}
                </Text>
              );
            })}
          </View>

          {/* Chart content */}
          <View style={[styles.chartContent, { height: chartAreaHeight }]}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    top: (chartAreaHeight * i) / 4,
                  },
                ]}
              />
            ))}

            {/* Data points */}
            {points.map((point, index) => (
              <View
                key={index}
                style={[
                  styles.dataPoint,
                  {
                    left: point.x - 6,
                    top: point.y - 6,
                  },
                ]}
              />
            ))}

            {/* Connect points with lines using absolute positioning */}
            {points.map((point, index) => {
              if (index === points.length - 1) return null;
              const nextPoint = points[index + 1];
              const dx = nextPoint.x - point.x;
              const dy = nextPoint.y - point.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              return (
                <View
                  key={`line-${index}`}
                  style={[
                    styles.dataLine,
                    {
                      left: point.x,
                      top: point.y,
                      width: distance,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisContainer}>
          {labels.map((label, index) => (
            <Text key={index} style={styles.xAxisLabel}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Helper function to render bar chart
  const renderBarChart = (data: number[], labels: string[]) => {
    const maxValue = Math.max(...data, 1);
    const barHeight = chartHeight - 60;
    const barWidth = (chartWidth - 40) / data.length - 8;

    return (
      <View style={styles.chartInner}>
        <View style={styles.chartArea}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[4, 3, 2, 1, 0].map((i) => {
              const value = (maxValue * i) / 4;
              return (
                <Text key={i} style={styles.yAxisLabel}>
                  {Math.round(value)}
                </Text>
              );
            })}
          </View>

          {/* Chart content */}
          <View style={styles.chartContent}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    bottom: (barHeight * i) / 4,
                  },
                ]}
              />
            ))}

            {/* Bars */}
            <View style={styles.barsContainer}>
              {data.map((value, index) => {
                const height = (value / maxValue) * barHeight;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: height,
                          width: barWidth,
                        },
                      ]}
                    >
                      <Text style={styles.barValue}>{value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisContainer}>
          {labels.map((label, index) => (
            <Text key={index} style={[styles.xAxisLabel, { width: barWidth + 8 }]}>
              {label.length > 8 ? label.substring(0, 7) + '...' : label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.backButtonText}>REGRESAR</Text>
        </View>
        <Text style={styles.headerTitle}>Reportes</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'dia' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('dia')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'dia' && styles.periodButtonTextActive,
              ]}
            >
              DÍA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'semana' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('semana')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'semana' && styles.periodButtonTextActive,
              ]}
            >
              SEMANA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'mes' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('mes')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'mes' && styles.periodButtonTextActive,
              ]}
            >
              MES
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards - Movidos a la parte superior */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Vendido</Text>
            <Text style={styles.summaryValue}>
              $
              {selectedPeriod === 'dia'
                ? '1,920'
                : selectedPeriod === 'semana'
                ? '11,330'
                : '27,700'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Órdenes</Text>
            <Text style={styles.summaryValue}>
              {selectedPeriod === 'dia'
                ? '28'
                : selectedPeriod === 'semana'
                ? '165'
                : '420'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Promedio</Text>
            <Text style={styles.summaryValue}>
              $
              {selectedPeriod === 'dia'
                ? '68.57'
                : selectedPeriod === 'semana'
                ? '68.67'
                : '65.95'}
            </Text>
          </View>
        </View>

        {/* Sales Over Time Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Ventas a través del tiempo</Text>
          <Text style={styles.chartSubtitle}>
            {selectedPeriod === 'dia'
              ? 'Ventas del día (en pesos)'
              : selectedPeriod === 'semana'
              ? 'Ventas de la semana (en pesos)'
              : 'Ventas del mes (en pesos)'}
          </Text>
          <View style={styles.chartWrapper}>
            {renderLineChart(
              salesDataByPeriod[selectedPeriod].datasets[0].data,
              salesDataByPeriod[selectedPeriod].labels
            )}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Ventas ($)</Text>
            </View>
          </View>
        </View>

        {/* Top Products Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Productos más vendidos</Text>
          <Text style={styles.chartSubtitle}>
            Top 5 productos (cantidad de ventas)
          </Text>
          <View style={styles.chartWrapper}>
            {renderBarChart(
              topProductsData.datasets[0].data,
              topProductsData.labels
            )}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Cantidad vendida</Text>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            📊 Estos son datos de ejemplo ilustrativos
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    fontSize: 18,
    color: '#fff',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 80, // Compensar el espacio del botón de regresar
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FF9800',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  chartInner: {
    width: '100%',
    height: 220,
  },
  chartArea: {
    flexDirection: 'row',
    height: 190,
    marginBottom: 8,
  },
  yAxisContainer: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  chartContent: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e0e0e0',
    zIndex: 0,
  },
  dataContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  dataLine: {
    position: 'absolute',
    backgroundColor: '#FF9800',
    height: 2,
    zIndex: 1,
  },
  barsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: '#FF9800',
    borderRadius: 4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    minHeight: 20,
  },
  barValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  xAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'center',
  },
  infoNote: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoNoteText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
});

export default ReportesScreen;

