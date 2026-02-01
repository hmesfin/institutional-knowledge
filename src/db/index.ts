export { initializeDb, closeDb, runMigrations, migrateDown, getSchemaVersion } from './schema.js';

export {
  createKnowledgeItem,
  getKnowledgeItemById,
  listKnowledgeItems,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  queryKnowledgeItems,
  type QueryOptions,
  type PaginationOptions,
} from './operations.js';
