import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { rankItem } from "@tanstack/match-sorter-utils";
import { useState } from "react";
import Button from "./Button";
import { ChevronLeft, ChevronRight, LucideChevronLast } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[] | undefined | null;
  disableSearch?: boolean;
  disablePagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  disableSearch = false,
  disablePagination = false,
}: DataTableProps<TData, TValue>) {
  console.log("Data Table rerendered");

  const [globalFilter, setGlobalFilter] = useState("");

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: disablePagination ? Number(data?.length) : 20,
  });

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  });

  return (
    <>
      <div className="relative rounded-md mt-3 text-text">
        {/* Global Filter Input */}
        {!disableSearch && (
          <div className="w-full sm:w-fit absolute top-[-3.3rem] left-0 ">
            <input
              type="text"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="p-2 w-full sm:w-fit border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
        <div className="max-w-full mt-16 sm:mt-0 overflow-x-scroll overflow-y-auto">
          <table className="w-full text-sm border border-border text-left text-text sm:mt-0">
            {/* Header */}
            <thead className="bg-primary-dark text-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2 font-bold text-white border-b border-border"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {/* Body */}
            <tbody className="bg-background">
              {table.getCoreRowModel().rows?.length ? (
                table.getCoreRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-primary-light transition-colors"
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 border-b border-border text-text"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-text-muted"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!disablePagination && (
          <div className="flex justify-end gap-2 mt-4 pb-24 md:pb-0 w-full">
            <Button
              className="border rounded p-1 rotate-180"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <LucideChevronLast />
            </Button>
            <Button
              className="border rounded p-1"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              className="border rounded p-1"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              className="border rounded p-1"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <LucideChevronLast />
            </Button>
            <span className="flex items-center gap-1">
              <div>Page</div>
              <strong>
                {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount().toLocaleString()}
              </strong>
            </span>

            <select
              className="py-3 px-2 focus:ring-0 focus:outline-none "
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </>
  );
}

/* Fuzzy Filter Function */
function fuzzyFilter(row: any, columnId: string, value: string) {
  const itemRank = rankItem(row.getValue(columnId), value);
  return itemRank.passed;
}
