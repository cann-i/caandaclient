from playwright.sync_api import sync_playwright
import time

def verify_ca_portal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        try:
            # 1. Login Page
            print("Navigating to Login Page...")
            page.goto("http://localhost:3000/login", timeout=60000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            page.screenshot(path="verification/1_login_page.png")
            print("Login page screenshot taken.")

            # Perform Login (CA)
            print("Attempting login...")
            page.fill("input[type='email']", "admin@example.com")
            page.fill("input[type='password']", "password")
            page.click("button[type='submit']")

            # 2. Dashboard
            print("Waiting for Dashboard...")
            # Wait for URL or a specific element on dashboard
            page.wait_for_url("**/dashboard", timeout=60000)
            page.wait_for_load_state("networkidle")
            time.sleep(3)
            page.screenshot(path="verification/2_ca_dashboard.png")
            print("Dashboard screenshot taken.")

            # 3. Invoices
            print("Navigating to Invoices...")
            page.goto("http://localhost:3000/invoices")
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            page.screenshot(path="verification/3_ca_invoices.png")
            print("Invoices screenshot taken.")

            # Open Create Modal
            # Find button with text "Create Invoice"
            try:
                page.click("text=Create Invoice", timeout=5000)
                time.sleep(1)
                page.screenshot(path="verification/4_ca_invoice_modal.png")
                print("Invoice modal screenshot taken.")
            except Exception as e:
                print(f"Could not open modal: {e}")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ca_portal()
