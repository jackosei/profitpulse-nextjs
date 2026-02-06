import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { 
  TrashIcon, 
  ArchiveBoxIcon, 
  EllipsisVerticalIcon,
  CalendarIcon,
  ChevronDownIcon,
  ArrowsRightLeftIcon,
  PencilIcon,
  ShieldExclamationIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from "@/utils/format"
import { PULSE_STATUS } from "@/types/pulse"

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
  instrument?: string;
  accountSize: number;
  createdAt: { seconds: number };
  selectedTimeRange: TimeRange;
  comparisonType: ComparisonType;
  onTimeRangeChange: (range: TimeRange) => void;
  onComparisonTypeChange: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onUpdate: () => void;
  maxRiskPerTrade: number;
  maxDailyDrawdown: number;
  maxTotalDrawdown: number;
  status: string;
  ruleViolations?: string[];
}

export default function PulseHeader({
  name,
  instrument = 'N/A',
  accountSize,
  createdAt,
  selectedTimeRange,
  comparisonType,
  onTimeRangeChange,
  onComparisonTypeChange,
  onArchive,
  onDelete,
  onUpdate,
  maxRiskPerTrade,
  maxDailyDrawdown,
  maxTotalDrawdown,
  status,
  ruleViolations = []
}: PulseHeaderProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case PULSE_STATUS.ACTIVE:
        return 'bg-green-500/20 text-green-500 border-green-500/20';
      case PULSE_STATUS.LOCKED:
        return 'bg-red-500/20 text-red-500 border-red-500/20';
      case PULSE_STATUS.ARCHIVED:
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="bg-dark/50 border-b border-gray-800">
      {/* Main Header Section */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">{name}</h1>
          <span className="px-2 py-1 text-sm bg-white/10 rounded text-gray-300">
            {instrument}
          </span>
          <div className={`px-2 py-1 text-xs rounded border ${getStatusColor(status)} capitalize`}>
            {status === PULSE_STATUS.LOCKED && <LockClosedIcon className="w-3 h-3 inline-block mr-1" />}
            {status}
          </div>
           
           {/* Risk Rules Section - Now in the middle */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-300">
                Risk: <span className="text-white font-medium">{maxRiskPerTrade}%</span>
              </span>
              <span className="text-xs text-gray-300">
                Daily DD: <span className="text-white font-medium">{maxDailyDrawdown}%</span>
              </span>
              <span className="text-xs text-gray-300">
                Total DD: <span className="text-white font-medium">{maxTotalDrawdown}%</span>
              </span>
            </div>
          </div>
        </div>

       
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
                    onClick={onUpdate}
                    className={`${
                      active ? 'bg-white/5' : ''
                    } flex items-center w-full px-4 py-2.5 text-sm text-gray-300 hover:text-blue-500`}
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Update Settings
                  </button>
                )}
              </MenuItem>
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

      {/* Mobile Risk Rules Section */}
      <div className="md:hidden px-4 py-2 border-t border-gray-800/50 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldExclamationIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Risk Rules:</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <span className="text-xs text-gray-300">
            Max Risk: <span className="text-white font-medium">{maxRiskPerTrade}%</span>
          </span>
          <span className="text-xs text-gray-300">
            Daily DD: <span className="text-white font-medium">{maxDailyDrawdown}%</span>
          </span>
          <span className="text-xs text-gray-300">
            Total DD: <span className="text-white font-medium">{maxTotalDrawdown}%</span>
          </span>
        </div>
      </div>

      {/* Rule Violations Alert */}
      {status === PULSE_STATUS.LOCKED && ruleViolations.length > 0 && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-start gap-2">
            <LockClosedIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-500 mb-1">Pulse Locked - Rule Violations:</p>
              <ul className="text-xs text-red-400 list-disc list-inside">
                {ruleViolations.map((violation, index) => (
                  <li key={index}>{violation}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Time Controls Section */}
      <div className="px-4 py-2 flex flex-wrap items-center gap-2 border-t border-gray-800/50">
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