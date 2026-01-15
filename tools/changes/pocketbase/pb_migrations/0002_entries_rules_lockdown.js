// Tool: changes
// Replace placeholder public rules with safe "published-only public read".

migrate((db) => {
  const dao = new Dao(db);
  const c = dao.findCollectionByNameOrId("entries");

  // Public can read only published entries; tenant members can read drafts.
  c.listRule =
    "(@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id) || (published_at != \"\")";
  c.viewRule =
    "(@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id) || (published_at != \"\")";

  // Writes require tenant membership.
  c.createRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  c.updateRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
  c.deleteRule =
    "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";

  dao.saveCollection(c);
});

