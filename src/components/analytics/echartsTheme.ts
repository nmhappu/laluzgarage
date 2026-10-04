import * as echarts from 'echarts/core';

export const OBSIDIAN_THEME_NAME = 'obsidian_laluz';

export const OBSIDIAN_PALETTE = [
  '#10B981', // Emerald Primary / Success
  '#3B82F6', // Cobalt Blue
  '#06B6D4', // Cyan
  '#FBBF24', // Amber
  '#F43F5E', // Rose Urgent
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

let isThemeRegistered = false;

export function registerObsidianTheme() {
  if (isThemeRegistered) return;
  echarts.registerTheme(OBSIDIAN_THEME_NAME, {
    color: OBSIDIAN_PALETTE,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: '"Google Sans", "Google Sans Text", sans-serif',
      color: '#94A3B8',
    },
    title: {
      textStyle: {
        color: '#F8FAFC',
        fontWeight: 'bold',
      },
      subtextStyle: {
        color: '#64748B',
      },
    },
    grid: {
      top: 24,
      right: 16,
      bottom: 24,
      left: 16,
      containLabel: true,
      borderColor: 'transparent',
    },
    tooltip: {
      backgroundColor: 'rgba(7, 8, 10, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: {
        color: '#F8FAFC',
        fontSize: 12,
        fontFamily: '"Google Sans", sans-serif',
      },
      extraCssText: 'backdrop-filter: blur(12px); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);',
    },
    legend: {
      textStyle: {
        color: '#94A3B8',
        fontSize: 11,
        fontFamily: '"Google Sans", sans-serif',
      },
      inactiveColor: '#475569',
    },
    categoryAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#64748B',
        fontSize: 11,
      },
      splitLine: {
        show: false,
      },
    },
    valueAxis: {
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#64748B',
        fontSize: 11,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.06)',
          type: 'dashed',
        },
      },
    },
    dataZoom: {
      backgroundColor: 'rgba(255,255,255,0.02)',
      dataBackgroundColor: 'rgba(255,255,255,0.05)',
      fillerColor: 'rgba(16, 185, 129, 0.15)',
      handleColor: '#10B981',
      handleSize: '100%',
      textStyle: {
        color: '#94A3B8',
      },
    },
  });
  isThemeRegistered = true;
}
