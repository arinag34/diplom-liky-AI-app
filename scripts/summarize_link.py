import sys
import json
import re
from bs4 import BeautifulSoup
from transformers import PegasusTokenizer, PegasusForConditionalGeneration
import torch
from playwright.sync_api import sync_playwright
import logging

MODEL_NAME = "google/pegasus-xsum"
tokenizer = PegasusTokenizer.from_pretrained(MODEL_NAME)
model = PegasusForConditionalGeneration.from_pretrained(MODEL_NAME)
model.eval()  

_browser = None
_context = None
_page = None
_playwright = None

def start_browser():
    global _browser, _context, _page, _playwright
    if _browser is None:
        _playwright = sync_playwright().start()
        _browser = _playwright.chromium.launch(headless=True)
        _context = _browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36")
        _page = _context.new_page()
        def route_intercept(route):
            if route.request.resource_type in ["image", "stylesheet", "font", "media"]:
                route.abort()
            else:
                route.continue_()
        _page.route("**/*", route_intercept)

def close_browser():
    global _browser, _context, _page, _playwright
    if _page:
        _page.close(); _page = None
    if _context:
        _context.close(); _context = None
    if _browser:
        _browser.close(); _browser = None
    if _playwright:
        _playwright.stop(); _playwright = None

def extract_clean_text(url):
    start_browser()
    _page.set_default_timeout(30000)
    _page.goto(url, wait_until="domcontentloaded")
    html = _page.content()

    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'noscript', 'iframe']):
        tag.decompose()

    text = soup.get_text(separator='\n')
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    clean = ' '.join(lines)
    clean = re.sub(r'\s+', ' ', clean)
    return clean[:3000]

def summarize(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True,
                       padding="longest", max_length=512)
    with torch.no_grad():
        summary_ids = model.generate(
            **inputs,
            max_length=50,
            min_length=10,
            num_beams=4,
            length_penalty=1.0,
            early_stopping=True
        )
    return tokenizer.decode(summary_ids[0], skip_special_tokens=True)

if __name__ == "__main__":
    logging.basicConfig(stream=sys.stderr, level=logging.DEBUG, format='%(message)s')
    if len(sys.argv) < 2:
        print(json.dumps({"summary": "Error: URL not provided"}))
        sys.exit(1)

    url = sys.argv[1]
    try:
        text = extract_clean_text(url)
        summary = summarize(text)
        print(json.dumps({"summary": summary}))
    except Exception as e:
        print(json.dumps({"summary": f"Error computing: {e}"}))
        sys.exit(1)
    finally:
        close_browser()
