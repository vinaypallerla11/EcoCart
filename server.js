import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected Successfully!");
    app.listen(PORT, () => {
      console.log(`Server is running on port http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  mobile: Number,
  location: String,
  gender: String
});

const userModel = mongoose.model("users", userSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token not provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// CREATE API 
app.post("/getusers/", async (req, res) => {
  try {
    const { username, password, email, mobile, location, gender } = req.body;
    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({ username, password: hashedPassword, email, mobile, location, gender });
    const savedUser = await newUser.save();
    console.log("User added successfully");
    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET API READ ONLY
app.get("/getusers/", authenticateToken, async (req, res) => {
  try {
    const userData = await userModel.find();
    res.json(userData);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE API 
app.put("/getusers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, mobile, location, gender } = req.body;
    const updatedUser = await userModel.findByIdAndUpdate(id, { username, password, email, mobile, location, gender }, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("User updated successfully");
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE API 
app.delete("/getusers/:id", async (req, res) => {
  try {
    const deletedUser = await userModel.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("User deleted successfully");
    res.json("User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// REGISTER API
app.post('/registers/', async (req, res) => {
  try {
    const { username, password, email, mobile, location, gender } = req.body;
    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new userModel({ username, password: hashedPassword, email, mobile, location, gender });
    await newUser.save();
    res.send('User created successfully');
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send(error.message);
  }
});

// Login


app.post("/login/", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await userModel.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const isPasswordMatched = await bcrypt.compare(password, user.password);
      if (isPasswordMatched) {
        const payload = { username: user.username };
        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' }); // Token expires in 30 days
        res.json({ token: jwtToken });
      } else {
        return res.status(401).json({ error: "Invalid password" });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
});
  