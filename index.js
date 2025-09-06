const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

async function run() {
  try {
    app.get("/", (req, res) => {
      res.send("Welcome to Volunteer Management Server Root Page");
    });
  } finally {
    // await client.close()
  }
}

run().catch(console.dir)

app.listen(port, () => {
  console.log(`Volunteer Management app listening on port ${port}`);
});
