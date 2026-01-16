// Tool: brief
// Fix invalid placeholder rules, lock down writes, and add a template relation for writer rendering/export.

migrate((db) => {
  const dao = new Dao(db);

  // brief_templates: admin+ writes.
  {
    const c = dao.findCollectionByNameOrId("brief_templates");
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // briefs: fix invalid viewRule and lock down writes.
  {
    const c = dao.findCollectionByNameOrId("briefs");
    c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";

    // Add template relation if missing (helps render writer view + export).
    try {
      c.schema.getFieldByNameOrId("template");
    } catch (_) {
      const field = new SchemaField({
        system: false,
        id: "brief_template",
        name: "template",
        type: "relation",
        required: false,
        presentable: true,
        unique: false,
        options: {},
      });
      field.initOptions();
      field.options.collectionId = dao.findCollectionByNameOrId("brief_templates").id;
      field.options.cascadeDelete = false;
      field.options.minSelect = null;
      field.options.maxSelect = 1;
      field.options.displayFields = null;
      c.schema.addField(field);
    }

    dao.saveCollection(c);
  }
});
