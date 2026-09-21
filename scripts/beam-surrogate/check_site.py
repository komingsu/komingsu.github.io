"""Check the generated article, local links and discovery in an Astro build."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.text = set(), [], []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            assert attrs["id"] not in self.ids, f"Duplicate ID: {attrs['id']}"
            self.ids.add(attrs["id"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])
        assert "katex-error" not in attrs.get("class", "").split(), "KaTeX parse error"

    def handle_data(self, data):
        self.text.append(data)


def main(dist):
    pages = {p: Page(p) for p in dist.rglob("*.html")}
    checked = 0
    for path, page in pages.items():
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = ((dist / unquote(url.path).lstrip("/")) if url.path.startswith("/")
                      else (path.parent / unquote(url.path))) if url.path else path
            if target.is_dir():
                target /= "index.html"
            assert target.is_file(), f"{path}: missing {link}"
            if url.fragment and target.suffix == ".html":
                parsed = pages.get(target) or Page(target)
                assert url.fragment in parsed.ids or unquote(url.fragment) in parsed.ids, f"{path}: missing fragment {link}"
            checked += 1
    article_path = dist / "posts/beam-surrogate-design-space/index.html"
    text = "".join(pages[article_path].text)
    assert "{beam." not in text and "{format(" not in text and "{%" not in text
    assert "alpha=0.000001" in text and "gamma=0.1" in text
    for number in ("0.129%", "75.0%", "0.446429", "0.111607", "19/20"):
        assert number in text, f"Unrendered or inconsistent article metric: {number}"
    for source in ("mit-beam", "sklearn-krr", "sklearn-leakage", "scipy-spearman"):
        assert f"ref-{source}" in pages[article_path].ids
    for path in ("index.html", "posts/index.html", "categories/sciml/index.html", "rss.xml", "sitemap-0.xml"):
        assert "/posts/beam-surrogate-design-space/" in (dist/path).read_text(), path
    print(f"PASS: {len(pages)} HTML files, {checked} local resources/links, anchors, KaTeX,")
    print("      MDX metrics, four references, home/post/category listings, RSS and sitemap")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, default=Path("dist"))
    main(parser.parse_args().dist.resolve())
