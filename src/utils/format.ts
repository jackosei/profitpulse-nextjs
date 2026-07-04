/**
 * Format a number as currency
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export const formatCurrency = (
    value: number | string,
    options: {
        decimals?: number;
        prefix?: string;
        absolute?: boolean;
    } = {}
) => {
    const {
        decimals = 2,
        prefix = "$",
        absolute = false
    } = options;

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return `${prefix}0.00`;

    const absValue = absolute ? Math.abs(num) : num;
    return `${prefix}${absValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}`;
};

/**
 * Format a number as a ratio/percentage
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export const formatRatio = (
    value: number | string,
    options: {
        decimals?: number;
        suffix?: string;
    } = {}
) => {
    const {
        decimals = 2,
        suffix = ''
    } = options;

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return `0${suffix}`;

    return `${num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}${suffix}`;
}; 