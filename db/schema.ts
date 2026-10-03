import {sqliteTable,integer,text} from 'drizzle-orm/sqlite-core';
export const workspace=sqliteTable('workspace',{id:integer('id').primaryKey(),version:integer('version').notNull().default(0),content:text('content').notNull()});
