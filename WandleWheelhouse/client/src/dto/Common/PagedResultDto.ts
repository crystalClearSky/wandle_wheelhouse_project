// src/dto/Common/PagedResultDto.ts

// Generic interface for paginated API responses
export interface PagedResultDto<T> {
    items: T[]; // The items for the current page
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    // Calculated properties (optional, could be calculated in frontend component if needed)
    totalPages?: number;
    hasPreviousPage?: boolean;
    hasNextPage?: boolean;
  }
  
  // Note: Backend calculates TotalPages, HasPreviousPage, HasNextPage.
  // Frontend receives TotalCount, PageNumber, PageSize and can calculate the others if needed.
  // Adjust the interface based on exactly what your backend PagedResultDto sends.
  // If the backend sends these calculated properties, add them here:
  // totalPages?: number;
  // hasPreviousPage?: boolean;
  // hasNextPage?: boolean;