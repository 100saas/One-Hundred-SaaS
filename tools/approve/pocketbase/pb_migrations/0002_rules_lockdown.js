// Tool: approve
// Add tenant-scoped API rules for proofs/annotations and keep public access token-based via custom endpoints.
//
// Notes:
// - Proof images need to load on the public share page. PocketBase file access is gated by the record view rule,
//   so we allow public view for `proofs` while keeping list and all writes tenant-scoped.
// - Annotations stay private (public access is via /api/approve/public/* endpoints).

migrate((db) => {
  const dao = new Dao(db);

  // projects: already tenant-scoped in init schema; restrict writes to admin+ / owner.
  {
    const c = dao.findCollectionByNameOrId("projects");
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // proofs: list is tenant-scoped; view is public for image/file access.
  {
    const c = dao.findCollectionByNameOrId("proofs");
    c.listRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= project.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= project.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= project.tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= project.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    dao.saveCollection(c);
  }

  // annotations: tenant-scoped via proof.project.tenant; keep private.
  {
    const c = dao.findCollectionByNameOrId("annotations");
    c.listRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= proof.project.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= proof.project.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= proof.project.tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= proof.project.tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= proof.project.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    dao.saveCollection(c);
  }
});
