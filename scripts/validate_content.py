#!/usr/bin/env python3
"""檢查知識庫目錄、檔名與資料結構；僅使用 Python 標準函式庫。"""
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "catalog.json"


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def safe_url(value):
    if not isinstance(value, str):
        return False
    parts = urlparse(value)
    return parts.scheme in {"http", "https"} and bool(parts.netloc)


def nonblank(value):
    return isinstance(value, str) and bool(value.strip())


def main():
    errors = []
    try:
        manifest = json.loads(CATALOG.read_text(encoding="utf-8"))
    except (OSError, ValueError) as ex:
        print(f"錯誤：無法讀取目錄：{ex}")
        return 1
    files, categories = manifest.get("files"), manifest.get("categories")
    if not isinstance(files, list) or not isinstance(categories, list):
        print("錯誤：目錄 files/categories 必須是清單")
        return 1
    category_ids = [item.get("id") for item in categories if isinstance(item, dict)]
    require(len(category_ids) == len(set(category_ids)), "分類有重複 ID", errors)
    require(all(nonblank(x) for x in category_ids), "分類名稱不可空白", errors)
    require(len(files) == len(set(files)), "目錄重複登記相同路徑", errors)
    known_ids = set()
    for relpath in files:
        if not isinstance(relpath, str) or not re.fullmatch(r"content/[^/\\]+\.json", relpath):
            errors.append(f"檔案路徑格式錯誤：{relpath}")
            continue
        path = (ROOT / relpath).resolve()
        if ROOT / 'content' not in path.parents:
            errors.append(f"不允許跳出內容資料夾：{relpath}")
            continue
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as ex:
            errors.append(f"{relpath} 無法讀取：{ex}")
            continue
        if not isinstance(item, dict):
            errors.append(f"{relpath} 必須是 JSON 物件")
            continue
        context = f"{relpath}："
        item_id = item.get("id")
        require(isinstance(item_id, str) and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item_id), context + "id 須使用英文小寫與連字號", errors)
        require(item_id not in known_ids, context + "id 重複", errors)
        known_ids.add(item_id)
        title = item.get("title")
        require(nonblank(title), context + "缺少 title", errors)
        if nonblank(title):
            require(path.name == title + ".json", context + "檔名須與 title 完全相同", errors)
        require(nonblank(item.get("summary")), context + "摘要不可為空", errors)
        require(item.get("category") in category_ids, context + "分類不在目錄中", errors)
        tags = item.get("tags")
        require(isinstance(tags, list) and len(tags) > 0 and all(nonblank(x) for x in tags), context + "至少一個有效標籤", errors)
        if isinstance(tags, list):
            require(len(tags) == len(set(str(x) for x in tags)), context + "標籤不可重複", errors)
        try:
            date.fromisoformat(item.get("updated", ""))
        except (ValueError, TypeError):
            errors.append(context + "updated 必須是有效 YYYY-MM-DD 日期")
        kind = item.get("kind")
        if kind == "link":
            require(safe_url(item.get("url")), context + "外部資源必須有 http(s) URL", errors)
        elif kind == "article":
            sections = item.get("sections")
            require(isinstance(sections, list) and len(sections) > 0, context + "文章至少要有一個段落", errors)
            if isinstance(sections, list):
                for section in sections:
                    if not isinstance(section, dict):
                        errors.append(context + "段落格式錯誤")
                        continue
                    require(nonblank(section.get("heading")), context + "段落標題不可空", errors)
                    paragraphs = section.get("paragraphs", [])
                    bullets = section.get("bullets", [])
                    valid_p = isinstance(paragraphs, list) and any(nonblank(x) for x in paragraphs)
                    valid_b = isinstance(bullets, list) and any(nonblank(x) for x in bullets)
                    require(valid_p or valid_b, context + "每段至少須有文字或清單", errors)
                    require(isinstance(paragraphs, list) and all(nonblank(x) for x in paragraphs), context + "paragraphs 型別/內容不正確", errors)
                    require(isinstance(bullets, list) and all(nonblank(x) for x in bullets), context + "bullets 型別/內容不正確", errors)
            if "source_url" in item:
                require(safe_url(item["source_url"]), context + "source_url 格式不正確", errors)
        else:
            errors.append(context + "kind 僅可為 article 或 link")
    actual = {p.relative_to(ROOT).as_posix() for p in (ROOT / "content").glob("*.json")}
    missing = sorted(actual - set(x for x in files if isinstance(x, str)))
    require(not missing, f"以下內容檔未登記到目錄：{', '.join(missing)}", errors)
    if errors:
        print("內容檢查失敗：")
        for e in errors:
            print("  ✗", e)
        return 1
    print(f"✓ 檢查通過：{len(files)} 篇內容、{len(category_ids)} 個分類；檔名、索引、必填欄位與連結格式均有效。")
    print("注意：本工具檢查的是 URL 格式，無法保證外部網站目前可連線。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
