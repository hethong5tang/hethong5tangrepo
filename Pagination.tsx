

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pageNeighbours = 1;
    const totalNumbers = (pageNeighbours * 2) + 3;
    const totalBlocks = totalNumbers + 2;

    if (totalPages > totalBlocks) {
      const startPage = Math.max(2, currentPage - pageNeighbours);
      const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
      let pages: (number | string)[] = [1];

      if (startPage > 2) {
        pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
      return pages;
    }
    
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-between" aria-label="Pagination">
      <div className="flex-1 flex justify-between sm:justify-end items-center gap-1">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Trước
        </button>
        <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => 
                typeof page === 'number' ? (
                     <button
                        key={index}
                        onClick={() => onPageChange(page)}
                        className={`relative inline-flex items-center justify-center h-9 w-9 text-sm font-medium rounded-md transition-colors ${
                            currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                     >
                        {page}
                    </button>
                ) : (
                    <span key={index} className="px-2 py-2 text-sm text-gray-500">
                        {page}
                    </span>
                )
            )}
        </div>
        <div className="sm:hidden text-sm text-gray-700 dark:text-gray-400">
            {currentPage} / {totalPages}
        </div>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </nav>
  );
};

export default React.memo(Pagination);