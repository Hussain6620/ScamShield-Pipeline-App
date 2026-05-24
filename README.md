# ScamShield Pipeline App

## Project Description

ScamShield is a small Node.js web application that checks suspicious messages for common scam warning signs. A user can enter a message, and the application displays a Low, Medium or High risk result.

This project was created for the SIT223 High Distinction DevOps Pipeline with Jenkins task.

## Main Features

- Checks suspicious messages for scam warning words.
- Detects whether the message contains a website link.
- Displays a Low, Medium or High risk result.
- Provides a `/health` endpoint for deployment checks.
- Provides a `/metrics` endpoint for monitoring.
- Includes automated tests using Jest and Supertest.

## Technologies Used

- Node.js
- Express
- HTML and CSS
- Jest
- Supertest
- Prometheus client metrics
- Jenkins, Docker, SonarQube and security scanning will be added during the pipeline implementation.

## How to Run the Application

Install dependencies:

```bash
npm install