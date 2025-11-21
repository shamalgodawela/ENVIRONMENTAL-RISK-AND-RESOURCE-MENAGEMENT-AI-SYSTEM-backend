const express = require("express");
const client = require("./pg"); // 

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", async (req, res) => {
    try {
        const result = await client.query("SELECT NOW()");
        res.json({
            message: "Server is running!",
            dbTime: result.rows[0].now
        });
    } catch (err) {
        console.error(err.stack);
        res.status(500).send("Database query error");
    }
});

async function getdata() {

    const res= await client.query("select * from test; ")
    console.log(res);
    
}

getdata();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
