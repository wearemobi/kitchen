import { create } from "zustand";

export interface CartItem {
  sku: string;
  name: string;
  quantity: number; // scaled 10^-4
  unitPrice: number; // scaled 10^-4
  notes: string;
}

interface CartState {
  items: CartItem[];
  table: string;
  channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  globalNotes: string;
  addItem: (item: Omit<CartItem, "quantity" | "notes">) => void;
  removeItem: (sku: string) => void;
  increment: (sku: string) => void;
  decrement: (sku: string) => void;
  setNotes: (sku: string, notes: string) => void;
  setTable: (table: string) => void;
  setChannel: (channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => void;
  setGlobalNotes: (notes: string) => void;
  clear: () => void;
}

const UNIT = 10000;

export const useCartStore = create<CartState>((set) => ({
  items: [],
  table: "Mesa 1",
  channel: "DINE_IN",
  globalNotes: "",
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.sku === item.sku);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.sku === item.sku ? { ...i, quantity: i.quantity + UNIT } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: UNIT, notes: "" }] };
    }),
  removeItem: (sku) => set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
  increment: (sku) =>
    set((state) => ({
      items: state.items.map((i) => (i.sku === sku ? { ...i, quantity: i.quantity + UNIT } : i)),
    })),
  decrement: (sku) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.sku === sku ? { ...i, quantity: i.quantity - UNIT } : i))
        .filter((i) => i.quantity > 0),
    })),
  setNotes: (sku, notes) =>
    set((state) => ({ items: state.items.map((i) => (i.sku === sku ? { ...i, notes } : i)) })),
  setTable: (table) => set({ table }),
  setChannel: (channel) => set({ channel }),
  setGlobalNotes: (globalNotes) => set({ globalNotes }),
  clear: () => set({ items: [], globalNotes: "" }),
}));
