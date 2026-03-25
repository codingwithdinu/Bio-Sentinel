import json
from pathlib import Path

import kagglehub
import pandas as pd


def pick_value(row, keys):
    for key in keys:
        if key in row and pd.notna(row[key]):
            value = str(row[key]).strip()
            if value:
                return value
    return None


def main():
    # Download latest version
    path = kagglehub.dataset_download("jvanark/endangered-species")
    print("Path to dataset files:", path)

    root = Path(path)
    csv_files = list(root.rglob("*.csv"))

    if not csv_files:
        raise FileNotFoundError("No CSV files found in downloaded dataset")

    # Use the largest CSV by size as primary table
    csv_files.sort(key=lambda p: p.stat().st_size, reverse=True)
    source_csv = csv_files[0]
    print("Using source CSV:", source_csv)

    df = pd.read_csv(source_csv)

    rows = []
    for _, r in df.iterrows():
        item = {
            "scientificName": pick_value(r, ["scientific_name", "Scientific Name", "species", "species_name", "binomial_name"]),
            "localName": pick_value(r, ["common_name", "Common Name", "local_name", "vernacular_name"]),
            "imageUrl": pick_value(r, ["image_url", "image", "Image URL", "photo_url"]),
            "about": pick_value(r, ["about", "description", "summary", "Details", "habitat"])
        }

        if item["scientificName"]:
            rows.append(item)

    # De-duplicate by normalized scientific name
    dedup = {}
    for item in rows:
        key = " ".join("".join(ch if ch.isalpha() or ch.isspace() else " " for ch in item["scientificName"].lower()).split())
        if key and key not in dedup:
            dedup[key] = item

    output = list(dedup.values())

    target = Path(__file__).resolve().parents[1] / "data" / "endangered_species_enrichment.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, indent=2, ensure_ascii=True), encoding="utf-8")

    print(f"Wrote {len(output)} records to {target}")


if __name__ == "__main__":
    main()
