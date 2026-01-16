// Auto-generated. Do not edit by hand.
// Tool: recover

migrate((db) => {
  const dao = new Dao(db);

  {
    const collection = new Collection({
      id: "vvO3YY63fhaCw39",
      name: "tenants",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant.id ?= id && @collection.memberships.user.id ?= @request.auth.id",
    viewRule: "@collection.memberships.tenant.id ?= id && @collection.memberships.user.id ?= @request.auth.id",
    updateRule: "@collection.memberships.tenant.id ?= id && @collection.memberships.user.id ?= @request.auth.id && @collection.memberships.role = 'owner'",
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_vvO3YY63fhaCw39_slug` ON `tenants` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "VAsCoc3aC5jvNDU",
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
      id: "SVyOYIuZXerUdDt",
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
      id: "rCb8BhvBtSaUOg6",
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
      id: "BKfUv78J0MZusaY",
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
      id: "a6M5KL1GxzvfIGQ",
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
      id: "RrAdoSuJWDkxXni",
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
      id: "ENoYv9RkwrAdA83",
      name: "audit_logs",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')",
    viewRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && (@collection.memberships.role = 'admin' || @collection.memberships.role = 'owner')",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "J2mGUmEQerDITdN",
      name: "tenant",
      type: "relation",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vvO3YY63fhaCw39";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "w8SQccVWuGKBjTr",
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
      id: "bkh64HPZW2vNkIu",
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
      id: "UaynMqlCciJVXT9",
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
      id: "MvowrBTQ84CDyyR",
      name: "incidents",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_MvowrBTQ84CDyyR_stripe_event_id` ON `incidents` (`stripe_event_id`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "B1pxmC8TbvN0WKW",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vvO3YY63fhaCw39";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "qKm5VwH6nqhPsj5",
      name: "stripe_event_id",
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
      id: "rwXQ21x9uyLRJHy",
      name: "amount_cents",
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
      id: "hMddFTt7zO0OSzs",
      name: "customer_email",
      type: "email",
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
      id: "jXHxALHnGzZG0d0",
      name: "status",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["open", "assigned", "resolved", "snoozed"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "K4GSrtlgrzFwHiX",
      name: "assigned_to",
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
      id: "hpeewGFuQ5X5ZSQ",
      name: "memberships",
      type: "base",
      system: false,
    listRule: "user = @request.auth.id || @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "user = @request.auth.id || @collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    createRule: "@request.auth.id != \"\"",
    deleteRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "xvv7wPkkDLF3XGM",
      name: "user",
      type: "relation",
      required: false,
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
      id: "yGeNug8omROXy4g",
      name: "tenant",
      type: "relation",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vvO3YY63fhaCw39";
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "vOq0SXctSy5ZzO9",
      name: "role",
      type: "select",
      required: false,
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
      id: "SOe1V67GUx554jb",
      name: "status",
      type: "select",
      required: false,
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
      id: "2oGpnRe0YoHYIAA",
      name: "rules",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id && @collection.memberships.role = 'owner'",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "iqFpq9a72KHJvrn",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vvO3YY63fhaCw39";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "QcrIjvymOlvKTr7",
      name: "min_amount",
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
      id: "ErJsYV66Pn0BYqm",
      name: "slack_webhook_url",
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

  {
    const collection = new Collection({
      id: "izGTvRsBhD7K2dw",
      name: "stripe_connections",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_izGTvRsBhD7K2dw_tenant` ON `stripe_connections` (`tenant`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "6US3IrMY38xuAaA",
      name: "tenant",
      type: "relation",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "vvO3YY63fhaCw39";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "U0lhhOUSuc1IhJG",
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
      id: "xElMmg20twsak8k",
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
      id: "t7m6yQX0R68pcwR",
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
    const collection = dao.findCollectionByNameOrId("izGTvRsBhD7K2dw");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("2oGpnRe0YoHYIAA");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("hpeewGFuQ5X5ZSQ");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("MvowrBTQ84CDyyR");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("ENoYv9RkwrAdA83");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("vvO3YY63fhaCw39");
    dao.deleteCollection(collection);
  }
});
