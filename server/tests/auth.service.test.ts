import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as authService from "../src/modules/auth/auth.service";
import { UserModel } from "../src/modules/auth/user.model";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("auth.service", () => {
  it("creates a new user on signup and returns tokens", async () => {
    const tokens = await authService.signup("test@example.com", "password123");
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const user = await UserModel.findOne({ email: "test@example.com" });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe("password123");
  });

  it("rejects signup with a duplicate email", async () => {
    await authService.signup("dupe@example.com", "password123");
    await expect(authService.signup("dupe@example.com", "password456")).rejects.toThrow(
      "An account with this email already exists"
    );
  });

  it("logs in successfully with correct credentials", async () => {
    await authService.signup("login@example.com", "password123");
    const tokens = await authService.login("login@example.com", "password123");
    expect(tokens.accessToken).toBeDefined();
  });

  it("rejects login with incorrect password", async () => {
    await authService.signup("wrongpass@example.com", "password123");
    await expect(authService.login("wrongpass@example.com", "wrongpassword")).rejects.toThrow(
      "Invalid email or password"
    );
  });

  it("rotates refresh tokens correctly", async () => {
    const initial = await authService.signup("rotate@example.com", "password123");
    const rotated = await authService.refresh(initial.refreshToken);
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);

    // Old refresh token should now be rejected (rotation invalidates it).
    await expect(authService.refresh(initial.refreshToken)).rejects.toThrow();
  });
});
