// Tool: audit-links
// Fix invalid relation rules and lock down writes.

migrate((db) => {
  const dao = new Dao(db);

  {
    const c = dao.findCollectionByNameOrId("audits");
    c.createRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  {
    const c = dao.findCollectionByNameOrId("audit_issues");
    // Fix placeholder-style rule from generator: scope via audit.tenant.
    c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= audit.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= audit.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= audit.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= audit.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= audit.tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }
});
