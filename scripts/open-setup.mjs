// Shared by gameplay checks: enter setup through the real title menu.
export async function openSetup(page) {
  await page.locator(".title-screen").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("heading", { name: "Select mode" }).waitFor();
}
