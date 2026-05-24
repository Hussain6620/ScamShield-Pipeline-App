const request = require("supertest");
const { app, analyseMessage } = require("../app");

describe("ScamShield application tests", () => {
  test("Health endpoint should show that the application is running", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("UP");
  });

  test("A suspicious message should be identified as high risk", () => {
    const result = analyseMessage(
      "URGENT: click https://fake.example and verify your bank password"
    );

    expect(result.risk).toBe("High");
  });

  test("A user should be able to submit a message for checking", async () => {
    const response = await request(app)
      .post("/api/check")
      .send({
        message: "You won a prize, click www.fake.example now"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.risk).toBe("High");
  });

  test("An empty message should be rejected", async () => {
    const response = await request(app)
      .post("/api/check")
      .send({
        message: ""
      });

    expect(response.statusCode).toBe(400);
  });
});