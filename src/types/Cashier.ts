export type Member = {
  id: number;
  name: string;
};

export type MemberOption = {
  value: number;
  label: string;
};

export type ProductSale = {
  id: number;
  name: string;
  satuan: string;
  quantity: number;
  harga: number;
  original_harga: number;
  subTotal: number;
  manualHargaSatuan?: number;
  member_prices?: Array<{
    member_id: number;
    harga: number;
  }>;
  harga_grosir?: Array<{
    min_qty: number;
    harga: number;
  }>;
};

export type HargaSatuanState = {
  value: number;
  isEditing: boolean;
  inputValue: string;
};

export type ProductOption = {
  value: number;
  label: string;
};
