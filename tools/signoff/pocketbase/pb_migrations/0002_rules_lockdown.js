// Tool: signoff
// Lock down internal writes and allow public view for deliverable file access.

migrate((db) => {
  const dao = new Dao(db);

  const c = dao.findCollectionByNameOrId("deliverables");

  // Internal list stays tenant-scoped; view must be public so /api/files can serve attachments on the review page.
  c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
  c.viewRule = "";

  c.createRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  c.updateRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  c.deleteRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";

  dao.saveCollection(c);
});

