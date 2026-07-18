from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto('http://localhost:3000/demo', wait_until='networkidle')
        page.screenshot(path='/home/guru/maghgo/ad/screenshot_storefront.jpg')
        
        page.goto('http://localhost:3000/goatech-admin-hq/plans', wait_until='networkidle')
        page.screenshot(path='/home/guru/maghgo/ad/screenshot_admin_plans.jpg')
        
        page.goto('http://localhost:3000/goatech-admin-hq/offers', wait_until='networkidle')
        page.screenshot(path='/home/guru/maghgo/ad/screenshot_admin_offers.jpg')
    except Exception as e:
        print("Error:", e)
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
