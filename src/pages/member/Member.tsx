import { useEffect, useState } from "react";
import { DataTable } from "../../components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Button from "../../components/Button";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Modal } from "../../components/Modal";
import { useModal } from "../../hooks/useModal";
import { z } from "zod";
import { InputField } from "../../components/InputField";
import { AnimatedSuccessIcon } from "../../components/AnimatedSuccessIcon";
import { LoadingIcon } from "../../components/LoadingIcon";
import { useFetch } from "../../hooks/useFetch";
import { TextArea } from "../../components/TextArea";
import { CSVLink } from "react-csv";
import { Member } from "../../types/Members";

const memberSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  flag: z.number().optional(),
});

export default function Members() {
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

  const [formData, setFormData] = useState<Member>({
    id: 0,
    name: "",
    address: "",
    phone: "",
    note: "",
    flag: 1,
    date_added: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [data, setData] = useState<Member[]>([]);

  const { get, post, patch, del, isError, isLoading, errorMessage } =
    useFetch<Member[]>();

  const fetchData = async () => {
    const response = await get("/api/members", {
      Authorization: "Bearer test",
    });
    if (response.success && response.data) setData(response.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const memberColumns: ColumnDef<Member>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return value ? value : "-";
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return value ? value : "-";
      },
    },
    {
      accessorKey: "note",
      header: "Note",
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return value ? value : "-";
      },
    },
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
      header: "Edit",
      cell: ({ row }) => (
        <div className="gap-2 flex items-center">
          <Button
            variant="default"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleDeleteModal(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const csvData = data.map((row) => ({
    ...row,
    name: escapeCsvField(row.name),
    address: escapeCsvField(row.address ?? ""),
    phone: escapeCsvField(row.phone ?? ""),
    note: escapeCsvField(row.note ?? ""),
  }));

  function escapeCsvField(field: string) {
    if (typeof field !== "string") return field;
    return field.replace(/"/g, '""');
  }

  // Delete handler
  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      console.log("Deleting member with ID:", formData.id);
      const response = await del(`/api/members/${formData.id}`);
      if (response.success) {
        setData((prev) => prev.filter((item) => item.id !== formData.id));
        closeDeleteModal();
        openSuccessModal();
        setFormData({
          id: 0,
          name: "",
          address: "",
          phone: "",
          note: "",
          flag: 1,
          date_added: "",
        });
        setErrors({});
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
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
    e.preventDefault();
    try {
      const validatedData = memberSchema.parse(formData);

      console.log("Validated Data:", validatedData);

      const response = await post("/api/members", validatedData, {
        Authorization: "Bearer test",
      });

      if (response.success && response.data) {
        console.log("New Member ID:", response.data);

        const newMember: Member = {
          ...(validatedData as Member),
          id: Number(response.data),
          date_added: new Date().toISOString(),
        };
        console.log("New Member:", newMember);
        setData((prev) => [...prev, newMember]);
        closeAddModal();
        openSuccessModal();
        setFormData({
          id: 0,
          name: "",
          address: "",
          phone: "",
          note: "",
          flag: 1,
          date_added: "",
        });
        setErrors({});
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleEdit = (row: Member) => {
    setFormData({
      id: Number(row.id),
      name: row.name,
      address: row.address ?? "",
      phone: row.phone ?? "",
      note: row.note ?? "",
      flag: row.flag ?? 1,
      date_added: row.date_added ?? "",
    });
    openEditModal();
  };

  const handleDeleteModal = (row: Member) => {
    setFormData({
      id: Number(row.id),
      name: row.name,
      address: row.address ?? "",
      phone: row.phone ?? "",
      note: row.note ?? "",
      flag: row.flag ?? 1,
      date_added: row.date_added ?? "",
    });
    openDeleteModal();
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const validatedData = memberSchema.parse(formData);
      await patch("/api/members", validatedData, {
        Authorization: "Bearer test",
      });
      setData((prev) => {
        const index = prev.findIndex((item) => item.id === Number(formData.id));
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
        address: "",
        phone: "",
        note: "",
        flag: 1,
        date_added: "",
      });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      }
    }
  };

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
      <h1 className="text-2xl font-bold text-secondary mb-6">Members</h1>
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <Button onClick={openAddModal} variant="default" size="md">
            <PlusCircle className="mr-2" />
            Add Member
          </Button>
          <Button className="" variant="default" size="md">
            <CSVLink
              data={csvData}
              enclosingCharacter={`"`}
              filename={`Member_Sinar_Terang_${new Date().toDateString()}`}
            >
              Export to CSV
            </CSVLink>
          </Button>
        </div>
      </div>
      <Modal
        className="overflow-y-auto"
        description="Fill in the member details below."
        title="Add Member"
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
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            error={errors.address}
          />
          <InputField
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            error={errors.phone}
          />
          <TextArea
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleTextAreaChange}
            error={errors.note}
          />
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
        description="Are you sure you want to delete this member?"
        title="Delete Member"
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
        description="Edit the member details below."
        title="Edit Member"
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
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            error={errors.address}
          />
          <InputField
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            error={errors.phone}
          />
          <TextArea
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleTextAreaChange}
            error={errors.note}
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                closeEditModal();
                setFormData({
                  id: 0,
                  name: "",
                  address: "",
                  phone: "",
                  note: "",
                  flag: 1,
                  date_added: "",
                });
                setErrors({});
              }}
              variant="outline"
              size="md"
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="md">
              Update
            </Button>
          </div>
        </form>
      </Modal>
      <DataTable columns={memberColumns} data={data} />
    </div>
  );
}
