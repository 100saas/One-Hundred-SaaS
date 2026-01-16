// Auto-generated. Do not edit by hand.
// Tool: careers

migrate((db) => {
  const dao = new Dao(db);

  {
    const collection = new Collection({
      id: "JEWsMJjaSFICiKu",
      name: "tenants",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_JEWsMJjaSFICiKu_slug` ON `tenants` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "COhwZen979VX1Yh",
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
      id: "UwcLaPtDVypxu6U",
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
      id: "uXFKdj5YFHp9syI",
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
      id: "9XO8LfbNk3ktFvn",
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
      id: "FDUCO9EFnPnD00Y",
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
      id: "rplWLZL8JceYNpj",
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
      id: "bExB4lbBEIhODfB",
      name: "audit_logs",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "sK0PlbFqjGhBr9t",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "JEWsMJjaSFICiKu";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "OOzCDRLQpNJvVd4",
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
      id: "xY8BvDZYAEnOWaC",
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
      id: "DOcTDaRYXtVMbwN",
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
      id: "CjXzMmuRbhm7tdX",
      name: "career_sites",
      type: "base",
      system: false,
    listRule: "\"\" (public)",
    viewRule: "\"\" (public)",
    createRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_CjXzMmuRbhm7tdX_slug` ON `career_sites` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "dzhpbZ6baNPguP5",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "JEWsMJjaSFICiKu";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "vubHSwLJ1uejKdQ",
      name: "title",
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
      id: "mf0j4ZJBFPFiKRq",
      name: "brand_color",
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
      id: "UtMgP5AaRBHgJTW",
      name: "logo",
      type: "file",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.maxSize = 10485760;
    field.options.mimeTypes = [];
    field.options.thumbs = [];
    field.options.protected = false;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "lJxpFhz4w2Mqy3U",
      name: "custom_css",
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
      id: "ZAL3oPVD1zWsiho",
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
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "d5Z2IWKUEmWtZHu",
      name: "job_listings",
      type: "base",
      system: false,
    listRule: "\"\" (public)",
    viewRule: "\"\" (public)",
    createRule: "site.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "site.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "Zl4qpK1w1Zvq85m",
      name: "site",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "CjXzMmuRbhm7tdX";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "hh8UCfzNpm8T6U8",
      name: "title",
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
      id: "Cjlb8hRfvJCfEUi",
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
      id: "yho9MX7n6NB0Ojc",
      name: "type",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["full_time", "contract"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "fC44IXVb7LntPi8",
      name: "apply_link",
      type: "url",
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
      id: "J7BxSSrLCdCklFm",
      name: "is_active",
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

  {
    const collection = new Collection({
      id: "Stu3Oda5f3dvZQu",
      name: "memberships",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "3U8vQnsuBwh1Ho1",
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
      id: "v5NflaT5uqqfUcd",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "JEWsMJjaSFICiKu";
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "OBI41ALUoql7KUV",
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
      id: "np400yH6bhHoS8o",
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
      id: "yDS50WG39qOCuIM",
      name: "stripe_connections",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_yDS50WG39qOCuIM_tenant` ON `stripe_connections` (`tenant`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "6GpIbQChS1d5oBO",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "JEWsMJjaSFICiKu";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "61ocGNo0c41lp0r",
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
      id: "YhH2Lbw3VxdS9x1",
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
      id: "BtKwUpbnVXy5lnE",
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
    const collection = dao.findCollectionByNameOrId("yDS50WG39qOCuIM");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("Stu3Oda5f3dvZQu");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("d5Z2IWKUEmWtZHu");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("CjXzMmuRbhm7tdX");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("bExB4lbBEIhODfB");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("JEWsMJjaSFICiKu");
    dao.deleteCollection(collection);
  }
});
