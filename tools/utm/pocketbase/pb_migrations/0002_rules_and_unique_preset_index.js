// Tool: utm
// Enforce unique presets per tenant/category/value.

migrate((db) => {
  const dao = new Dao(db);

  {
    const c = dao.findCollectionByNameOrId("presets");
    // Composite uniqueness prevents preset sprawl and enables strict validation.
    c.indexes = Array.isArray(c.indexes) ? c.indexes : [];
    const idx = "CREATE UNIQUE INDEX IF NOT EXISTS `idx_presets_tenant_category_value` ON `presets` (`tenant`,`category`,`value`)";
    if (!c.indexes.includes(idx)) c.indexes.push(idx);
    dao.saveCollection(c);
  }
});
