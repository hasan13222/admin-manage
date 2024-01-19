const express = require("express");
// const cors = require('cors');
const multer  = require('multer')

const UPLOADS_FOLDER = `public/uploads/`;
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, UPLOADS_FOLDER);
        },
        filename: (req, file, cb) => {
            const fileExt = path.extname(file.originalname);
            const fileName = file.originalname.replace(fileExt, "").toLowerCase().split(" ").join("-") + "-" + Date.now() + fileExt;
        cb(null, fileName);
        }
    });

    const upload = multer({
        storage: storage,
    })

const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// middlewares
app.use(express.json());
// app.use(cors());
app.use(express.urlencoded({ extended: true }));

// set view engine
app.set("view engine", "ejs");

// set static folder
app.use(express.static(path.join(__dirname, "public")));

// database user = admin-manager
// password = SDr6KzmjOj5VkBXs

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uowwywl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const database = client.db("admin-manage");
    const userCollection = database.collection("users");

    // authenticate the admin
    app.post("/auth-user", async (req, res) => {
      const userId = req.body.user_id;
      const query = { user_id: userId };

      const result = await userCollection.findOne(query);
      const viewUsers = await userCollection
        .find({ role: { $ne: "admin" } })
        .limit(2)
        .toArray();
      if (result) {
        const userResult = await bcrypt.compare(
          req.body.password,
          result.password
        );
        if (userResult) {
          res.render("add-user", { message: "", users: viewUsers });
        } else {
          res.render("admin-login", { message: "Wrong Password" });
        }
      } else {
        res.render("admin-login", { message: "Wrong userId" });
      }
    });

    // authenticate the normal user
    app.post("/login-user", async (req, res) => {
      const userId = req.body.user_id;
      const query = { user_id: userId };

      const result = await userCollection.findOne(query);
      
      if (result) {
        const userResult = await bcrypt.compare(
          req.body.password,
          result.password
        );
        if (userResult) {
          res.render("user-upload", {userId, user_name: "", user_photo: ""});
        } else {
          res.render("user-login", { message: "Wrong Password" });
        }
      } else {
        res.render("user-login", { message: "Wrong userId" });
      }
    });

    // create new user
    app.post("/create-user", async (req, res) => {
      const userId = req.body.user_id;
      const hashPassword = await bcrypt.hash(req.body.password, 10);
      const findUser = await userCollection.findOne({ user_id: userId });
      if (findUser) {
        res.render("add-user", { message: "User already exists" });
      }
      let newUser = { user_id: userId, password: hashPassword };
      const result = await userCollection.insertOne(newUser);
      if (result) {
        const users = await userCollection
        .find({ role: { $ne: "admin" } })
        .limit(2)
        .toArray();
        res.render("add-user", { message: "User added successfully", users });
      }
    });

    // user name and photo upload
    app.post('/photo-upload/:id', upload.single('user_photo'), async function (req, res, next) {
      console.log(req.file, req.body);
      const updateDoc = {
        $set: {
          user_name: req.body.name,
          user_photo: req.file.filename
        }
      }
      const result = await userCollection.updateOne({user_id: req.params.id}, updateDoc);
      if (result){
        res.render("user-upload", {
          userId: req.params.id,
          user_name: req.body.name,
          user_photo: req.file.filename
        })
      }
     })
     
    // all users
    app.get("/users", async (req, res) => {
      const users = await userCollection
        .find({ role: { $ne: "admin" } })
        .toArray();
      res.render("users", { users });
    });

    // add user page
    app.get("/usr", async (req, res) => {
      const viewUsers = await userCollection
        .find({ role: { $ne: "admin" } })
        .limit(2)
        .toArray();
      res.render("add-user", { message: "" , users: viewUsers });
    });

    // delete user
    app.delete("/user/:id", async (req, res) => {
      const deletedUser = await userCollection.deleteOne({
        user_id: req.params.id,
      })
      
        res.send(deletedUser)
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/admin-login", (req, res) => {
  res.render("admin-login", { message: "" });
});

app.get("/user-login", (req, res) => {
  res.render("user-login", {message: ""});
});



// app.get("/user-upload", (req, res) => {
//   res.render("user-upload");
// });

// app.get('/login', (req, res) => {
//   res.render("dashboard")
// })

app.listen(port, () => {
  console.log(`Admin manage user access app listening on port ${port}`);
});
