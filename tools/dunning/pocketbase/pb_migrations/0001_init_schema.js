// Auto-generated. Do not edit by hand.
// Tool: dunning

migrate((db) => {
  const dao = new Dao(db);

  {
    const collection = new Collection({
      id: "vztIxPi8Z1tMxkd",
      name: "tenants",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_vztIxPi8Z1tMxkd_slug` ON `tenants` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "GPpUoSqRWEEHt5j",
      name: "name",
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
      id: "x7zKkmLN4kwpFzR",
      name: "slug",
      type: "text",
      required: false,
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
      id: "1Lmf8lKEJRxFLoi",
      name: "rc_customer_id",
      type: "text",
      required: false,
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
      id: "s7iyHUWfupohNmh",
      name: "entitlements",
      type: "json",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSize = 2000000;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "MD4ylSMxAueuLbf",
      name: "stripe_customer_id",
      type: "text",
      required: false,
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
      id: "BzeZ1DC0XJ2lqIz",
      name: "settings",
      type: "json",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSize = 2000000;
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "XhiEr8YbhZdb8ZB",
      name: "audit_logs",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "Oo3ZzD1Atsvw6Aj",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vztIxPi8Z1tMxkd";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "ajRDlzehnemuBoq",
      name: "actor",
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
      id: "4JJmqqa8SEW2DnB",
      name: "action",
      type: "text",
      required: false,
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
      id: "cfF60WtmLkbIsAw",
      name: "details",
      type: "json",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSize = 2000000;
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "Ex5dDWFPG75Y1L8",
      name: "memberships",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "vediefg5bltevrR",
      name: "user",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = dao.findCollectionByNameOrId("users").id;
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "CXR7yzoMzW7xaNA",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vztIxPi8Z1tMxkd";
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "zwytNKLcEw53tA1",
      name: "role",
      type: "select",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["owner", "admin", "member", "viewer"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "yFttjiabjpTwcmP",
      name: "status",
      type: "select",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["active", "invited"];
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "6trIMSDXNQFlRaj",
      name: "sequences",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    createRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "KG2zmq0thv5xd27",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vztIxPi8Z1tMxkd";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "f5YVhEAGd5E4TiS",
      name: "name",
      type: "text",
      required: false,
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
      id: "vCQugPC7ljtAGMe",
      name: "trigger",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["payment_failed", "card_expiring"];
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "pwaOQjAtYyNG6qy",
      name: "steps",
      type: "base",
      system: false,
    listRule: "sequence.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "sequence.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    createRule: "sequence.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "sequence.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "fWED2KLVLih8ASL",
      name: "sequence",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "6trIMSDXNQFlRaj";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "rt8V4KDiiiwkRGh",
      name: "day_delay",
      type: "number",
      required: false,
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
      id: "UXYpyGXUvf6DdaX",
      name: "subject",
      type: "text",
      required: false,
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
      id: "tNzhS0cfhwknjW9",
      name: "body_html",
      type: "editor",
      required: false,
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
      id: "Q6s8phcp1T0CKAG",
      name: "type",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["email", "in_app_banner"];
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "QHQulGTIqN9UTKw",
      name: "stripe_connections",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_QHQulGTIqN9UTKw_tenant` ON `stripe_connections` (`tenant`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "2x03LW3f1eaj75G",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vztIxPi8Z1tMxkd";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "IXsg5vjzbcLgVEF",
      name: "stripe_account_id",
      type: "text",
      required: false,
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
      id: "VEgkA2QQ2KJ3SXE",
      name: "access_token",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: {},
    });
    field.initOptions();
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "ImQ1Ov4oooxpAUh",
      name: "refresh_token",
      type: "text",
      required: false,
      presentable: false,
      unique: false,
      options: {},
    });
    field.initOptions();
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

}, (db) => {
  const dao = new Dao(db);

  {
    const collection = dao.findCollectionByNameOrId("QHQulGTIqN9UTKw");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("pwaOQjAtYyNG6qy");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("6trIMSDXNQFlRaj");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("Ex5dDWFPG75Y1L8");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("XhiEr8YbhZdb8ZB");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("vztIxPi8Z1tMxkd");
    dao.deleteCollection(collection);
  }
});
