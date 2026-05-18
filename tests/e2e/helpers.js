import { expect } from "@playwright/test";

export function buildUserSeed() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return {
    name: `E2E User ${stamp}`,
    email: `e2e.${stamp}@example.com`,
    password: "Passw0rd!",
  };
}

export async function registerUser(page, user) {
  await page.goto("/register");

  await page.getByTestId("register-name-input").fill(user.name);
  await page.getByTestId("register-email-input").fill(user.email);
  await page.getByTestId("register-password-input").fill(user.password);
  await page.getByTestId("register-confirm-password-input").fill(user.password);

  await page.getByTestId("register-submit-button").click();

  // Wait for the redirect to login page (indicates success)
  await expect(page).toHaveURL(/\/login$/, { timeout: 30000 });
}

export async function loginUser(page, user) {
  // Clean state
  await page.evaluate(() => {
    localStorage.clear();
  }).catch(() => {});

  await page.goto("/login");

  await page.evaluate(() => {
    localStorage.setItem("sft-e2e", "true");
  }).catch(() => {});

  await page.getByTestId("login-email-input").fill(user.email);
  await page.getByTestId("login-password-input").fill(user.password);
  await page.getByTestId("login-submit-button").click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
}

export async function registerAndLogin(page) {
  const user = buildUserSeed();
  await registerUser(page, user);
  await loginUser(page, user);
  return user;
}
