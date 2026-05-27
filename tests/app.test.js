const request = require("supertest");
const { app, analyseMessage } = require("../app");

describe("ScamShield application tests", () => {
  test("Health endpoint should show that the application is running", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("UP");
    expect(response.body.application).toBe("ScamShield");
  });

  test("A suspicious message with warning words and a link should be high risk", () => {
    const result = analyseMessage(
      "URGENT: click https://fake.example and verify your bank password"
    );

    expect(result.risk).toBe("High");
    expect(result.hasLink).toBe(true);
  });

  test("A simple warning message should be medium risk", () => {
    const result = analyseMessage("Please verify your details");

    expect(result.risk).toBe("Medium");
  });

  test("A normal message should be low risk", () => {
    const result = analyseMessage("See you at class tomorrow");

    expect(result.risk).toBe("Low");
  });

  test("A user should be able to submit a message for checking", async () => {
    const response = await request(app)
      .post("/api/check")
      .send({
        message: "You won a prize, click https://fake.example now"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.risk).toBe("High");
    expect(response.body.hasLink).toBe(true);
  });

  test("An empty message should be rejected", async () => {
    const response = await request(app)
      .post("/api/check")
      .send({
        message: ""
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("Message is required.");
  });

  test("Reports endpoint should return submitted reports", async () => {
    await request(app)
      .post("/api/check")
      .send({
        message: "Urgent click https://fake.example"
      });

    const response = await request(app).get("/api/reports");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("Metrics endpoint should provide ScamShield monitoring data", async () => {
    const response = await request(app).get("/metrics");

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain("scamshield_checks_total");
  });
});