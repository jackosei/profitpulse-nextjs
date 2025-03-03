import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Trade } from '@/types/pulse';
import { Menu } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type TimeFrame = 'day' | 'week' | 'month' | 'year';

const TIME_FRAMES = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
  { label: 'Yearly', value: 'year' },
] as const;

interface PulseChartProps {
  trades: Trade[];
  timeRange: '7D' | '30D' | '90D' | '1Y' | 'ALL';
}

export default function PulseChart({ trades, timeRange }: PulseChartProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('day');

  const chartData = useMemo(() => {
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get date range based on selected time range
    const now = new Date();
    let daysToSubtract = 30; // default to 30 days

    switch (timeRange) {
      case '7D': daysToSubtract = 7; break;
      case '30D': daysToSubtract = 30; break;
      case '90D': daysToSubtract = 90; break;
      case '1Y': daysToSubtract = 365; break;
      case 'ALL': daysToSubtract = 36500; break;
    }

    const startDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));

    // Filter trades within the selected time range
    const filteredTrades = sortedTrades.filter(trade => 
      new Date(trade.date) >= startDate
    );

    // Group trades by the selected time frame
    const groupedPL: { [key: string]: number } = {};
    
    filteredTrades.forEach(trade => {
      const date = new Date(trade.date);
      let key: string;

      switch (selectedTimeFrame) {
        case 'day':
          key = date.toLocaleDateString();
          break;
        case 'week':
          // Get the Monday of the week
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(date.setDate(diff));
          key = monday.toLocaleDateString();
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
      }

      groupedPL[key] = (groupedPL[key] || 0) + trade.profitLoss;
    });

    // Calculate cumulative P/L
    let cumulativePL = 0;
    const labels: string[] = [];
    const data: number[] = [];

    Object.entries(groupedPL).forEach(([date, pl]) => {
      cumulativePL += pl;
      
      // Format the label based on time frame
      let label = date;
      if (selectedTimeFrame === 'month') {
        const [year, month] = date.split('-');
        label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'short' 
        });
      } else if (selectedTimeFrame === 'week') {
        label = `Week of ${date}`;
      }

      labels.push(label);
      data.push(cumulativePL);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative P/L',
          data,
          borderColor: '#00b07c',
          backgroundColor: 'rgba(0, 176, 124, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [trades, timeRange, selectedTimeFrame]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        callbacks: {
          label: (context) => `$${context.parsed.y.toFixed(2)}`,
        },
        backgroundColor: '#1a2536',
        titleColor: '#9ca3af',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        padding: {
          top: 8,
          right: 12,
          bottom: 8,
          left: 12
        },
        bodyFont: {
          size: 13,
          family: 'system-ui'
        },
        titleFont: {
          size: 11,
          family: 'system-ui'
        },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.1)',
          tickLength: 8,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10,
            family: 'system-ui'
          },
          maxRotation: 50,
          minRotation: 50,
          autoSkip: true,
          maxTicksLimit: 8,
          callback: (value, index) => {
            const label = chartData.labels[index];
            // For weekly view, show only the date
            if (selectedTimeFrame === 'week' && label?.startsWith('Week of ')) {
              return label.replace('Week of ', '');
            }
            return label;
          }
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.1)',
          tickLength: 8,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 10,
            family: 'system-ui'
          },
          callback: (value) => `$${value}`,
          maxTicksLimit: 6,
        },
        border: {
          display: false
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    elements: {
      point: {
        radius: () => {
          // Smaller points on mobile
          return window.innerWidth < 768 ? 2 : 4;
        },
        hoverRadius: () => {
          // Larger hover area on mobile for better touch targets
          return window.innerWidth < 768 ? 8 : 6;
        },
      },
      line: {
        tension: 0.4,
        borderWidth: () => {
          // Thinner line on mobile
          return window.innerWidth < 768 ? 1.5 : 2;
        },
      }
    },
    animation: {
      duration: 300
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 md:mb-4 px-1">
        <h2 className="text-sm md:text-base lg:text-lg font-semibold text-foreground">
          P/L by {selectedTimeFrame.charAt(0).toUpperCase() + selectedTimeFrame.slice(1)}
        </h2>
        
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-1.5 px-2 py-1 text-xs md:text-sm text-gray-300 hover:text-white rounded transition-colors">
            <span>{TIME_FRAMES.find(t => t.value === selectedTimeFrame)?.label}</span>
            <ChevronDownIcon className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-50" />
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-1 w-32 md:w-36 bg-dark border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
            {TIME_FRAMES.map((timeFrame) => (
              <Menu.Item key={timeFrame.value}>
                {({ active }) => (
                  <button
                    onClick={() => setSelectedTimeFrame(timeFrame.value)}
                    className={`${
                      active ? 'bg-white/5' : ''
                    } ${
                      selectedTimeFrame === timeFrame.value ? 'text-blue-500' : 'text-gray-300'
                    } flex items-center w-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm`}
                  >
                    {timeFrame.label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Menu>
      </div>

      <div className="flex-1 -mx-2 md:mx-0">
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
} 