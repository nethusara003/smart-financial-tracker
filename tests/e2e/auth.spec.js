import { test, expect } from "@playwright/test";
import { buildUserSeed, registerUser, loginUser } from "./helpers";

test.describe("Authentication + Security + Edge cases", () => {
  test("registers and logs in, then lands on dashboard", async ({ page }) => {
    const user = buildUserSeed();

    // Step 1: Register a brand-new user through the real UI.
    await registerUser(page, user);

    // Step 2: Log in with the same user credentials.
    await loginUser(page, user);

    // Step 3: Verify dashboard shell is rendered.
    await expect(page.getByText("Recent Transactions")).toBeVisible();
  });

  test("redirects unauthenticated dashboard access to login", async ({ page }) => {
    // Step 1: Ensure there is no auth token in browser storage.
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("guest");
    });

    // Step 2: Try to open a protected route directly.
    await page.goto("/dashboard");

    // Step 3: Verify secure redirect back to login.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-submit-button")).toBeVisible();
  });

  test("shows validation behavior for empty and invalid forms", async ({ page }) => {
    // Step 1: Open registration form and verify empty form cannot submit.
    await page.goto("/register");
    await expect(page.getByTestId("register-submit-button")).toBeDisabled();

    // Step 2: Enter invalid values (password mismatch) and verify submit stays disabled.
    await page.getByTestId("register-name-input").fill("Edge Case User");
    await page.getByTestId("register-email-input").fill("edge.user@example.com");
    await page.getByTestId("register-password-input").fill("Passw0rd!");
    await page.getByTestId("register-confirm-password-input").fill("Different123!");
    await expect(page.getByTestId("register-submit-button")).toBeDisabled();
    await expect(page.getByText("Passwords don't match")).toBeVisible();

    // Step 3: Verify short password validation message.
    await page.getByTestId("register-password-input").fill("12345");
    await page.getByTestId("register-confirm-password-input").fill("12345");
    await page.getByTestId("register-submit-button").click();

    await expect(page.getByText("Password must be at least 8 characters long, and contain both letters and numbers")).toBeVisible();
  });
});
