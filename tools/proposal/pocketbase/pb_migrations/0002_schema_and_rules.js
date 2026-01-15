// Tool: proposal
// Fix invalid placeholder rules and add fields needed for public rendering + signature.

migrate((db) => {
  const dao = new Dao(db);

  // templates: admin+ writes.
  {
    const c = dao.findCollectionByNameOrId("templates");
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";
    dao.saveCollection(c);
  }

  // proposals: fix invalid viewRule and lock down writes.
  {
    const c = dao.findCollectionByNameOrId("proposals");
    c.listRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.viewRule = "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id";
    c.createRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.updateRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')";
    c.deleteRule =
      "@request.auth.id != \"\" && @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'";

    // Add fields if missing:
    // - template (relation to templates)
    // - content_html (editor snapshot to render publicly)
    // - accepted_at (date)
    // - signature_name (text)
    try {
      c.schema.getFieldByNameOrId("template");
    } catch (_) {
      const field = new SchemaField({
        system: false,
        id: "prop_template",
        name: "template",
        type: "relation",
        required: false,
        presentable: true,
        unique: false,
        options: {},
      });
      field.initOptions();
      field.options.collectionId = dao.findCollectionByNameOrId("templates").id;
      field.options.cascadeDelete = false;
      field.options.minSelect = null;
      field.options.maxSelect = 1;
      field.options.displayFields = null;
      c.schema.addField(field);
    }

    try {
      c.schema.getFieldByNameOrId("content_html");
    } catch (_) {
      const field = new SchemaField({
        system: false,
        id: "prop_content",
        name: "content_html",
        type: "editor",
        required: false,
        presentable: true,
        unique: false,
        options: {},
      });
      field.initOptions();
      c.schema.addField(field);
    }

    try {
      c.schema.getFieldByNameOrId("accepted_at");
    } catch (_) {
      const field = new SchemaField({
        system: false,
        id: "prop_accepted_at",
        name: "accepted_at",
        type: "date",
        required: false,
        presentable: true,
        unique: false,
        options: {},
      });
      field.initOptions();
      c.schema.addField(field);
    }

    try {
      c.schema.getFieldByNameOrId("signature_name");
    } catch (_) {
      const field = new SchemaField({
        system: false,
        id: "prop_sig_name",
        name: "signature_name",
        type: "text",
        required: false,
        presentable: true,
        unique: false,
        options: {},
      });
      field.initOptions();
      c.schema.addField(field);
    }

    dao.saveCollection(c);
  }
});

