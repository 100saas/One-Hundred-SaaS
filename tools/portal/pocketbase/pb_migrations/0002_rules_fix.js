// Tool: portal
// Fix broken traversal rules for portal_items and lock down writes.

migrate((db) => {
  const dao = new Dao(db);

  // clients: list/view already tenant-scoped; admin+ for writes.
  {
    const c = dao.findCollectionByNameOrId("clients");
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // portal_items: scope via client.tenant (fix broken rule string).
  {
    const c = dao.findCollectionByNameOrId("portal_items");
    c.listRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= client.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= client.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= client.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= client.tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= client.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    dao.saveCollection(c);
  }
});
