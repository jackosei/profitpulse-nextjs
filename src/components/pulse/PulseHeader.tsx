import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { 
  TrashIcon, 
  ArchiveBoxIcon, 
  EllipsisVerticalIcon,
  CalendarIcon,
  ChevronDownIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from "@/utils/format"

type TimeRange = '7D' | '30D' | '90D' | '1Y' | 'ALL';
type ComparisonType = 'PERIOD' | 'START';

const TIME_RANGES = [
  { label: 'Last 7 Days', value: '7D' },
  { label: 'Last 30 Days', value: '30D' },
  { label: 'Last Quarter', value: '90D' },
  { label: 'Last Year', value: '1Y' },
  { label: 'All Time', value: 'ALL' },
] as const;

interface PulseHeaderProps {
  name: string;
  instrument: string;
  accountSize: number;
  createdAt: { seconds: number };
  selectedTimeRange: TimeRange;
  comparisonType: ComparisonType;
  onTimeRangeChange: (range: TimeRange) => void;
  onComparisonTypeChange: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export default function PulseHeader({
  name,
  instrument,
  accountSize,
  createdAt,
  selectedTimeRange,
  comparisonType,
  onTimeRangeChange,
  onComparisonTypeChange,
  onArchive,
  onDelete,
}: PulseHeaderProps) {
  return (
    <div className="bg-dark/50 border-b border-gray-800">
      {/* Main Header Section */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">{name}</h1>
          <span className="px-2 py-1 text-sm bg-white/10 rounded text-gray-300">
            {instrument}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-400">Account Size</p>
            <p className="text-base font-semibold text-foreground">
              {formatCurrency(accountSize)}
            </p>
          </div>

          <Menu as="div" className="relative">
            <MenuButton as="button" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <EllipsisVerticalIcon className="w-6 h-6" />
            </MenuButton>
            <MenuItems className="absolute right-0 mt-1 w-48 bg-dark border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onArchive}
                    className={`${
                      active ? 'bg-white/5' : ''
                    } flex items-center w-full px-4 py-2.5 text-sm text-gray-300 hover:text-yellow-500`}
                  >
                    <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                    Archive Pulse
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ active }) => (
                  <button
                    onClick={onDelete}
                    className={`${
                      active ? 'bg-white/5' : ''
                    } flex items-center w-full px-4 py-2.5 text-sm text-gray-300 hover:text-red-500`}
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete Pulse
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>

      {/* Time Controls Section */}
      <div className="px-4 py-2 flex items-center gap-2 border-t border-gray-800/50">
        <div className="flex items-center gap-2">
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-2 px-0 py-1.5 text-sm text-gray-300 hover:text-white rounded transition-colors">
              <CalendarIcon className="w-4 h-4" />
              <span>{TIME_RANGES.find(r => r.value === selectedTimeRange)?.label}</span>
              <ChevronDownIcon className="w-4 h-4 opacity-50" />
            </MenuButton>
            <MenuItems className="absolute left-0 mt-1 w-48 bg-dark border border-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
              {TIME_RANGES.map((range) => (
                <MenuItem key={range.value}>
                  {({ active }) => (
                    <button
                      onClick={() => onTimeRangeChange(range.value)}
                      className={`${
                        active ? 'bg-white/5' : ''
                      } ${
                        selectedTimeRange === range.value ? 'text-blue-500' : 'text-gray-300'
                      } flex items-center w-full px-4 py-2 text-sm`}
                    >
                      {range.label}
                    </button>
                  )}
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>

          <button
            onClick={onComparisonTypeChange}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-sm ${
              comparisonType === 'PERIOD' ? 'text-blue-500' : 'text-gray-300'
            } hover:text-white rounded transition-colors`}
            title={comparisonType === 'PERIOD' ? 'Comparing to Previous Period' : 'Comparing to Starting Stats'}
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
            <span className="text-xs md:text-sm">
              {comparisonType === 'PERIOD' ? 'vs Previous' : 'vs Start'}
            </span>
          </button>
        </div>

        <p className="text-xs text-gray-500 ml-auto hidden md:block">
          Created {new Date(createdAt.seconds * 1000).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
} 