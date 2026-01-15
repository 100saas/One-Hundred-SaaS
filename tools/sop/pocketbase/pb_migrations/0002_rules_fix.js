// Tool: sop
// Fix broken traversal rules for procedure_steps and lock down writes.

migrate((db) => {
  const dao = new Dao(db);

  // procedures: list/view already tenant-scoped; admin+ for writes.
  {
    const c = dao.findCollectionByNameOrId("procedures");
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    dao.saveCollection(c);
  }

  // procedure_steps: scope via procedure.tenant
  {
    const c = dao.findCollectionByNameOrId("procedure_steps");
    c.listRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= procedure.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= procedure.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= procedure.tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= procedure.tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= procedure.tenant && @collection.memberships.user ?= @request.auth.id";
    dao.saveCollection(c);
  }
});

