// Auto-generated. Do not edit by hand.
// Tool: hire

migrate((db) => {
  const dao = new Dao(db);

  {
    const collection = new Collection({
      id: "jGfeF1t9t7DA5g6",
      name: "tenants",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_jGfeF1t9t7DA5g6_slug` ON `tenants` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "kpEpgKgqS4cYhlM",
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
      id: "ZnN2tSDu1TxTRpV",
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
      id: "H49CBVvDIsmZNst",
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
      id: "mvYSntgogHO15Wv",
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
      id: "qL8Og9dnzaqg02H",
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
      id: "uOQ4FctL2rfI14k",
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
      id: "3Wxj37rpxSZQ5Kx",
      name: "jobs",
      type: "base",
      system: false,
    listRule: "status = 'published' (public)",
    viewRule: "status = 'published' (public)",
    createRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    updateRule: "@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_3Wxj37rpxSZQ5Kx_slug` ON `jobs` (`slug`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "1KX1hlpW58CvHdu",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "jGfeF1t9t7DA5g6";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "TzCZlZDGEj7GtMy",
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
      id: "6iLbh0gbHuK25ST",
      name: "description_html",
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
      id: "jDdaFexMROi2ok6",
      name: "status",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["draft", "published", "closed"];
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "MKE4DWrIf2O8VXY",
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
      id: "BFNtr31jU9QvIPZ",
      name: "applicants",
      type: "base",
      system: false,
    listRule: "job.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    viewRule: "job.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    createRule: "\"\" (public)",
    updateRule: "job.@collection.memberships.tenant ?= tenant && @collection.memberships.user ?= @request.auth.id",
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "d0wcstO7f0aSXfA",
      name: "job",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "3Wxj37rpxSZQ5Kx";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "w1LTuD8YWJFqQq9",
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
      id: "8SCvk0MenKjPNwe",
      name: "email",
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
      id: "ulwxKgOVE9oNh3q",
      name: "resume",
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
      id: "VRY3dNfemf8Z7C0",
      name: "stage",
      type: "select",
      required: false,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.maxSelect = 1;
    field.options.values = ["applied", "screening", "interview", "offer", "rejected"];
    collection.schema.addField(field);
  }
    dao.saveCollection(collection);
  }

  {
    const collection = new Collection({
      id: "TtU9aOiGbnwXlkl",
      name: "audit_logs",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "Ii6AkCza4Lof5TB",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "jGfeF1t9t7DA5g6";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "ONu21sK1wkuLGwZ",
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
      id: "VUkFGBsQGNDTOZo",
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
      id: "1QhsS2R7H9napa7",
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
      id: "cViPemKX6xLlgo6",
      name: "memberships",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
  {
    const field = new SchemaField({
      system: false,
      id: "F2vTI8jIR3p9Eq5",
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
      id: "sOl5VWzS2RtuV0f",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "jGfeF1t9t7DA5g6";
    field.options.cascadeDelete = true;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "TtodjSmDZeLGJwY",
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
      id: "06SaZCZHfb2iUx6",
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
      id: "zAvsN5b7dVlLuyt",
      name: "stripe_connections",
      type: "base",
      system: false,
    });
    collection.schema = new Schema({});
    collection.indexes = [
    "CREATE UNIQUE INDEX `idx_zAvsN5b7dVlLuyt_tenant` ON `stripe_connections` (`tenant`)",
    ];
  {
    const field = new SchemaField({
      system: false,
      id: "mK0p60IqZpH6zui",
      name: "tenant",
      type: "relation",
      required: true,
      presentable: true,
      unique: false,
      options: {},
    });
    field.initOptions();
    field.options.collectionId = "jGfeF1t9t7DA5g6";
    field.options.cascadeDelete = false;
    field.options.minSelect = null;
    field.options.maxSelect = 1;
    field.options.displayFields = null;
    collection.schema.addField(field);
  }
  {
    const field = new SchemaField({
      system: false,
      id: "cuPQR3DkuSsOvoz",
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
      id: "G7j4OqV3cuRNdxn",
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
      id: "X9LqAMLNHUPREwi",
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
    const collection = dao.findCollectionByNameOrId("zAvsN5b7dVlLuyt");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("cViPemKX6xLlgo6");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("TtU9aOiGbnwXlkl");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("BFNtr31jU9QvIPZ");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("3Wxj37rpxSZQ5Kx");
    dao.deleteCollection(collection);
  }
  {
    const collection = dao.findCollectionByNameOrId("jGfeF1t9t7DA5g6");
    dao.deleteCollection(collection);
  }
});
