export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (n: number) => void;
}) {
  return (
    <>
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
          currentPage === 1 ? "bg-[#797979] text-white cursor-not-allowed" : "bg-[#292929]/90 text-white hover:bg-[#292929]/50"
        }`}
      >
        Previous
      </button>

      <span className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-[#2C4A3E]">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
          currentPage === totalPages ? "bg-[#797979] text-white cursor-not-allowed" : "bg-[#292929]/90 text-white hover:bg-[#292929]/50"
        }`}
      >
        Next
      </button>
    </>
  );
}
