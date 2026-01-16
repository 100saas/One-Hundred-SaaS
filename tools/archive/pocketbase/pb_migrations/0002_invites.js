// Tool: archive

migrate((db) => {
  const dao = new Dao(db);

  const collection = new Collection({
    id: "invArchive0002",
    name: "invites",
    type: "base",
    system: false,
    listRule:
      "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')",
    viewRule:
      "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')",
    createRule:
      "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')",
    updateRule:
      "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'",
    deleteRule:
      "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'",
  });

  collection.schema = new Schema({});
  collection.indexes = ["CREATE UNIQUE INDEX `idx_invites_token` ON `invites` (`token`)"];

  {
    const field = new SchemaField({
      system: false,
      id: "inv_tenant",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = dao.findCollectionByNameOrId("tenants").id;
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_email",
      name: "email",
      type: "email",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_role",
      name: "role",
      type: "select",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["admin", "member", "viewer"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_status",
      name: "status",
      type: "select",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["pending", "accepted", "revoked", "expired"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_token",
      name: "token",
      type: "text",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_created_by",
      name: "created_by",
      type: "relation",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = dao.findCollectionByNameOrId("users").id;
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_accepted_by",
      name: "accepted_by",
      type: "relation",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = dao.findCollectionByNameOrId("users").id;
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_expires_at",
      name: "expires_at",
      type: "date",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "inv_accepted_at",
      name: "accepted_at",
      type: "date",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    collection.schema.addField(field);
  }

  dao.saveCollection(collection);
});
