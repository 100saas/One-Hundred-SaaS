// Tool: action
// Harden writes to require membership and prevent cross-tenant edits.

migrate((db) => {
  const dao = new Dao(db);

  {
    const c = dao.findCollectionByNameOrId("meetings");
    c.createRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  {
    const c = dao.findCollectionByNameOrId("action_items");
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }
});
