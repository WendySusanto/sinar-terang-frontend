import { useEffect, useState } from "react";
import { Product, MemberPrice, GrosirConfig } from "../../types/Products";
import { DataTable } from "../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Button from "../../components/Button";
import { Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { Modal } from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import { z } from "zod"; // Import zod
import { InputField } from "../../components/InputField";
import { AnimatedSuccessIcon } from "../../components/AnimatedSuccessIcon";
import { LoadingIcon } from "../../components/LoadingIcon";
import { useFetch } from "../../hooks/useFetch";
import { TextArea } from "../../components/TextArea";
import { CSVLink } from "react-csv";
import Papa, { ParseResult } from "papaparse";
import Select from "react-select";

// Define a zod schema for form validation
const productSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  satuan: z.string().min(1, "Satuan is required"),
  modal: z.number().min(0, "Modal must be a positive number"),
  harga: z.number().min(0, "Harga must be a positive number"),
  barcode: z.string().nonempty("Barcode is required"),
  note: z.string().optional(),
  expired: z.string().optional(),
  member_prices: z
    .array(
      z.object({
        member_id: z.number().min(1, "Member ID can't be 'Umum'"),
        member_name: z.string().min(1, "Member name is required"),
        harga: z.number().min(0, "Member price must be a positive number"),
      })
    )
    .optional()
    .refine(
      (arr) =>
        !arr || arr.length === new Set(arr.map((mp) => mp.member_id)).size,
      {
        message: "Member price must be unique per member",
        path: ["member_prices"],
      }
    ),
  harga_grosir: z
    .array(
      z.object({
        min_qty: z.number().min(2, "Minimum quantity must be > 1"),
        harga: z.number().min(0, "Grosir price must be a positive number"),
      })
    )
    .optional()
    .refine(
      (arr) => !arr || arr.length === new Set(arr.map((hg) => hg.min_qty)).size,
      {
        message: "Harga grosir must be unique per minimum quantity",
        path: ["harga_grosir"],
      }
    ),
});

export default function Products() {
  const [memberOptions, setMemberOptions] = useState<
    { value: number; label: string }[]
  >([]);
  const {
    isOpen: isAddModalOpen,
    openModal: openAddModal,
    closeModal: closeAddModal,
  } = useModal();
  const {
    isOpen: isSuccessModalOpen,
    openModal: openSuccessModal,
    closeModal: closeSuccessModal,
  } = useModal();

  const {
    isOpen: isEditModalOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal();

  const {
    isOpen: isDeleteModalOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();

  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    satuan: "",
    modal: "",
    harga: "",
    barcode: "",
    expired: "",
    note: "",
    member_prices: [] as MemberPrice[],
    harga_grosir: [] as GrosirConfig[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [data, setData] = useState<Product[]>([]);

  const { get, post, patch, del, isError, isLoading, errorMessage } =
    useFetch<Product[]>();

  const fetchData = async () => {
    const dataResponse = await get("/api/products", {
      Authorization: "Bearer test",
    });
    const memberResponse = await get("/api/members");

    if (memberResponse.success && memberResponse.data) {
      const options = memberResponse.data
        .map((member) => ({
          value: member.id,
          label: member.name,
        }))
        .filter((option) => option.value !== 0 && option.label !== "");

      setMemberOptions(options);
    }

    if (dataResponse.success && dataResponse.data) {
      setData(dataResponse.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "satuan",
      header: "Satuan",
    },
    {
      accessorKey: "modal",
      header: "Modal",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <div className="">
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
      accessorKey: "harga",
      header: "Harga",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return (
          <div className="">
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
      accessorKey: "harga_grosir",
      header: "Harga Grosir",
      cell: ({ row }) => (
        <div>
          {(row.original.harga_grosir || []).map(
            (hg: GrosirConfig, idx: number) => (
              <div key={idx} className="whitespace-nowrap">
                {`≥${hg.min_qty} : ${hg.harga}`}
              </div>
            )
          )}
        </div>
      ),
    },
    {
      accessorKey: "member_prices",
      header: "Harga Member",
      cell: ({ row }) => (
        <div>
          {(row.original.member_prices || []).map(
            (mp: MemberPrice, idx: number) => (
              <div key={idx} className="whitespace-nowrap">
                {`${mp.member_name} : ${mp.harga.toLocaleString("id-ID")}`}
              </div>
            )
          )}
        </div>
      ),
    },
    {
      header: "Edit",
      cell: ({ row }) => {
        return (
          <div className="gap-2 flex items-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                handleEdit(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                handleDeleteModal(row.original);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const csvData = data.map((row) => ({
    ...row,
    name: escapeCsvField(row.name),
    satuan: escapeCsvField(row.satuan),
    barcode: escapeCsvField(row.barcode),
    note: escapeCsvField(row.note),
  }));

  function escapeCsvField(field: string) {
    if (typeof field !== "string") return field;
    // Escape double quotes by replacing " with ""
    const escaped = field.replace(/"/g, '""');

    return escaped;
  }

  function getDuplicateIndexes(
    arr: { member_id?: number; min_qty?: number }[],
    key: "member_id" | "min_qty"
  ) {
    const seen = new Map<number, number>();
    const duplicates: number[] = [];
    arr.forEach((item, idx) => {
      const value = item[key];
      if (typeof value === "number") {
        if (seen.has(value)) {
          duplicates.push(idx);
        } else {
          seen.set(value, idx);
        }
      }
    });

    return duplicates;
  }

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

  const duplicateMemberIndexes = getDuplicateIndexes(
    formData.member_prices,
    "member_id"
  );
  const duplicateGrosirIndexes = getDuplicateIndexes(
    formData.harga_grosir,
    "min_qty"
  );

  // Import handler
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Product>(file, {
      delimiter: ",",
      header: true,
      skipEmptyLines: true,
      dynamicTyping: {
        barcode: false,
        id: true,
        harga: true,
        modal: true,
        flag: true,
      },
      complete: async (results: ParseResult<Product>) => {
        const response = await post("/api/products/import", results.data);
        if (response.success) {
          fetchData();
          openSuccessModal();
        }
      },
      error: (error: Error) => {
        alert("Failed to import CSV: " + error.message);
      },
    });

    // Reset the input so the same file can be uploaded again if needed
    e.target.value = "";
  };

  // Delete handler for button click
  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent default form submission
    try {
      const response = await del(`/api/products/${formData.id}`);
      if (response.success) {
        setData((prev) => prev.filter((item) => item.id !== formData.id));

        closeDeleteModal();
        openSuccessModal();
        setFormData({
          id: 0,
          name: "",
          satuan: "",
          modal: "",
          harga: "",
          barcode: "",
          expired: "",
          note: "",
          member_prices: [],
          harga_grosir: [],
        });
        setErrors({}); // Clear errors on successful submission
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map zod errors to a state object
        console.log(error);
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        console.log(fieldErrors);
        setErrors(fieldErrors);
      } else {
        //handle api error
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission
    try {
      console.log("Saving product:", formData);

      // Validate form data using zod
      const validatedData = productSchema.parse({
        ...formData,
        modal: Number(formData.modal),
        harga: Number(formData.harga),
      });

      console.log("Saving product:", validatedData);

      const response = await post("/api/products", validatedData, {
        Authorization: "Bearer test",
      });

      if (response.success && response.data) {
        setData((prev) => [...prev, validatedData as Product]);

        closeAddModal();
        openSuccessModal();
        setFormData({
          id: 0,
          name: "",
          satuan: "",
          modal: "",
          harga: "",
          barcode: "",
          expired: "",
          note: "",
          member_prices: [],
          harga_grosir: [],
        });
        setErrors({}); // Clear errors on successful submission
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map zod errors to a state object
        console.log(error);
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 1) {
            // Remove consecutive duplicate keys in the path
            const dedupedPath = err.path.filter(
              (segment, index, pathArr) =>
                index === 0 || segment !== pathArr[index - 1]
            );
            fieldErrors[dedupedPath.join("_")] = err.message;
          } else {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        console.log(fieldErrors);
        setErrors(fieldErrors);
      } else {
        //handle api error
      }
    }
  };

  const handleEdit = (row: Product) => {
    setFormData({
      id: Number(row.id),
      name: row.name,
      satuan: row.satuan,
      modal: String(row.modal),
      harga: String(row.harga),
      barcode: row.barcode,
      expired: row.expired,
      note: row.note,
      member_prices: row.member_prices || [],
      harga_grosir: row.harga_grosir || [],
    });
    openEditModal();
  };

  const handleDeleteModal = (row: Product) => {
    setFormData({
      id: Number(row.id),
      name: row.name,
      satuan: row.satuan,
      modal: String(row.modal),
      harga: String(row.harga),
      barcode: String(row.barcode),
      expired: row.expired,
      note: row.note,
      member_prices: row.member_prices || [],
      harga_grosir: row.harga_grosir || [],
    });
    openDeleteModal();
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission
    try {
      // Validate form data using zod
      const validatedData = productSchema.parse({
        ...formData,
        modal: Number(formData.modal),
        harga: Number(formData.harga),
      });

      console.log("Saving product:", validatedData);

      const response = await patch("/api/products", validatedData, {
        Authorization: "Bearer test",
      });

      if (response.success) {
        setData((prev) => {
          const index = prev.findIndex(
            (item) => item.id === Number(formData.id)
          );
          if (index !== -1) {
            const updatedData = [...prev];
            updatedData[index] = { ...updatedData[index], ...validatedData };
            return updatedData;
          }
          return prev;
        });

        closeEditModal();
        openSuccessModal();
        setFormData({
          id: 0,
          name: "",
          satuan: "",
          modal: "",
          harga: "",
          barcode: "",
          expired: "",
          note: "",
          member_prices: [],
          harga_grosir: [],
        });
        setErrors({}); // Clear errors on successful submission
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map zod errors to a state object
        console.log(error);
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 1) {
            // Remove consecutive duplicate keys in the path
            const dedupedPath = err.path.filter(
              (segment, index, pathArr) =>
                index === 0 || segment !== pathArr[index - 1]
            );
            fieldErrors[dedupedPath.join("_")] = err.message;
          } else {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        console.log(fieldErrors);
        setErrors(fieldErrors);
      } else {
        //handle api error
      }
    }
  };

  return (
    <div className="">
      <h1 className="text-2xl font-bold text-secondary mb-6">Products</h1>
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <Button onClick={openAddModal} variant="default" size="md">
            <PlusCircle className="mr-2" />
            Add Product
          </Button>
          <Button className="" variant="default" size="md">
            <CSVLink
              data={csvData}
              enclosingCharacter={`"`}
              filename={`Product_Sinar_Terang_${new Date().toDateString()}`}
            >
              Export to CSV
            </CSVLink>
          </Button>

          {/* Import Button */}
          <label className="cursor-pointer inline-block">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
            <span className="inline-block px-4 py-2 font-medium rounded-lg bg-primary text-white  hover:bg-primary-dark transition">
              Import CSV
            </span>
          </label>
        </div>
      </div>
      <Modal
        className="overflow-y-auto"
        description="Fill in the product details below."
        title="Add Product"
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <InputField
            label="Name"
            name="name"
            min={1}
            value={formData.name}
            onChange={handleInputChange}
            error={errors.name}
          />
          <InputField
            label="Satuan"
            name="satuan"
            min={1}
            value={formData.satuan}
            onChange={handleInputChange}
            error={errors.satuan}
          />
          <InputField
            label="Modal"
            name="modal"
            type="number"
            min={1}
            value={formData.modal}
            onChange={handleInputChange}
            error={errors.modal}
          />
          <InputField
            label="Harga"
            name="harga"
            type="number"
            min={1}
            value={formData.harga}
            onChange={handleInputChange}
            error={errors.harga}
          />

          <InputField
            label="Barcode"
            name="barcode"
            type="text"
            value={formData.barcode}
            onChange={handleInputChange}
            error={errors.barcode}
          />
          <InputField
            label="Expiration Date"
            name="expired"
            type="date"
            value={formData.expired}
            onChange={handleInputChange}
            error={errors.expired}
          />
          <TextArea
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleTextAreaChange}
            error={errors.note}
          />

          <div>
            <label className="block font-semibold mb-1">Harga Grosir</label>
            {formData.harga_grosir.map((hg, idx) => (
              <>
                <div key={idx} className="flex gap-2 mb-2 items-end">
                  <InputField
                    type="number"
                    min={0}
                    label="Min Qty (≥)"
                    name={`minQty-${idx}`}
                    value={hg.min_qty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => {
                        const next = [...prev.harga_grosir];
                        next[idx] = { ...next[idx], min_qty: val };
                        return { ...prev, harga_grosir: next };
                      });
                    }}
                  />
                  <InputField
                    type="number"
                    min={1}
                    label="Harga"
                    name={`price-${idx}`}
                    value={hg.harga}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => {
                        const next = [...prev.harga_grosir];
                        next[idx] = { ...next[idx], harga: val };
                        return { ...prev, harga_grosir: next };
                      });
                    }}
                  />
                  <Button
                    size={"sm"}
                    className="h-8"
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        harga_grosir: prev.harga_grosir.filter(
                          (_, i) => i !== idx
                        ),
                      }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {errors[`harga_grosir_${idx}_min_qty`] && (
                  <p className="text-red-500 text-sm">
                    {errors[`harga_grosir_${idx}_min_qty`]}
                  </p>
                )}

                {duplicateGrosirIndexes.includes(idx) && (
                  <p className="text-red-500 text-sm">{errors.harga_grosir}</p>
                )}
              </>
            ))}
            <Button
              type="button"
              size={"sm"}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  harga_grosir: [
                    ...prev.harga_grosir,
                    { min_qty: 0, harga: prev.harga ? Number(prev.harga) : 0 },
                  ],
                }))
              }
            >
              Tambah Harga Grosir
            </Button>
          </div>

          <div>
            <label className="block font-semibold mb-1">Harga Member</label>
            {formData.member_prices.map((mp, idx) => (
              <>
                <div key={idx} className="flex gap-2 mb-2 items-end">
                  <div className="flex flex-col w-full">
                    <label className="block text-sm font-medium text-text">
                      Member
                    </label>
                    <Select
                      className="bg-background"
                      options={memberOptions?.map((member) => ({
                        value: member.value,
                        label: `${member.label}`,
                      }))}
                      value={memberOptions.find(
                        (option) => option.value === mp.member_id
                      )}
                      onChange={(selectedOption) => {
                        const selectedMember = selectedOption as {
                          value: number;
                          label: string;
                        };
                        setFormData((prev) => {
                          const next = [...prev.member_prices];
                          next[idx] = {
                            ...next[idx],
                            member_id: selectedMember.value,
                            member_name: selectedMember.label,
                          };
                          return { ...prev, member_prices: next };
                        });
                      }}
                      placeholder="Search member..."
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          backgroundColor: "var(--color-background-muted)", // Matches your design
                          borderColor: state.isFocused
                            ? "var(--color-primary)"
                            : "var(--color-border-muted)",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px var(--color-primary)"
                            : "none",
                          "&:hover": {
                            borderColor: "var(--color-primary-hover)",
                          },
                          color: "var(--color-text-primary)",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "var(--color-background-muted)", // Matches dark mode
                          borderRadius: "0.375rem",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "var(--color-primary-light)"
                            : "var(--color-background-muted)",
                          "&:hover": {
                            backgroundColor: "var(--color-primary-light)",
                          },
                          color: "var(--color-text-secondary)",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "var(--color-text-muted)",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "var(--color-text-primary)",
                        }),
                        input: (base) => ({
                          ...base,
                          color: "var(--color-text-primary)",
                        }),
                      }}
                    />
                  </div>
                  <InputField
                    type="number"
                    min={1}
                    label="Harga"
                    name={`member-harga-${idx}`}
                    value={mp.harga}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => {
                        const next = [...prev.member_prices];
                        next[idx] = { ...next[idx], harga: val };

                        return { ...prev, member_prices: next };
                      });
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 self-end"
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        member_prices: prev.member_prices.filter(
                          (_, i) => i !== idx
                        ),
                      }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {errors[`member_prices_${idx}_member_name`] && (
                  <p className="text-red-500 text-sm">
                    {errors[`member_prices_${idx}_member_name`]}
                  </p>
                )}
                {duplicateMemberIndexes.includes(idx) && (
                  <p className="text-red-500 text-sm">{errors.member_prices}</p>
                )}
              </>
            ))}
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  member_prices: [
                    ...prev.member_prices,
                    {
                      member_id: 0,
                      member_name: "",
                      harga: prev.harga ? Number(prev.harga) : 0,
                    },
                  ],
                }))
              }
            >
              Tambah Harga Member
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={closeAddModal}
              variant="outline"
              size="md"
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="md">
              Save
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        description=""
        title=""
        isOpen={isSuccessModalOpen}
        onClose={closeSuccessModal}
      >
        <div className="text-center">
          <AnimatedSuccessIcon />
          <p className="text-xl font-bold mb-8">Success!</p>
        </div>
      </Modal>
      <Modal
        description="Are you sure you want to delete this product?"
        title="Delete Product"
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
      >
        <div className="justify-end gap-2 flex">
          <Button size="md" onClick={closeDeleteModal}>
            No
          </Button>
          <Button variant={"outline"} size="md" onClick={handleDelete}>
            Yes
          </Button>
        </div>
      </Modal>
      <Modal
        description="Edit the product details below."
        title="Edit Product"
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
      >
        <form className="space-y-4" onSubmit={handleUpdate}>
          <InputField
            label="Name"
            name="name"
            min={1}
            value={formData.name}
            onChange={handleInputChange}
            error={errors.name}
          />
          <InputField
            label="Satuan"
            name="satuan"
            min={1}
            value={formData.satuan}
            onChange={handleInputChange}
            error={errors.satuan}
          />
          <InputField
            label="Modal"
            name="modal"
            type="number"
            min={1}
            value={formData.modal}
            onChange={handleInputChange}
            error={errors.modal}
          />
          <InputField
            label="Harga"
            name="harga"
            type="number"
            min={1}
            value={formData.harga}
            onChange={handleInputChange}
            error={errors.harga}
          />

          <InputField
            label="Barcode"
            name="barcode"
            type="text"
            value={formData.barcode}
            onChange={handleInputChange}
            error={errors.barcode}
          />

          <TextArea
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleTextAreaChange}
            error={errors.note}
          />

          <div>
            <label className="block font-semibold mb-1">Harga Grosir</label>
            {formData.harga_grosir.map((hg, idx) => (
              <>
                <div key={idx} className="flex gap-2 mb-2 items-end">
                  <InputField
                    type="number"
                    min={0}
                    label="Min Qty (≥)"
                    name={`minQty-${idx}`}
                    value={hg.min_qty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => {
                        const next = [...prev.harga_grosir];
                        next[idx] = { ...next[idx], min_qty: val };
                        return { ...prev, harga_grosir: next };
                      });
                    }}
                  />
                  <InputField
                    type="number"
                    min={1}
                    label="Harga"
                    name={`price-${idx}`}
                    value={hg.harga}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => {
                        const next = [...prev.harga_grosir];
                        next[idx] = { ...next[idx], harga: val };
                        return { ...prev, harga_grosir: next };
                      });
                    }}
                  />
                  <Button
                    size={"sm"}
                    className="h-8"
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        harga_grosir: prev.harga_grosir.filter(
                          (_, i) => i !== idx
                        ),
                      }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {errors[`harga_grosir_${idx}_min_qty`] && (
                  <p className="text-red-500 text-sm">
                    {errors[`harga_grosir_${idx}_min_qty`]}
                  </p>
                )}

                {duplicateGrosirIndexes.includes(idx) && (
                  <p className="text-red-500 text-sm">{errors.harga_grosir}</p>
                )}
              </>
            ))}
            <Button
              type="button"
              size={"sm"}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  harga_grosir: [
                    ...prev.harga_grosir,
                    { min_qty: 0, harga: prev.harga ? Number(prev.harga) : 0 },
                  ],
                }))
              }
            >
              Tambah Harga Grosir
            </Button>
          </div>

          <div>
            <label className="block font-semibold mb-1">Harga Member</label>
            {formData.member_prices.map((mp, idx) => (
              <>
                <div key={idx} className="flex gap-2 mb-2 items-end">
                  <div className="flex flex-col w-full">
                    <label className="block text-sm font-medium text-text">
                      Member
                    </label>
                    <Select
                      className="bg-background"
                      options={memberOptions?.map((member) => ({
                        value: member.value,
                        label: `${member.label}`,
                      }))}
                      value={memberOptions.find(
                        (option) => option.value === mp.member_id
                      )}
                      onChange={(selectedOption) => {
                        const selectedMember = selectedOption as {
                          value: number;
                          label: string;
                        };
                        setFormData((prev) => {
                          const next = [...prev.member_prices];
                          next[idx] = {
                            ...next[idx],
                            member_id: selectedMember.value,
                            member_name: selectedMember.label,
                          };
                          return { ...prev, member_prices: next };
                        });
                      }}
                      placeholder="Search member..."
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          backgroundColor: "var(--color-background-muted)", // Matches your design
                          borderColor: state.isFocused
                            ? "var(--color-primary)"
                            : "var(--color-border-muted)",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px var(--color-primary)"
                            : "none",
                          "&:hover": {
                            borderColor: "var(--color-primary-hover)",
                          },
                          color: "var(--color-text-primary)",
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "var(--color-background-muted)", // Matches dark mode
                          borderRadius: "0.375rem",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "var(--color-primary-light)"
                            : "var(--color-background-muted)",
                          "&:hover": {
                            backgroundColor: "var(--color-primary-light)",
                          },
                          color: "var(--color-text-secondary)",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "var(--color-text-muted)",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "var(--color-text-primary)",
                        }),
                        input: (base) => ({
                          ...base,
                          color: "var(--color-text-primary)",
                        }),
                      }}
                    />
                  </div>
                  <InputField
                    type="number"
                    min={1}
                    label="Harga"
                    name={`member-harga-${idx}`}
                    value={mp.harga}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData((prev) => {
                        const next = [...prev.member_prices];
                        next[idx] = { ...next[idx], harga: val };

                        return { ...prev, member_prices: next };
                      });
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 self-end"
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        member_prices: prev.member_prices.filter(
                          (_, i) => i !== idx
                        ),
                      }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {errors[`member_prices_${idx}_member_name`] && (
                  <p className="text-red-500 text-sm">
                    {errors[`member_prices_${idx}_member_name`]}
                  </p>
                )}
                {duplicateMemberIndexes.includes(idx) && (
                  <p className="text-red-500 text-sm">{errors.member_prices}</p>
                )}
              </>
            ))}
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  member_prices: [
                    ...prev.member_prices,
                    {
                      member_id: 0,
                      member_name: "",
                      harga: prev.harga ? Number(prev.harga) : 0,
                    },
                  ],
                }))
              }
            >
              Tambah Harga Member
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                closeEditModal();
                setFormData({
                  id: 0,
                  name: "",
                  satuan: "",
                  modal: "",
                  harga: "",
                  barcode: "",
                  expired: "",
                  note: "",
                  member_prices: [],
                  harga_grosir: [],
                });
                setErrors({});
              }}
              variant="outline"
              size="md"
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="md">
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <DataTable columns={productColumns} data={data} />
    </div>
  );
}
