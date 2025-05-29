import { ethers } from 'ethers';

/**
 * Formats an Ethereum address by showing the first few and last few characters.
 * e.g., 0x1234...abcd
 * @param address The Ethereum address string.
 * @param startChars Number of characters to show at the start.
 * @param endChars Number of characters to show at the end.
 * @returns Formatted address string.
 */
export const formatAddress = (address: string | undefined, startChars: number = 6, endChars: number = 4): string => {
  if (!address) {
    return '';
  }
  if (!ethers.utils.isAddress(address)) {
    return 'Invalid Address';
  }
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
};

/**
 * Formats a BigNumber representing an ZRC20 token amount into a human-readable string.
 * @param amount The BigNumber amount (in smallest unit, e.g., wei for ETH-like, or token's smallest unit).
 * @param decimals The number of decimals the token uses.
 * @param precision The number of decimal places to show in the formatted string.
 * @returns Formatted token amount string.
 */
export const formatTokenAmount = (
  amount: ethers.BigNumberish | undefined,
  decimals: number = 18,
  precision: number = 4
): string => {
  if (amount === undefined) {
    return '0.0';
  }
  try {
    const formatted = ethers.utils.formatUnits(amount, decimals);
    // Ensure precision doesn't exceed available decimal places after formatting
    const dotIndex = formatted.indexOf('.');
    if (dotIndex === -1) return formatted; // Whole number

    const actualPrecision = Math.min(precision, formatted.length - dotIndex - 1);
    return parseFloat(formatted).toFixed(actualPrecision);

  } catch (error) {
    console.error("Error formatting token amount:", error);
    return "Error";
  }
};


/**
 * Formats a timestamp (in seconds) into a human-readable date and time string.
 * @param timestampSeconds Unix timestamp in seconds.
 * @returns Formatted date string e.g., "Jan 1, 2023, 12:00 PM"
 */
export const formatTimestamp = (timestampSeconds: number | undefined): string => {
  if (timestampSeconds === undefined || timestampSeconds === 0) {
    return 'N/A';
  }
  try {
    const date = new Date(timestampSeconds * 1000); // Convert seconds to milliseconds
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "Invalid Date";
  }
};


/**
 * Converts a duration in seconds to a human-readable string (e.g., "2 days, 5 hours").
 * @param totalSeconds The duration in seconds.
 * @returns A human-readable string representing the duration.
 */
export const formatDuration = (totalSeconds: number | undefined): string => {
  if (totalSeconds === undefined || totalSeconds < 0) {
    return 'N/A';
  }
  if (totalSeconds === 0) {
    return '0 seconds';
  }

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length < 2) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`); // Show seconds if duration is short

  if (parts.length === 0) return `${Math.round(totalSeconds *100)/100} seconds`; // for very short durations

  return parts.join(', ');
};


/**
 * Parses a string representing an ZRC20 token amount into a BigNumber.
 * @param amountString The string amount (e.g., "10.5").
 * @param decimals The number of decimals the token uses.
 * @returns BigNumber representing the amount in the token's smallest unit.
 */
export const parseTokenAmount = (amountString: string, decimals: number = 18): ethers.BigNumber | null => {
  if (!amountString || isNaN(parseFloat(amountString))) {
    return null;
  }
  try {
    return ethers.utils.parseUnits(amountString, decimals);
  } catch (error) {
    console.error("Error parsing token amount:", error);
    return null;
  }
};

// Add other utility functions as needed, for example:
// - Calculating percentages
// - Handling IPFS hashes/URLs
// - Specific data transformations for your DAO's needs
// - etc.
