import { describe, it, expect } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

import transferRoutes from "../../routes/transferRoutes.js";
import User from "../../models/User.js";
import Wallet from "../../models/Wallet.js";
import TransferLimit from "../../models/TransferLimit.js";
import Transfer from "../../models/Transfer.js";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/transfers", transferRoutes);
  return app;
};

const createUser = async (overrides = {}) => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return User.create({
    name: "Test User",
    email: `user-${unique}@example.com`,
    password: "hashed-password",
    ...overrides,
  });
};

const authHeaderForUser = (user) => {
  const token = jwt.sign(
    { id: user._id.toString(), role: user.role || "user" },
    process.env.JWT_SECRET
  );
  return { Authorization: `Bearer ${token}` };
};

describe("transferRoutes integration", () => {
  it("returns 401 when no bearer token is provided", async () => {
    const app = createTestApp();

    const response = await request(app).get("/api/transfers/my-limits");

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: "No token provided",
      })
    );
  });

  it("returns 400 for incomplete feasibility payload", async () => {
    const app = createTestApp();
    const sender = await createUser();

    const response = await request(app)
      .post("/api/transfers/check-feasibility")
      .set(authHeaderForUser(sender))
      .send({ amount: 250 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Receiver ID and amount are required" });
  });

  it("validates a receiver by email", async () => {
    const app = createTestApp();
    const sender = await createUser({ name: "Sender User" });
    const receiver = await createUser({ name: "Receiver User" });

    const response = await request(app)
      .post("/api/transfers/validate-receiver")
      .set(authHeaderForUser(sender))
      .send({ receiverIdentifier: receiver.email });

    expect(response.status).toBe(200);
    expect(response.body.isValid).toBe(true);
    expect(response.body.canReceiveTransfers).toBe(true);
    expect(response.body.receiver.userId).toBe(receiver._id.toString());
    expect(response.body.receiver.email).toContain("@");
  });

  it("returns feasible=true when sender has balance and receiver exists", async () => {
    const app = createTestApp();
    const sender = await createUser({ name: "Sender" });
    const receiver = await createUser({ name: "Receiver" });

    await Wallet.create({
      user: sender._id,
      balance: 1500,
      availableBalance: 1500,
      currency: "USD",
      status: "active",
    });

    const response = await request(app)
      .post("/api/transfers/check-feasibility")
      .set(authHeaderForUser(sender))
      .send({ receiverId: receiver._id.toString(), amount: 300 });

    expect(response.status).toBe(200);
    expect(response.body.canTransfer).toBe(true);
    expect(response.body.reasons).toEqual([]);
  });

  it("creates default transfer limits when requesting my limits", async () => {
    const app = createTestApp();
    const user = await createUser();

    const response = await request(app)
      .get("/api/transfers/my-limits")
      .set(authHeaderForUser(user));

    const limitsInDb = await TransferLimit.findOne({ user: user._id });

    expect(response.status).toBe(200);
    expect(response.body.limits.singleTransfer).toBeGreaterThan(0);
    expect(response.body.currentUsage.today).toBe(0);
    expect(limitsInDb).not.toBeNull();
  });

  it("returns 403 when a non-participant requests transfer details", async () => {
    const app = createTestApp();
    const sender = await createUser({ name: "Sender" });
    const receiver = await createUser({ name: "Receiver" });
    const outsider = await createUser({ name: "Outsider" });

    const transfer = await Transfer.create({
      sender: {
        userId: sender._id,
        userName: sender.name,
        userEmail: sender.email,
      },
      receiver: {
        userId: receiver._id,
        userName: receiver.name,
        userEmail: receiver.email,
      },
      amount: 100,
      netAmount: 100,
      currency: "USD",
      status: "completed",
      description: "Test transfer",
      processedAt: new Date(),
      reversalDeadline: new Date(Date.now() + 60 * 60 * 1000),
    });

    const response = await request(app)
      .get(`/api/transfers/${transfer._id}`)
      .set(authHeaderForUser(outsider));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Unauthorized to view this transfer" });
  });

  it("returns 403 when a non-sender attempts to cancel transfer", async () => {
    const app = createTestApp();
    const sender = await createUser({ name: "Sender" });
    const receiver = await createUser({ name: "Receiver" });
    const outsider = await createUser({ name: "Outsider" });

    const transfer = await Transfer.create({
      sender: {
        userId: sender._id,
        userName: sender.name,
        userEmail: sender.email,
      },
      receiver: {
        userId: receiver._id,
        userName: receiver.name,
        userEmail: receiver.email,
      },
      amount: 150,
      netAmount: 150,
      currency: "USD",
      status: "initiated",
      description: "Role constraint test",
      reversalDeadline: new Date(Date.now() + 60 * 60 * 1000),
    });

    const cancelResponse = await request(app)
      .post(`/api/transfers/${transfer._id}/cancel`)
      .set(authHeaderForUser(outsider))
      .send({ reason: "Not mine" });

    expect(cancelResponse.status).toBe(403);
    expect(cancelResponse.body).toEqual({ message: "Only sender can cancel transfer" });
  });

  it("validates a receiver by account number", async () => {
    const app = createTestApp();
    const sender = await createUser({ name: "Sender User" });
    const receiver = await createUser({ name: "Receiver User", accountNumber: "SFT-889977" });

    const response = await request(app)
      .post("/api/transfers/validate-receiver")
      .set(authHeaderForUser(sender))
      .send({ receiverIdentifier: "SFT-889977" });

    expect(response.status).toBe(200);
    expect(response.body.isValid).toBe(true);
    expect(response.body.receiver.userId).toBe(receiver._id.toString());
    expect(response.body.receiver.accountNumber).toBe("SFT-889977");
  });

  it("searches users by account number", async () => {
    const app = createTestApp();
    const sender = await createUser({ name: "Sender User" });
    const receiver = await createUser({ name: "Receiver User", accountNumber: "SFT-991122" });

    const response = await request(app)
      .get("/api/transfers/search-users?query=SFT-9911")
      .set(authHeaderForUser(sender));

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
    expect(response.body.users[0].userId).toBe(receiver._id.toString());
    expect(response.body.users[0].accountNumber).toBe("SFT-991122");
  });
});
