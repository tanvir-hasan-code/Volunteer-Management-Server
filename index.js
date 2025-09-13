const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const decoded = Buffer.from(process.env.FIREBASE_ADMIN_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ot8ggjo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify Firebase Token

const verifyFirebaseToken = async (req, res, next) => {
  const authHead = req.headers?.authorization;
  if (!authHead || !authHead.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHead.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const userInfo = await admin.auth().verifyIdToken(token);
  req.token = userInfo;
  next();
};

const verifyTokenEmail = (req, res, next) => {
  if (req.query.email !== req.token.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

async function run() {
  try {
    await client.connect();
    const postVolunteerCollections = client
      .db("Volunteer-Management")
      .collection("all-volunteerPost");

    const volunteerRequestCollections = client
      .db("Volunteer-Management")
      .collection("volunteer-request");

    app.get("/", (req, res) => {
      res.send("Welcome to Volunteer Management Server Root Page");
    });

    app.get("/allVolunteerPosts", async (req, res) => {
      const result = await postVolunteerCollections.find().toArray();
      res.send(result);
    });

    app.get("/allVolunteerPosts/detailsPost/:id", async (req, res) => {
      const id = req.params.id;
      const quarry = { _id: new ObjectId(id) };
      const result = await postVolunteerCollections.findOne(quarry);
      res.send(result);
    });

    app.get("/request/:id", async (req, res) => {
      const id = req.params.id;
      const quarry = { postId: id };
      const result = await volunteerRequestCollections.find(quarry).toArray();
      res.send(result);
    });

    app.patch(
      "/allVolunteerPosts/detailsPost/:id",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        try {
          const id = req.params.id;
          const quarry = { _id: new ObjectId(id) };

          const post = await postVolunteerCollections.findOne(quarry);

          if (!post) {
            return res.status(404).send({ message: "Post not found!" });
          }

          if (post.volunteersNeeded <= 0) {
            return res.send({ message: "No more volunteers needed!" });
          }

          const result = await postVolunteerCollections.findOneAndUpdate(
            quarry,
            {
              $inc: {
                request_count: 1,
                volunteersNeeded: -1,
              },
            },
            { returnDocument: "after" }
          );

          res.send(result.value);
        } catch (error) {
          console.error(error);
          res.status(500).send({ message: "Internal Server Error" });
        }
      }
    );

    app.patch("/myCreatedPosts/:id", async (req, res) => {
      const id = req.params.id;
      const quarry = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: req.body.status,
        },
      };
      const result = await volunteerRequestCollections.updateOne(
        quarry,
        updateDoc
      );
      res.send(result);
    });

    app.patch("/updateRequestCount/:id", async (req, res) => {
      const id = req.params.id;
      const quarry = { _id: new ObjectId(id) };
      console.log(id);
      const updateDocs = {
        $inc: {
          request_count: -1,
          volunteersNeeded: 1,
        },
      };

      const result = await postVolunteerCollections.updateOne(
        quarry,
        updateDocs
      );
      res.send(result);
    });

    app.post("/addVolunteerPost", async (req, res) => {
      const newNeedVolunteer = req.body;
      const result = await postVolunteerCollections.insertOne(newNeedVolunteer);
      res.send(result);
    });

    app.post("/volunteerRequest", async (req, res) => {
      const reqData = req.body;
      const result = await volunteerRequestCollections.insertOne(reqData);
      res.send(result);
    });

    app.get("/allRequestVolunteer", async (req, res) => {
      const result = await volunteerRequestCollections.find().toArray();
      res.send(result);
    });

    app.get(
      "/manageMyPost/myCreatedPosts",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const email = req.query.email;
        const quarry = { post_owner: email };

        const result = await postVolunteerCollections.find(quarry).toArray();
        res.send(result);
      }
    );

    app.get(
      "/myRequestedPosts",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const email = req.query.email;
        const quarry = { email: email };

        const result = await volunteerRequestCollections.find(quarry).toArray();
        for (const request of result) {
          const id = request.postId;
          const postQuery = { _id: new ObjectId(id) };
          const post = await postVolunteerCollections.findOne(postQuery);
          request.title = post?.title;
          request.location = post?.location;
          request.applicationDeadline = post?.applicationDeadline;
          request.thumbnail = post?.thumbnail;
        }

        res.send(result);
      }
    );

    app.get("/needsNow-post", async (req, res) => {
      const posts = await postVolunteerCollections
        .find({})
        .sort({ applicationDeadline: 1 })
        .limit(6)
        .toArray();
      res.send(posts);
    });

    app.put("/allVolunteerPosts/detailsPost/:id", verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const quarry = { _id: new ObjectId(id) };

      const result = await postVolunteerCollections.updateOne(quarry, {
        $set: updateData,
      });

      res.send(result);
    });

    app.delete("/manageMyPost/:id", async (req, res) => {
      const { id } = req.params;
      const quarry = { _id: new ObjectId(id) };
      const result = await postVolunteerCollections.deleteOne(quarry);
      res.send(result);
    });

    app.delete("/deleteRequest/:id", async (req, res) => {
      const id = req.params.id;
      const quarry = { _id: new ObjectId(id) };

      const result = await volunteerRequestCollections.deleteOne(quarry);
      res.send(result);
    });

    app.get("/search", async (req, res) => {
      const { q } = req.query;

      try {
        const results = await postVolunteerCollections
          .find({
            $or: [{ title: { $regex: q, $options: "i" } }],
          })
          .toArray();

        res.json(results);
      } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close()
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Volunteer Management app listening on port ${port}`);
});
