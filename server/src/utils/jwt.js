const jwt = require("jsonwebtoken");

const signAccessToken = (payload, env) =>
  jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });

const signRefreshToken = (payload, env) =>
  jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

module.exports = {
  signAccessToken,
  signRefreshToken,
};
