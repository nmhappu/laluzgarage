import { useEffect, useRef, memo } from 'react';
import * as echarts from 'echarts/core';
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  HeatmapChart,
  RadarChart,
  TreemapChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { registerObsidianTheme, OBSIDIAN_THEME_NAME } from './echartsTheme';

// Register required components once
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  HeatmapChart,
  RadarChart,
  TreemapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

registerObsidianTheme();

export interface EChartsReactProps {
  option: echarts.EChartsCoreOption;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  onChartClick?: (params: any) => void;
}

export const EChartsReact = memo(function EChartsReact({
  option,
  className = 'w-full h-full min-h-[160px]',
  style,
  loading = false,
  onChartClick,
}: EChartsReactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Initialize ECharts instance on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Dispose existing instance if any
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const chart = echarts.init(containerRef.current, OBSIDIAN_THEME_NAME, {
      renderer: 'canvas',
    });
    chartInstance.current = chart;

    // Attach click handler if provided
    if (onChartClick) {
      chart.on('click', onChartClick);
    }

    // Attach ResizeObserver for fluid container responsiveness
    let animationFrameId: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (chartInstance.current && !chartInstance.current.isDisposed()) {
          chartInstance.current.resize();
        }
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (chartInstance.current) {
        if (onChartClick) {
          chartInstance.current.off('click', onChartClick);
        }
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [onChartClick]);

  // Reactive option updates
  useEffect(() => {
    if (!chartInstance.current || chartInstance.current.isDisposed()) return;

    if (loading) {
      chartInstance.current.showLoading({
        text: 'Loading...',
        color: '#10B981',
        textColor: '#94A3B8',
        maskColor: 'rgba(7, 8, 10, 0.6)',
      });
    } else {
      chartInstance.current.hideLoading();
      chartInstance.current.setOption(option, {
        notMerge: true,
        lazyUpdate: true,
      });
    }
  }, [option, loading]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
});
