import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import { type Env } from "./env";
import { authHookPlugin } from "../modules/auth/presentation/authHook";
import { authRoutesPlugin } from "../modules/auth/presentation/authRoutes";
import { usersRoutesPlugin } from "../modules/users/presentation/usersRoutes";
import { type UsersRepository } from "../modules/users/application/getCurrentUser";
import { budgetsRoutesPlugin } from "../modules/budgets/presentation/budgetsRoutes";
import { type BudgetsRepository } from "../modules/budgets/application/budgets";
import { accountsRoutesPlugin } from "../modules/accounts/presentation/accountsRoutes";
import { type AccountsRepository } from "../modules/accounts/application/accounts";
import { transactionsRoutesPlugin } from "../modules/transactions/presentation/transactionsRoutes";
import { type TransactionsRepository } from "../modules/transactions/application/transactions";
import { transactionSplitsRoutesPlugin } from "../modules/transactions/presentation/transactionSplitsRoutes";
import { type TransactionSplitsRepository } from "../modules/transactions/application/transactionSplits";
import { transfersRoutesPlugin } from "../modules/transfers/presentation/transfersRoutes";
import { type TransfersRepository } from "../modules/transfers/application/transfers";
import { budgetingRoutesPlugin } from "../modules/budgeting/presentation/budgetingRoutes";
import { type BudgetAssignmentsRepository } from "../modules/budgeting/application/assignMoney";
import { type BudgetMonthsRepository } from "../modules/budgeting/application/budgetMonths";
import { recurringRoutesPlugin } from "../modules/recurring/presentation/recurringRoutes";
import { type RecurringRulesRepository } from "../modules/recurring/application/recurringRules";
import { billsRoutesPlugin } from "../modules/bills/presentation/billsRoutes";
import {
  type CreditCardStatementsRepository
} from "../modules/bills/application/creditCardStatements";
import { type BillsRepository } from "../modules/bills/application/bills";
import { goalsRoutesPlugin } from "../modules/goals/presentation/goalsRoutes";
import { type GoalsRepository } from "../modules/goals/application/goals";
import { reportsRoutesPlugin } from "../modules/reports/presentation/reportsRoutes";
import { type ReportsRepository } from "../modules/reports/application/reports";
import { categoriesRoutesPlugin } from "../modules/categories/presentation/categoriesRoutes";
import { type CategoryGroupsRepository } from "../modules/categories/application/categoryGroups";
import { type CategoriesRepository } from "../modules/categories/application/categories";
import { dashboardRoutesPlugin } from "../modules/dashboard/presentation/dashboardRoutes";
import { type DashboardRepository } from "../modules/dashboard/application/dashboard";
import { scenariosRoutesPlugin } from "../modules/scenarios/presentation/scenariosRoutes";
import { rulesRoutesPlugin } from "../modules/rules/presentation/rulesRoutes";
import { type TransactionCategorizationRulesRepository } from "../modules/rules/application/rules";
import { importsRoutesPlugin } from "../modules/imports/presentation/importsRoutes";
import { type BankImportRepository } from "../modules/imports/application/imports";
import { projectionsRoutesPlugin } from "../modules/projections/presentation/projectionsRoutes";
import { type ProjectionsRepository } from "../modules/projections/application/projections";

export type AppDependencies = {
  usersRepository?: UsersRepository;
  budgetsRepository?: BudgetsRepository;
  accountsRepository?: AccountsRepository;
  transactionsRepository?: TransactionsRepository;
  transactionSplitsRepository?: TransactionSplitsRepository;
  transfersRepository?: TransfersRepository;
  budgetMonthsRepository?: BudgetMonthsRepository;
  budgetAssignmentsRepository?: BudgetAssignmentsRepository;
  recurringRulesRepository?: RecurringRulesRepository;
  creditCardStatementsRepository?: CreditCardStatementsRepository;
  billsRepository?: BillsRepository;
  goalsRepository?: GoalsRepository;
  reportsRepository?: ReportsRepository;
  categoryGroupsRepository?: CategoryGroupsRepository;
  categoriesRepository?: CategoriesRepository;
  dashboardRepository?: DashboardRepository;
  transactionCategorizationRulesRepository?: TransactionCategorizationRulesRepository;
  bankImportRepository?: BankImportRepository;
  projectionsRepository?: ProjectionsRepository;
};

export async function createApp(_env: Env, deps: AppDependencies = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  await app.register(cors, { origin: true });
  await app.register(formbody);
  await app.register(authHookPlugin, { env: _env });
  await app.register(authRoutesPlugin);
  await app.register(usersRoutesPlugin, { usersRepository: deps.usersRepository });
  await app.register(budgetsRoutesPlugin, { budgetsRepository: deps.budgetsRepository });
  await app.register(accountsRoutesPlugin, { accountsRepository: deps.accountsRepository });
  await app.register(transactionsRoutesPlugin, {
    transactionsRepository: deps.transactionsRepository
  });
  await app.register(transactionSplitsRoutesPlugin, {
    transactionSplitsRepository: deps.transactionSplitsRepository
  });
  await app.register(transfersRoutesPlugin, { transfersRepository: deps.transfersRepository });
  await app.register(budgetingRoutesPlugin, {
    budgetMonthsRepository: deps.budgetMonthsRepository,
    budgetAssignmentsRepository: deps.budgetAssignmentsRepository
  });
  await app.register(recurringRoutesPlugin, {
    recurringRulesRepository: deps.recurringRulesRepository
  });
  await app.register(billsRoutesPlugin, {
    creditCardStatementsRepository: deps.creditCardStatementsRepository,
    billsRepository: deps.billsRepository
  });
  await app.register(goalsRoutesPlugin, {
    goalsRepository: deps.goalsRepository
  });
  await app.register(reportsRoutesPlugin, {
    reportsRepository: deps.reportsRepository
  });
  await app.register(categoriesRoutesPlugin, {
    categoryGroupsRepository: deps.categoryGroupsRepository,
    categoriesRepository: deps.categoriesRepository
  });
  await app.register(dashboardRoutesPlugin, {
    dashboardRepository: deps.dashboardRepository
  });
  await app.register(scenariosRoutesPlugin, {
    budgetMonthsRepository: deps.budgetMonthsRepository
  });
  await app.register(rulesRoutesPlugin, {
    transactionCategorizationRulesRepository: deps.transactionCategorizationRulesRepository
  });
  await app.register(importsRoutesPlugin, {
    bankImportRepository: deps.bankImportRepository
  });
  await app.register(projectionsRoutesPlugin, {
    projectionsRepository: deps.projectionsRepository
  });

  app.get("/health", async () => {
    return { ok: true };
  });

  return app;
}

