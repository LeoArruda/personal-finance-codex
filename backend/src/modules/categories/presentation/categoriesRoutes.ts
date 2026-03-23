import fp from "fastify-plugin";
import { z } from "zod";
import {
  createCategoryGroup,
  listCategoryGroups,
  type CategoryGroupsRepository
} from "../application/categoryGroups";
import { createCategory, updateCategory, type CategoriesRepository } from "../application/categories";
import { PrismaCategoryGroupsRepository } from "../infrastructure/prismaCategoryGroupsRepository";
import { PrismaCategoriesRepository } from "../infrastructure/prismaCategoriesRepository";

const budgetIdParams = z.object({
  budgetId: z.string().min(1)
});

const createCategoryGroupBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().optional()
});

const createCategoryBodySchema = z.object({
  budgetId: z.string().min(1),
  categoryGroupId: z.string().min(1),
  name: z.string().min(1).max(120),
  kind: z.enum(["income", "expense", "transfer", "system"]).optional(),
  parentCategoryId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional()
});

const updateCategoryBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

const categoryIdParams = z.object({
  categoryId: z.string().min(1)
});

export const categoriesRoutesPlugin = fp<{
  categoryGroupsRepository?: CategoryGroupsRepository;
  categoriesRepository?: CategoriesRepository;
}>(async (app, opts) => {
  const groupRepo = opts.categoryGroupsRepository ?? new PrismaCategoryGroupsRepository();
  const catRepo = opts.categoriesRepository ?? new PrismaCategoriesRepository();

  app.get(
    "/api/v1/budgets/:budgetId/category-groups",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const parsed = budgetIdParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid budget id" });
      }
      const groups = await listCategoryGroups(
        groupRepo,
        request.userContext.userId,
        parsed.data.budgetId
      );
      return groups;
    }
  );

  app.post(
    "/api/v1/budgets/:budgetId/category-groups",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const paramsParsed = budgetIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ message: "Invalid budget id" });
      }
      const bodyParsed = createCategoryGroupBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }
      const created = await createCategoryGroup(
        groupRepo,
        request.userContext.userId,
        paramsParsed.data.budgetId,
        bodyParsed.data
      );
      if (!created) {
        return reply.code(404).send({ message: "Budget not found" });
      }
      return reply.code(201).send(created);
    }
  );

  app.post(
    "/api/v1/categories",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const bodyParsed = createCategoryBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }
      const created = await createCategory(catRepo, request.userContext.userId, bodyParsed.data);
      if (!created) {
        return reply
          .code(404)
          .send({ message: "Budget, category group, or parent category not found or inconsistent" });
      }
      return reply.code(201).send(created);
    }
  );

  app.patch(
    "/api/v1/categories/:categoryId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.userContext) {
        return reply.code(401).send({ message: "Unauthorized" });
      }
      const paramsParsed = categoryIdParams.safeParse(request.params);
      if (!paramsParsed.success) {
        return reply.code(400).send({ message: "Invalid category id" });
      }
      const bodyParsed = updateCategoryBodySchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({ message: "Invalid request payload" });
      }
      const updated = await updateCategory(
        catRepo,
        request.userContext.userId,
        paramsParsed.data.categoryId,
        bodyParsed.data
      );
      if (!updated) {
        return reply.code(404).send({ message: "Category not found" });
      }
      return updated;
    }
  );
});
