// Tool: pay
// Allow public invoice uploads via token (hook enforces token match).

migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("invoices");

  // Public create is allowed only when upload fields are present.
  collection.createRule = "@request.data.contractor != \"\" && @request.data.upload_token != \"\"";
  // Prevent public edits/deletes.
  collection.updateRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  collection.deleteRule =
    "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";

  dao.saveCollection(collection);
});

