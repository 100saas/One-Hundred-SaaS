// Tool: churn
// Replace placeholder public rules with locked-down rules.
//
// Churn uses dedicated public endpoints for widgets, so collection API can remain private.

migrate((db) => {
  const dao = new Dao(db);

  // survey_configs: private to tenant members (admin+ can write).
  {
    const c = dao.findCollectionByNameOrId("survey_configs");
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

  // survey_responses: only tenant members can read; deny direct public creates.
  {
    const c = dao.findCollectionByNameOrId("survey_responses");
    c.createRule = "@request.auth.id != \"\"";
    c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    dao.saveCollection(c);
  }
});
