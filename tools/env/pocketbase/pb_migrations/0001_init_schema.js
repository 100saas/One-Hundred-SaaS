// Auto-generated. Do not edit by hand.
// Tool: env

migrate((db) => {
  const dao = new Dao(db);

  {
    const collection = new Collection({
      id: "P8N4WbtZMCkAZEC",
      name: "tenants",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_P8N4WbtZMCkAZEC_slug` ON `tenants` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "ZAuH6zLLOUhcIUI",
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
      id: "6PdIwo0exj8pmuv",
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
      id: "r02YGSscmNR6UjD",
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
      id: "xDC6XrXKlObrlAd",
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
      id: "OChxuU1pOFRHVMO",
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
      id: "34ziRbyDaVJd2L9",
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
      id: "bS0KnuKcA2Jd7G0",
      name: "audit_logs",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "cqTcOxDhFKvqhAb",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "P8N4WbtZMCkAZEC";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "UKiDAJqUopVZDip",
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
      id: "L7lfVUWgVAwBQCh",
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
      id: "dUqQGBl2CgPfY3Q",
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
      id: "4X45WAF11uxRtMr",
      name: "environments",
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
      id: "HL4s9Rnoyo8XDDy",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "P8N4WbtZMCkAZEC";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "ui51yE1n3fhtnnp",
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
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "YjyFepkc0IdaCke",
      name: "memberships",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "CJzVChDn7aDxsRB",
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
      id: "0TTKPAylGJQMhIb",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "P8N4WbtZMCkAZEC";
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "JZLxO9grP9Tos1s",
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
      id: "t2MVs0nxY8Um7mj",
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
      id: "zpYAXTedztV87pt",
      name: "secret_specs",
      type: "base",
      system: false,
    listRule: "environment.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "environment.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    createRule: "environment.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "environment.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "qTIfCMGWv1GC2K9",
      name: "environment",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "4X45WAF11uxRtMr";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "LBay85E6psDHZrm",
      name: "key_name",
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
      id: "1ELqQd0awRAcIBb",
      name: "location",
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
      id: "sceRVLuN8DepepQ",
      name: "last_rotated",
      type: "date",
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
      id: "IuLxA0CW2zH4Ts8",
      name: "rotation_interval_days",
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
      id: "paRTyfq57YR6251",
      name: "owner",
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
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "oMgoBlHdxptyj00",
      name: "stripe_connections",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_oMgoBlHdxptyj00_tenant` ON `stripe_connections` (`tenant`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "DUzyJ73o8hyOkUN",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "P8N4WbtZMCkAZEC";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "WgL5ZyCQVxYv1WP",
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
      id: "51gyLPCwDXBhvCV",
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
      id: "4kAP3aZsydsdvdx",
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
    const collection = dao.findCollectionByNameOrId("oMgoBlHdxptyj00");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("zpYAXTedztV87pt");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("YjyFepkc0IdaCke");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("4X45WAF11uxRtMr");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("bS0KnuKcA2Jd7G0");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("P8N4WbtZMCkAZEC");
    dao.deleteCollection(collection);
  }
});
