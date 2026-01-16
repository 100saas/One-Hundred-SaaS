// Tool: tours
// Replace placeholder public rules with locked-down rules.
//
// Tours uses a dedicated public endpoint for widgets, so collection API can remain private.

migrate((db) => {
  const dao = new Dao(db);
  const c = dao.findCollectionByNameOrId("tours");

  c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
  c.viewRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
  c.createRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  c.updateRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  c.deleteRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";

  dao.saveCollection(c);
});
