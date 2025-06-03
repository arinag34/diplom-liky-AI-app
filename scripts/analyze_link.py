import sys
import json
import re
import threading
from functools import lru_cache
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer, util
from keybert import KeyBERT
from transformers import pipeline
import logging
from playwright.sync_api import sync_playwright
import torch

embedder = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
kw_model  = KeyBERT(model=embedder)
summarizer = pipeline("summarization", model="t5-base", tokenizer="t5-base")

_folder_names_cache = None
_folder_embs_cache = None
_cache_lock = threading.Lock()

def get_folder_embeddings(folders):
    global _folder_names_cache, _folder_embs_cache
    names = tuple(f['name'] for f in folders)
    with _cache_lock:
        if names == _folder_names_cache:
            return _folder_embs_cache
        with torch.no_grad():
            embs = embedder.encode(names, convert_to_tensor=True)
        _folder_names_cache = names
        _folder_embs_cache = embs
    return embs

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

def extract_text_from_url(url):
    start_browser()
    _page.set_default_timeout(30000)
    _page.goto(url, wait_until="domcontentloaded")
    html = _page.content()

    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(["script", "style", "noscript", "iframe"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    text = soup.get_text(separator=' ')
    text = re.sub(r'\s+', ' ', text).strip()

    return title, (title + " " + text).strip()

def compute_similarities(text, folders):
    if not folders:
        return []

    emb_folders = get_folder_embeddings(folders)

    emb_text = embedder.encode(text, convert_to_tensor=True)

    sims = util.cos_sim(emb_text, emb_folders)[0].cpu().tolist()
    sims = [min(s + 0.15, 1.0) for s in sims]
    paired = list(zip(folders, sims))
    paired.sort(key=lambda x: x[1], reverse=True)
    return paired

def generate_new_names(text, existing_names, n=3, max_attempts=5):
    import re
    suggestions = []
    attempt = 0

    while not suggestions and attempt < max_attempts:
        attempt += 1

        kws = kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 1),
            stop_words='english',
            top_n=10
        )
        for kw, score in kws:
            w = re.sub(r'[^A-Za-z]', '', kw).capitalize()
            if w.isalpha() and w not in existing_names:
                suggestions.append(w)
            if len(suggestions) >= n:
                break

        if not suggestions:
            snippet = text[:512]
            try:
                summ = summarizer(snippet, max_length=10, min_length=3, do_sample=False)
                if isinstance(summ, list) and summ:
                    first = re.sub(r'\W+', '', summ[0]['summary_text'].split()[0]).capitalize()
                    if first.isalpha() and first not in existing_names:
                        suggestions.append(first)
            except Exception as e:
                print(f"Summarizer error: {e}")

    # удаляем Topic*
    return list(dict.fromkeys(suggestions))[:n]

if __name__ == "__main__":
    logging.basicConfig(stream=sys.stderr, level=logging.DEBUG, format='%(message)s')
    logging.debug("Script started")
    logging.debug(f"Args: {sys.argv}")

    if len(sys.argv) < 2:
        print(json.dumps({"error": "no input"}))
        sys.exit(1)

    params = json.loads(sys.argv[1])
    url = params.get("link", "")
    folders = params.get("folders", [])
    auto_th = params.get("auto_threshold", 0) / 100.0
    suggest_th = params.get("suggest_threshold", 0) / 100.0

    try:
        title, text = extract_text_from_url(url)
    except Exception as e:
        print(json.dumps({"error": f"fetch error: {e}"}))
        sys.exit(1)

    sims = compute_similarities(text, folders)
    best_folder, best_score = (sims[0][0], sims[0][1]) if sims else (None, 0.0)
    second_score = sims[1][1] if len(sims) > 1 else 0.0

    if best_score >= auto_th and (best_score - second_score) > 0.1:
        out = {"action": "auto_add", "folder": best_folder, "similarity": round(best_score*100,2)}
    elif best_score < suggest_th:
        existing_names = [f['name'] for f in folders]
        names = generate_new_names(text, existing_names, n=3)
        out = {"action": "suggest_new_folder", "suggestions": names, "similarity": round(best_score*100,2)}
    else:
        options = [f for f,_ in sims[:2]]
        out = {"action": "choose_existing_folder", "options": options, "similarity": round(best_score*100,2)}

    print(json.dumps(out))
    sys.stdout.flush()
    logging.debug("Script finished")

    close_browser()
