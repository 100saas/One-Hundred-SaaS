// Auto-generated. Do not edit by hand.
// Tool: ticket

migrate((db) => {
  const dao = new Dao(db);

  {
    const collection = new Collection({
      id: "KPlyKEXEXSKO1Zq",
      name: "tenants",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_KPlyKEXEXSKO1Zq_slug` ON `tenants` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "idNnHqnRqBRmJpz",
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
      id: "D0qYn1E0g4xKwD7",
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
      id: "b0P9E1R5RUzwEKW",
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
      id: "4dsB06iwrFkWOaQ",
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
      id: "6ptTbVx2xz9YZlh",
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
      id: "2cuBcLY9yrSN1r5",
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
      id: "xMWlRBGWTgdMWJB",
      name: "audit_logs",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "lVWaeBrIyBAzhY5",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "KPlyKEXEXSKO1Zq";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "D3s4JmZKUTHytLS",
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
      id: "7vvgpVcPiAFXzjE",
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
      id: "eeTEFtDB24eNpAM",
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
      id: "Vn0cnNvkf1Y0bjM",
      name: "forms",
      type: "base",
      system: false,
    listRule: "\"\" (public)",
    viewRule: "\"\" (public)",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "M5Tuv59Xl8njApJ",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "KPlyKEXEXSKO1Zq";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "DiEoQj3Jq5EXnqx",
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
      id: "AlDTvyvsJE0PCi8",
      name: "sla_hours",
      type: "number",
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
      id: "jHNESq1D1Sz50Wu",
      name: "memberships",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "pRCjF0btKjGcOBp",
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
      id: "AtyU61Bfein2vnP",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "KPlyKEXEXSKO1Zq";
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "sjnCoXsadDibKmL",
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
      id: "GQvydIk5c2E9zIX",
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
      id: "JSFaBGAu4nS5APB",
      name: "stripe_connections",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_JSFaBGAu4nS5APB_tenant` ON `stripe_connections` (`tenant`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "5AJkJB2CJFaEPrj",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "KPlyKEXEXSKO1Zq";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "ogkEapY1Klm4y6t",
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
      id: "YXkCSDOpKp2uqWg",
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
      id: "HMQ5q4tJYITQeOE",
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

  {
    const collection = new Collection({
      id: "4sjLtcRvkogjR9X",
      name: "tickets",
      type: "base",
      system: false,
    listRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "06Ud8aGAkGvpikw",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "KPlyKEXEXSKO1Zq";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "2v1LWBVFES9dbKU",
      name: "form",
      type: "relation",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "Vn0cnNvkf1Y0bjM";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "8q3IgGpktAyMiLN",
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
      id: "SiiXgCUiYYkIZpQ",
      name: "status",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["new", "open", "pending", "resolved"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "FMhEuHIyUvtWPVn",
      name: "priority",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["low", "medium", "high"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "ezpGTBz5B0v3qXG",
      name: "requester_email",
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
      id: "1wU5VxUhIvIKJxO",
      name: "assigned_agent",
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
      id: "10DAgRBvB9T8aXg",
      name: "sla_breach_at",
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
  }

  {
    const collection = new Collection({
      id: "YFkeDBmepZURxYv",
      name: "ticket_messages",
      type: "base",
      system: false,
    listRule: "ticket.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "ticket.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "ik5rOo5wY9lrbj5",
      name: "ticket",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "4sjLtcRvkogjR9X";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "mFvwRU4PJONuoGP",
      name: "sender_type",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["agent", "customer"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "j5dkCqe4kL6VqwY",
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
      id: "78oW0UISUOcAPRt",
      name: "is_internal_note",
      type: "bool",
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

}, (db) => {
  const dao = new Dao(db);

  {
    const collection = dao.findCollectionByNameOrId("YFkeDBmepZURxYv");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("4sjLtcRvkogjR9X");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("JSFaBGAu4nS5APB");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("jHNESq1D1Sz50Wu");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("Vn0cnNvkf1Y0bjM");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("xMWlRBGWTgdMWJB");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("KPlyKEXEXSKO1Zq");
    dao.deleteCollection(collection);
  }
});
