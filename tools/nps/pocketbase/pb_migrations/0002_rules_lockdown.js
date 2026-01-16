// Tool: nps
// Replace placeholder public rules with:
// - surveys: public read only when active; tenant members can read drafts/inactive.
// - nps_responses: public create only when survey active; responses not publicly readable.

migrate((db) => {
  const dao = new Dao(db);

  // surveys
  {
    const c = dao.findCollectionByNameOrId("surveys");
    c.listRule =
      "(is_active = true) || (@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id)";
    c.viewRule =
      "(is_active = true) || (@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id)";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // nps_responses
  {
    const c = dao.findCollectionByNameOrId("nps_responses");
    c.createRule = "survey.is_active = true";
    c.listRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= survey.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= survey.tenant && @collection.memberships.user ?= @request.auth.id";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= survey.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= survey.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    dao.saveCollection(c);
  }
});
