// Tool: collect
// Fix placeholder public rules, reduce tenant enumeration, and harden writes.
//
// Public UX:
// - Public page fetches request by slug via /api/collect/public/request.
// - Uploads are created publicly via PB records API (multipart), so `uploads.createRule` is public.

migrate((db) => {
  const dao = new Dao(db);

  // requests: internal by tenant; admin+ for writes.
  {
    const c = dao.findCollectionByNameOrId("requests");
    c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // uploads: public create, but internal list/view via request.tenant.
  {
    const c = dao.findCollectionByNameOrId("uploads");
    c.listRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= request.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= request.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule = "";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= request.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= request.tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }
});
