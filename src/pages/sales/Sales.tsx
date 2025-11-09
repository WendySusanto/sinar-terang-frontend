import { useEffect, useState } from "react";
import { Sales } from "../../types/Sales";
import { DataTable } from "../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Button from "../../components/Button";
import { LoadingIcon } from "../../components/LoadingIcon";
import { useFetch } from "../../hooks/useFetch";
import { CSVLink } from "react-csv";
import { FileText, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "../../components/Tooltip";

export default function SalesPage() {
  const navigate = useNavigate(); // Initialize useNavigate
  const [data, setData] = useState<Sales[]>([]);

  const { get, isError, isLoading, errorMessage } = useFetch<Sales[]>();

  const salesColumns: ColumnDef<Sales>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "kasir_name", header: "Kasir Name" },
    { accessorKey: "member_name", header: "Member Name" },
    {
      accessorKey: "date_added",
      header: "Date Added",
      cell: ({ getValue }) => {
        const value = getValue() as string;
        const date = new Date(value);
        return (
          <div>
            {date.toLocaleDateString("id-ID")}{" "}
            {date.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        );
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <div>
            {value.toLocaleString("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            })}
          </div>
        );
      },
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="gap-2 flex items-center">
          <Tooltip text="Print Receipt">
            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrint(row.original)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip text="Print Invoice">
            <Button
              variant="default"
              size="sm"
              onClick={() => handlePrintInvoice(row.original)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const handlePrint = ({ id }: Sales) => {
    navigate(`/sales/receipt/${id}`);
  };

  const handlePrintInvoice = ({ id }: Sales) => {
    navigate(`/sales/invoice/${id}`);
  };

  const csvData = data.map((row) => ({
    ...row,
    KasirName: escapeCsvField(row.kasir_name),
    MemberName: escapeCsvField(row.member_name),
  }));

  function escapeCsvField(field: string) {
    if (typeof field !== "string") return field;
    const escaped = field.replace(/"/g, '""');
    return escaped;
  }

  useEffect(() => {
    const fetchData = async () => {
      const response = await get("/api/sales", {
        Authorization: "Bearer test",
      });
      if (response.success && response.data) setData(response.data);
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingIcon />;
  } else if (isError) {
    return (
      <div className="text-text">
        Error...
        {errorMessage && <p>{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-secondary mb-6">Sales</h1>
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <Button className="" variant="default" size="md">
            <CSVLink
              data={csvData}
              enclosingCharacter={`"`}
              filename={`Sales_Export_${new Date().toDateString()}`}
            >
              Export to CSV
            </CSVLink>
          </Button>
        </div>
      </div>

      <DataTable columns={salesColumns} data={data} />
    </div>
  );
}
