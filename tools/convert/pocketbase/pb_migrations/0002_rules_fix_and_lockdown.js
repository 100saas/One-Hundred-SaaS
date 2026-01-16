// Tool: convert
// Fix invalid placeholder rules and lock down writes while keeping widget reads public.

migrate((db) => {
  const dao = new Dao(db);

  {
    const c = dao.findCollectionByNameOrId("widgets");
    // Public widget reads (the widget script uses list + filter).
    c.listRule = "";
    c.viewRule = "";
    // Admin-only writes.
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }
});
