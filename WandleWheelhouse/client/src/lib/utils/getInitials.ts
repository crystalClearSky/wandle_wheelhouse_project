// Location: src/lib/utils/getInitials.ts

/**
 * Generates initials from a name string.
 * Examples:
 * "Sam Smith" -> "SS"
 * "Sam" -> "S"
 * "" -> "?"
 * null -> "?"
 */
export const getInitials = (name?: string | null): string => {
    // Return '?' immediately if name is null, undefined, or empty whitespace
    if (!name?.trim()) {
      return '?';
    }
  
    // Split name by spaces and filter out any empty strings that might result
    const names = name.trim().split(' ').filter(Boolean);
  
    // Get the first character of the first name part, uppercase it, default to empty string
    const first = names[0]?.charAt(0)?.toUpperCase() || '';
  
    // Get the first character of the *last* name part (if more than one part exists), uppercase it
    const last = names.length > 1 ? names[names.length - 1]?.charAt(0)?.toUpperCase() : '';
  
    // Return two initials if both first and last exist, otherwise just the first, otherwise '?'
    return first && last ? `${first}${last}` : first || '?';
  };