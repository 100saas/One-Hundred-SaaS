// Tool: vote
// Replace placeholder public rules with safe tenant-scoped rules.

migrate((db) => {
  const dao = new Dao(db);

  // boards
  {
    const c = dao.findCollectionByNameOrId("boards");
    c.listRule = "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule = "@request.auth.id != \"\"";
    c.updateRule = "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule = "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // posts
  {
    const c = dao.findCollectionByNameOrId("posts");
    // posts are scoped via board.tenant
    c.listRule = "@collection.memberships.tenant ?= board.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@collection.memberships.tenant ?= board.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule = "@request.auth.id != \"\"";
    c.updateRule =
      "@collection.memberships.tenant ?= board.tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@collection.memberships.tenant ?= board.tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // votes
  {
    const c = dao.findCollectionByNameOrId("votes");
    // votes are scoped via post.board.tenant
    c.listRule = "@collection.memberships.tenant ?= post.board.tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@collection.memberships.tenant ?= post.board.tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule = "@request.auth.id != \"\"";
    c.deleteRule = "@collection.memberships.tenant ?= post.board.tenant && @collection.memberships.user ?= @request.auth.id";
    dao.saveCollection(c);
  }
});
