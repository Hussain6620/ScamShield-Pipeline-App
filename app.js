const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const client = require("prom-client");

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname, "public")));

const reports = [];

/*
  Metrics are added now because they will be used later
  in the Monitoring and Alerting stage of the Jenkins pipeline.
*/
const register = new client.Registry();

client.collectDefaultMetrics({
  register: register
});

const checksCounter = new client.Counter({
  name: "scamshield_checks_total",
  help: "Number of messages checked by ScamShield",
  registers: [register]
});

/*
  This function checks whether the message includes
  common scam warning signs.
*/
function analyseMessage(message) {
  const text = message.toLowerCase();

  const warningWords = [
    "urgent",
    "verify",
    "password",
    "bank",
    "click",
    "prize",
    "gift card",
    "otp"
  ];

  const foundWords = warningWords.filter((word) => text.includes(word));
  const hasLink = /https?:\/\/|www\./i.test(message);

  const score = foundWords.length + (hasLink ? 2 : 0);

  if (score >= 3) {
    return {
      risk: "High",
      reasons: foundWords,
      hasLink: hasLink
    };
  }

  if (score >= 1) {
    return {
      risk: "Medium",
      reasons: foundWords,
      hasLink: hasLink
    };
  }

  return {
    risk: "Low",
    reasons: [],
    hasLink: hasLink
  };
}

/*
  Health endpoint.
  Jenkins and the monitoring tool will later use this
  to check whether the application is running.
*/
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    application: "ScamShield"
  });
});

/*
  Metrics endpoint.
  A monitoring tool such as Prometheus can later read this.
*/
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

/*
  The user submits a suspicious message here.
*/
app.post("/api/check", (req, res) => {
  const message = String(req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({
      error: "Message is required."
    });
  }

  const result = analyseMessage(message);

  const report = {
    id: reports.length + 1,
    message: message,
    risk: result.risk,
    reasons: result.reasons,
    hasLink: result.hasLink
  };

  reports.push(report);
  checksCounter.inc();

  return res.status(201).json(report);
});

/*
  This endpoint displays submitted reports.
*/
app.get("/api/reports", (req, res) => {
  res.json(reports);
});

module.exports = {
  app,
  analyseMessage,
  reports
};