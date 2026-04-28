require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);


app.get('/', (req, res) => {
  res.send('Indian Tax AI Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
