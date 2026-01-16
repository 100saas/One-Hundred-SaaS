// Tool: vote
// Allow public read for public boards/posts while keeping write actions gated.

migrate((db) => {
  const dao = new Dao(db);

  // boards: public view/list only when is_public=true
  {
    const c = dao.findCollectionByNameOrId("boards");
    c.listRule =
      "(is_public = true) || (@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id)";
    c.viewRule =
      "(is_public = true) || (@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id)";
    dao.saveCollection(c);
  }

  // posts: public view/list only when board.is_public=true
  {
    const c = dao.findCollectionByNameOrId("posts");
    c.listRule =
      "(board.is_public = true) || (@request.auth.id != \"\" && @collection.memberships.tenant ?= board.tenant && @collection.memberships.user ?= @request.auth.id)";
    c.viewRule =
      "(board.is_public = true) || (@request.auth.id != \"\" && @collection.memberships.tenant ?= board.tenant && @collection.memberships.user ?= @request.auth.id)";
    dao.saveCollection(c);
  }
});
