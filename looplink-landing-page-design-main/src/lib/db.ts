import { supabase } from "./supabase";

// ── Core Types ────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  user_id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

export interface DailyEntry {
  id?: string;
  user_id?: string;
  sales: number;
  expenses: number;
  profit: number;
  created_at?: string;
}

// ── Inventory Types ───────────────────────────────────────────────────────────

export type ItemType = "product" | "bulk" | "service";
export type PurchaseType = "single" | "pack";
export type SaleMode = "pack" | "unit";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  item_type: ItemType;
  quantity: number | null;
  unit_type: string | null;
  cost_price: number | null;
  selling_price: number;
  category: string | null;
  low_stock_threshold: number | null;
  status: StockStatus | null;
  purchase_type: PurchaseType | null;
  units_per_pack: number | null;
  pack_cost: number | null;
  unit_name: string | null;
  pack_name: string | null;
  unit_selling_price: number | null;
  pack_selling_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventorySale {
  id: string;
  item_id: string | null;
  business_id: string;
  user_id: string;
  quantity_sold: number;
  sale_price_per_unit: number;
  profit: number | null;
  item_type: ItemType | null;
  sale_mode: SaleMode | null;
  units_sold: number | null;
  packs_sold: number | null;
  created_at: string;
}

export interface InventoryLoss {
  id: string;
  item_id: string;
  business_id: string;
  user_id: string;
  quantity_lost: number;
  reason: string | null;
  created_at: string;
}

export interface InventoryItemWithSales extends InventoryItem {
  totalUnitsSold: number;
  totalRevenue: number;
  totalProfit: number;
  lastSaleDate: string | null;
}

export interface AddInventoryItemParams {
  businessId: string;
  name: string;
  itemType: ItemType;
  quantity?: number;
  unitType?: string;
  costPrice?: number;
  sellingPrice: number;
  category?: string;
  lowStockThreshold?: number;
  purchaseType?: PurchaseType;
  unitsPerPack?: number;
  packCost?: number;
  unitName?: string;
  packName?: string;
  unitSellingPrice?: number;
  packSellingPrice?: number;
}

export interface RecordSaleParams {
  itemId: string | null;
  businessId: string;
  quantitySold: number;
  salePricePerUnit: number;
  profit?: number;
  itemType?: ItemType;
  saleMode?: SaleMode;
  unitsSold?: number;
  packsSold?: number;
  itemName?: string;
}

// ── Utility Functions ─────────────────────────────────────────────────────────

export function deriveStockStatus(
  item: Pick<InventoryItem, "item_type" | "quantity" | "low_stock_threshold">
): StockStatus | null {
  if (item.item_type === "service") return null;
  const qty = item.quantity ?? 0;
  const threshold = item.low_stock_threshold ?? 5;
  if (qty <= 0) return "out_of_stock";
  if (qty <= threshold) return "low_stock";
  return "in_stock";
}

export function formatStockDisplay(item: InventoryItem): string {
  if (item.item_type === "service") return "Service — no stock";
  if (item.purchase_type === "pack" && item.units_per_pack && item.units_per_pack > 0) {
    const totalUnits = item.quantity ?? 0;
    const packs = Math.floor(totalUnits / item.units_per_pack);
    const looseUnits = totalUnits % item.units_per_pack;
    const packName = item.pack_name ?? "packs";
    const unitName = item.unit_name ?? "units";
    if (packs > 0 && looseUnits > 0) return `${packs} ${packName} + ${looseUnits} ${unitName}`;
    if (packs > 0) return `${packs} ${packName}`;
    return `${looseUnits} ${unitName}`;
  }
  const unit = item.unit_type ?? "units";
  return `${item.quantity ?? 0} ${unit}`;
}

export function calcCostPerUnit(packCost: number, unitsPerPack: number): number {
  if (unitsPerPack <= 0) return 0;
  return packCost / unitsPerPack;
}

export function calcPackSaleProfit(packsSold: number, packSellingPrice: number, packCost: number): number {
  return packsSold * (packSellingPrice - packCost);
}

export function calcUnitSaleProfit(unitsSold: number, unitSellingPrice: number, costPerUnit: number): number {
  return unitsSold * (unitSellingPrice - costPerUnit);
}

// ── Businesses ───────────────────────────────────────────────────────────────

export async function createBusiness(name: string, type: string): Promise<Business> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Guard: never create a duplicate — if user already has a business, return it
  const { data: existing } = await supabase
    .from("businesses").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: true }).limit(1).single();
  if (existing) return existing as Business;

  const { data, error } = await supabase
    .from("businesses").insert({ user_id: user.id, name, type }).select().single();
  if (error) throw error;
  return data as Business;
}

export async function getBusinesses(): Promise<Business[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("businesses").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Business[];
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function addTransactionsBatch(
  businessId: string,
  transactions: Array<{ type: "income" | "expense"; amount: number; description: string; category: string }>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const rows = transactions.map(t => ({
    business_id: businessId, user_id: user.id,
    type: t.type, amount: t.amount, description: t.description, category: t.category,
  }));
  // Insert in chunks of 100 to avoid payload limits
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from("transactions").insert(rows.slice(i, i + 100));
    if (error) throw error;
  }
}

// Update type/category for transactions matching description+amount — used when rules are applied in DataChat
export async function updateTransactionClassifications(
  businessId: string,
  updates: Array<{ description: string; amount: number; type: "income" | "expense"; category: string }>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  // Run updates in parallel batches
  await Promise.all(updates.map(u =>
    supabase.from("transactions")
      .update({ type: u.type, category: u.category })
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("description", u.description)
      .eq("amount", u.amount)
  ));
}

export async function addTransaction(
  businessId: string, type: "income" | "expense",
  amount: number, description: string, category: string
): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("transactions")
    .insert({ business_id: businessId, user_id: user.id, type, amount, description, category })
    .select().single();
  if (error) throw error;
  return data as Transaction;
}

export async function getTransactions(businessId: string, limit?: number): Promise<Transaction[]> {
  let query = supabase
    .from("transactions").select("*").eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function getTransactionsByRange(
  businessId: string, from: string, to: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions").select("*").eq("business_id", businessId)
    .gte("created_at", from).lte("created_at", to).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

// ── Legacy daily entries ──────────────────────────────────────────────────────

export async function saveDailyEntry(sales: number, expenses: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("daily_entries")
    .insert({ user_id: user.id, sales, expenses, profit: sales - expenses })
    .select().single();
  if (error) throw error;
  return data as DailyEntry;
}

export async function getRecentEntries(limit = 7) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("daily_entries").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyEntry[];
}

// ── Inventory Queries ─────────────────────────────────────────────────────────

export async function getInventoryItems(businessId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items").select("*").eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InventoryItem[];
}

export async function getInventorySales(businessId: string): Promise<InventorySale[]> {
  const { data, error } = await supabase
    .from("inventory_sales").select("*").eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventorySale[];
}

export async function getInventoryLosses(businessId: string): Promise<InventoryLoss[]> {
  const { data, error } = await supabase
    .from("inventory_losses").select("*").eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventoryLoss[];
}

export async function getInventoryItemWithSales(itemId: string): Promise<InventoryItemWithSales | null> {
  const { data: item, error: itemErr } = await supabase
    .from("inventory_items").select("*").eq("id", itemId).single();
  if (itemErr) throw itemErr;
  const { data: sales } = await supabase
    .from("inventory_sales")
    .select("quantity_sold, sale_price_per_unit, profit, created_at")
    .eq("item_id", itemId);
  const list = sales ?? [];
  return {
    ...(item as InventoryItem),
    totalUnitsSold: list.reduce((s: number, r: any) => s + (r.quantity_sold ?? 0), 0),
    totalRevenue: list.reduce((s: number, r: any) => s + (r.quantity_sold ?? 0) * (r.sale_price_per_unit ?? 0), 0),
    totalProfit: list.reduce((s: number, r: any) => s + (r.profit ?? 0), 0),
    lastSaleDate: list.length > 0 ? list[0].created_at : null,
  };
}

// ── Inventory Mutations ───────────────────────────────────────────────────────

export async function addInventoryItemV2(params: AddInventoryItemParams): Promise<InventoryItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const status = deriveStockStatus({
    item_type: params.itemType,
    quantity: params.quantity ?? null,
    low_stock_threshold: params.lowStockThreshold ?? 5,
  });
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      business_id: params.businessId, user_id: user.id, name: params.name,
      item_type: params.itemType, quantity: params.quantity ?? null,
      unit_type: params.unitType ?? null, cost_price: params.costPrice ?? null,
      selling_price: params.sellingPrice, category: params.category ?? null,
      low_stock_threshold: params.lowStockThreshold ?? 5, status,
      purchase_type: params.purchaseType ?? "single",
      units_per_pack: params.unitsPerPack ?? null, pack_cost: params.packCost ?? null,
      unit_name: params.unitName ?? null, pack_name: params.packName ?? null,
      unit_selling_price: params.unitSellingPrice ?? null,
      pack_selling_price: params.packSellingPrice ?? null,
    })
    .select().single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function recordInventorySaleV2(params: RecordSaleParams): Promise<InventorySale> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (params.itemId) {
    const { data: item, error: fetchErr } = await supabase
      .from("inventory_items")
      .select("quantity, units_per_pack, item_type, low_stock_threshold")
      .eq("id", params.itemId).single();
    if (fetchErr) throw fetchErr;

    if (item.item_type !== "service") {
      const currentQty = item.quantity ?? 0;
      const reduction = params.saleMode === "pack" && item.units_per_pack
        ? (params.packsSold ?? params.quantitySold) * item.units_per_pack
        : params.quantitySold;
      if (reduction > currentQty) throw new Error(`Insufficient stock. Only ${currentQty} units available.`);
      const newQty = currentQty - reduction;
      const newStatus = deriveStockStatus({ item_type: item.item_type, quantity: newQty, low_stock_threshold: item.low_stock_threshold ?? 5 });
      await supabase.from("inventory_items").update({ quantity: newQty, status: newStatus }).eq("id", params.itemId);
    }
  }

  const { data: saleData, error: saleErr } = await supabase
    .from("inventory_sales")
    .insert({
      item_id: params.itemId, business_id: params.businessId, user_id: user.id,
      quantity_sold: params.quantitySold, sale_price_per_unit: params.salePricePerUnit,
      profit: params.profit ?? null, item_type: params.itemType ?? null,
      sale_mode: params.saleMode ?? null, units_sold: params.unitsSold ?? null,
      packs_sold: params.packsSold ?? null,
    })
    .select().single();
  if (saleErr) throw saleErr;

  // Sync to transactions table so Dashboard totals update
  const incomeAmount = params.salePricePerUnit * params.quantitySold;
  // Build a descriptive label: "Sold: Rice (5 units)" instead of generic "Inventory sale"
  const itemName = params.itemName ?? "Item";
  const description = `Sold: ${itemName} (${params.quantitySold} ${params.quantitySold === 1 ? "unit" : "units"})`;
  await addTransaction(params.businessId, "income", incomeAmount, description, "Product Sale").catch(() => {});

  return saleData as InventorySale;
}

export async function addInventoryLoss(
  itemId: string, businessId: string, quantityLost: number, reason?: string
): Promise<InventoryLoss> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: item, error: fetchErr } = await supabase
    .from("inventory_items").select("quantity, item_type, low_stock_threshold, cost_price, name")
    .eq("id", itemId).single();
  if (fetchErr) throw fetchErr;

  if (item.item_type !== "service") {
    const newQty = Math.max(0, (item.quantity ?? 0) - quantityLost);
    const newStatus = deriveStockStatus({ item_type: item.item_type, quantity: newQty, low_stock_threshold: item.low_stock_threshold ?? 5 });
    await supabase.from("inventory_items").update({ quantity: newQty, status: newStatus }).eq("id", itemId);
  }

  const { data, error } = await supabase
    .from("inventory_losses")
    .insert({ item_id: itemId, business_id: businessId, user_id: user.id, quantity_lost: quantityLost, reason: reason ?? null })
    .select().single();
  if (error) throw error;

  const lossValue = (item.cost_price ?? 0) * quantityLost;
  if (lossValue > 0) {
    const lossDesc = `Loss: ${item.name} (${quantityLost} ${quantityLost === 1 ? "unit" : "units"})${reason ? ` — ${reason}` : ""}`;
    await addTransaction(businessId, "expense", lossValue, lossDesc, "Stock").catch(() => {});
  }

  return data as InventoryLoss;
}

export async function updateInventoryStock(itemId: string, additionalQuantity: number): Promise<InventoryItem> {
  const { data: current, error: fetchError } = await supabase
    .from("inventory_items").select("quantity, item_type, low_stock_threshold").eq("id", itemId).single();
  if (fetchError) throw fetchError;
  const newQty = (current.quantity ?? 0) + additionalQuantity;
  const newStatus = deriveStockStatus({ item_type: current.item_type, quantity: newQty, low_stock_threshold: current.low_stock_threshold ?? 5 });
  const { data, error } = await supabase
    .from("inventory_items").update({ quantity: newQty, status: newStatus }).eq("id", itemId).select().single();
  if (error) throw error;
  return data as InventoryItem;
}

// ── Business Deletion ─────────────────────────────────────────────────────────

export async function deleteBusiness(businessId: string): Promise<void> {
  const tables = ["inventory_losses", "inventory_sales", "inventory_items", "transactions"] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("business_id", businessId);
    if (error) throw error;
  }
  const { error } = await supabase.from("businesses").delete().eq("id", businessId);
  if (error) throw error;
}

// ── Legacy shims ──────────────────────────────────────────────────────────────

export async function addInventoryItem(
  businessId: string, name: string, quantity: number, costPrice: number, sellingPrice: number
): Promise<InventoryItem> {
  return addInventoryItemV2({ businessId, name, itemType: "product", quantity, costPrice, sellingPrice });
}

export async function recordInventorySale(
  itemId: string, businessId: string, quantitySold: number, salePricePerUnit: number
): Promise<InventorySale> {
  return recordInventorySaleV2({ itemId, businessId, quantitySold, salePricePerUnit });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getSellsGoods(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("sells_goods").eq("id", user.id).single();
  return data?.sells_goods ?? false;
}

export async function setSellsGoodsDB(value: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").upsert({ id: user.id, sells_goods: value }, { onConflict: "id" });
}

// ── Inventory Sale Edit/Delete ────────────────────────────────────────────────

export async function updateInventorySale(
  saleId: string,
  updates: { quantity_sold: number; sale_price_per_unit: number; profit?: number }
): Promise<InventorySale> {
  // Fetch existing sale to compute stock delta
  const { data: existing, error: fetchErr } = await supabase
    .from('inventory_sales').select('quantity_sold, item_id').eq('id', saleId).single();
  if (fetchErr) throw fetchErr;

  const delta = existing.quantity_sold - updates.quantity_sold; // positive = stock increases

  // Update sale record
  const { data, error } = await supabase
    .from('inventory_sales')
    .update({ quantity_sold: updates.quantity_sold, sale_price_per_unit: updates.sale_price_per_unit, profit: updates.profit ?? null })
    .eq('id', saleId).select().single();
  if (error) throw error;

  // Adjust item stock by delta
  if (existing.item_id && delta !== 0) {
    const { data: item } = await supabase
      .from('inventory_items').select('quantity, item_type, low_stock_threshold').eq('id', existing.item_id).single();
    if (item) {
      const newQty = Math.max(0, (item.quantity ?? 0) + delta);
      const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= (item.low_stock_threshold ?? 5) ? 'low_stock' : 'in_stock';
      await supabase.from('inventory_items').update({ quantity: newQty, status: newStatus }).eq('id', existing.item_id);
    }
  }

  return data as InventorySale;
}

export async function deleteInventorySale(
  saleId: string,
  itemId: string,
  quantityToRestore: number
): Promise<void> {
  const { error: deleteErr } = await supabase.from('inventory_sales').delete().eq('id', saleId);
  if (deleteErr) throw deleteErr;

  const { data: item } = await supabase
    .from('inventory_items').select('quantity, item_type, low_stock_threshold').eq('id', itemId).single();
  if (item) {
    const newQty = (item.quantity ?? 0) + quantityToRestore;
    const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= (item.low_stock_threshold ?? 5) ? 'low_stock' : 'in_stock';
    await supabase.from('inventory_items').update({ quantity: newQty, status: newStatus }).eq('id', itemId);
  }
}
