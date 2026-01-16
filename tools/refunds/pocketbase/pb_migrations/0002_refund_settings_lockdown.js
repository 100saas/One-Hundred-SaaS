// Tool: refunds
// Tighten refund_settings read access (Slack webhook URL should not be readable by non-owners).

migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("refund_settings");

  collection.listRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
  collection.viewRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
  collection.updateRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";

  dao.saveCollection(collection);
});
