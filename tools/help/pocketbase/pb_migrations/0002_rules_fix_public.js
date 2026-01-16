// Tool: help
// Replace placeholder public rules with real expressions and lock down writes.

migrate((db) => {
  const dao = new Dao(db);

  // collections: public read, admin+ write.
  {
    const c = dao.findCollectionByNameOrId("collections");
    c.listRule = "";
    c.viewRule = "";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // articles: published-only public read already set; lock down writes to admins.
  {
    const c = dao.findCollectionByNameOrId("articles");
    c.createRule = "@request.auth.id != \"\"";
    c.updateRule = "@request.auth.id != \"\"";
    c.deleteRule = "@request.auth.id != \"\"";
    dao.saveCollection(c);
  }
});
