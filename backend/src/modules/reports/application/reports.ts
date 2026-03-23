export type NetWorthMonthPoint = {
  month: string;
  totalAssetsMinor: string;
  totalLiabilitiesMinor: string;
  netWorthMinor: string;
  currency: string;
};

export type NetWorthReport = {
  from: string;
  to: string;
  points: NetWorthMonthPoint[];
};

export type CashflowMonthPoint = {
  month: string;
  totalInflowsMinor: string;
  totalOutflowsMinor: string;
  netCashflowMinor: string;
};

export type CashflowReport = {
  from: string;
  to: string;
  points: CashflowMonthPoint[];
};

export type SpendingCategoryRow = {
  categoryId: string | null;
  categoryName: string;
  totalSpentMinor: string;
};

export type SpendingByCategoryReport = {
  from: string;
  to: string;
  currency: string;
  byCategory: SpendingCategoryRow[];
};

export interface ReportsRepository {
  getNetWorthSeries(userId: string, fromMonth: string, toMonth: string): Promise<NetWorthReport>;
  getCashflowSeries(userId: string, fromMonth: string, toMonth: string): Promise<CashflowReport>;
  getSpendingByCategory(userId: string, fromMonth: string, toMonth: string): Promise<SpendingByCategoryReport>;
}

export async function getNetWorthReport(
  repository: ReportsRepository,
  userId: string,
  fromMonth: string,
  toMonth: string
): Promise<NetWorthReport> {
  return repository.getNetWorthSeries(userId, fromMonth, toMonth);
}

export async function getCashflowReport(
  repository: ReportsRepository,
  userId: string,
  fromMonth: string,
  toMonth: string
): Promise<CashflowReport> {
  return repository.getCashflowSeries(userId, fromMonth, toMonth);
}

export async function getSpendingByCategoryReport(
  repository: ReportsRepository,
  userId: string,
  fromMonth: string,
  toMonth: string
): Promise<SpendingByCategoryReport> {
  return repository.getSpendingByCategory(userId, fromMonth, toMonth);
}
