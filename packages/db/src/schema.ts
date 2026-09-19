import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const Tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
});
