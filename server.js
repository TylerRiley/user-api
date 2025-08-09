require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const jwt = require('jsonwebtoken');

const userService = require('./user-service.js');

const app = express();

// --------- CORS: bullet-proof preflight ----------
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // or your frontend origin
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Short-circuit preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
// -------------------------------------------------

// (optional) keep cors() as well
app.use(cors());
app.use(express.json());

// ----- Passport JWT strategy -----
const { ExtractJwt, Strategy: JwtStrategy } = passportJWT;
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    if (jwt_payload) return done(null, { _id: jwt_payload._id, userName: jwt_payload.userName });
    return done(null, false);
  })
);
app.use(passport.initialize());
const auth = passport.authenticate('jwt', { session: false });

// ----- Routes (unchanged) -----
app.post('/api/user/register', async (req, res) => {
  try {
    const msg = await userService.registerUser(req.body);
    res.json({ message: msg || 'success' });
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.post('/api/user/login', async (req, res) => {
  try {
    const user = await userService.checkUser(req.body);
    const payload = { _id: user._id, userName: user.userName };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.json({ message: 'success', token });
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.get('/api/user/favourites', auth, async (req, res) => {
  try {
    const data = await userService.getFavourites(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.put('/api/user/favourites/:id', auth, async (req, res) => {
  try {
    const data = await userService.addFavourite(req.user._id, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.delete('/api/user/favourites/:id', auth, async (req, res) => {
  try {
    const data = await userService.removeFavourite(req.user._id, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.get('/api/user/history', auth, async (req, res) => {
  try {
    const data = await userService.getHistory(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.put('/api/user/history/:id', auth, async (req, res) => {
  try {
    const data = await userService.addHistory(req.user._id, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

app.delete('/api/user/history/:id', auth, async (req, res) => {
  try {
    const data = await userService.removeHistory(req.user._id, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(422).json({ message: err.toString() });
  }
});

// ----- Start after DB connects -----
const HTTP_PORT = process.env.PORT || 8080;
userService.connect().then(() => {
  app.listen(HTTP_PORT, () => {
    console.log(`User API listening on: http://localhost:${HTTP_PORT}`);
  });
}).catch((err) => {
  console.error('unable to start the server:', err);
  process.exit(1);
});
