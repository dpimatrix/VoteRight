import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
});
const page = await browser.newPage();
page.on("console", (m) => console.log("[console]", m.type(), m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });

const state = async (label) => {
  const s = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? "(unset)",
    bodyBg: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.body).color,
    stored: (() => { try { return localStorage.getItem("vr-theme"); } catch { return "n/a"; } })(),
    btn: document.querySelector('button[aria-label="Toggle light/dark theme"]')?.textContent,
  }));
  console.log(label, JSON.stringify(s));
};

await state("before:");
await page.click('button[aria-label="Toggle light/dark theme"]');
await new Promise((r) => setTimeout(r, 300));
await state("after 1 click:");
await page.click('button[aria-label="Toggle light/dark theme"]');
await new Promise((r) => setTimeout(r, 300));
await state("after 2 clicks:");
// reload: does the saved choice survive?
await page.reload({ waitUntil: "networkidle0" });
await state("after reload:");
await browser.close();
