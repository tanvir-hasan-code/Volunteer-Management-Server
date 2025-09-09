const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// UserName:
// Password:

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ot8ggjo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const postVolunteerCollections = client
      .db("Volunteer-Management")
      .collection("all-volunteerPost");

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

	  app.post("/addVolunteerPost", async (req, res) => {
		  const newNeedVolunteer = req.body;
		  const result = await postVolunteerCollections.insertOne(newNeedVolunteer);
		  res.send(result);
    })
    
    app.get("/manageMyPost/myCreatedPosts", async (req, res) => {
      const email = req.query.email;
      const quarry = { post_owner: email }
      
      const result = await postVolunteerCollections.find(quarry).toArray();
      res.send(result)

    })

    app.put("/allVolunteerPosts/detailsPost/:id", async (req, res) => {
      const id  = req.params.id;
      const updateData = req.body;
      const quarry = { _id: new ObjectId(id) }
      
      const result = await postVolunteerCollections.updateOne(quarry, {
        $set: updateData
      })

      res.send(result);

    })

    app.delete("/manageMyPost/:id", async (req, res) => {
      const {id}  = req.params;
      console.log(id)
      const quarry = { _id: new ObjectId(id) };
      const result = await postVolunteerCollections.deleteOne(quarry);
     res.send(result)
    })
	  
	  
    app.get("/search", async (req, res) => {
      const { q } = req.query;

      try {
        const results = await postVolunteerCollections
          .find({
            $or: [
              { title: { $regex: q, $options: "i" } },
            ],
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
