// Tool: pay
// Upload tokens are secrets; restrict contractors read access to tenant admins/owners.

migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("contractors");

  collection.listRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  collection.viewRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  collection.createRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  collection.updateRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
  collection.deleteRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";

  dao.saveCollection(collection);
});
