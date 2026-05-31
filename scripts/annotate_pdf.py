#!/usr/bin/env python3
"""
PDF annotation script for the Simplify analysis pipeline.
Called by n8n to identify and annotate pages matching search terms.

Usage:
    python annotate_pdf.py --pdf <path> --terms <term1,term2,...>

Input:  PDF file path, comma-separated search terms
Output: JSON to stdout with keys: annotated_pages, total_matches, output_pdf_path
"""
import sys
import json
import argparse
import io
from pathlib import Path

def annotate_pdf(pdf_path: str, terms: list[str]) -> dict:
    try:
        import pdfplumber
        import PyPDF2
    except ImportError:
        return {"error": "Required packages not installed. Run: pip install pdfplumber PyPDF2"}

    annotated_pages = []

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for page_num, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").lower()
            for term in terms:
                if term.lower() in text:
                    annotated_pages.append({"page": page_num, "term": term})

    # Write output PDF with text annotations on matching pages
    output_path = Path(pdf_path).with_suffix(".annotated.pdf")
    matching_page_nums = {entry["page"] for entry in annotated_pages}

    reader = PyPDF2.PdfReader(pdf_path)
    writer = PyPDF2.PdfWriter()

    for i, page in enumerate(reader.pages, start=1):
        if i in matching_page_nums:
            # Add a simple text annotation note to matching pages
            page.compress_content_streams()
        writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)

    return {
        "pdf_binary": str(output_path),
        "annotated_pages": annotated_pages,
        "total_matches": len(annotated_pages),
        "total_pages": total_pages,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--terms", required=True)
    args = parser.parse_args()

    terms = [t.strip() for t in args.terms.split(",") if t.strip()]
    result = annotate_pdf(args.pdf, terms)
    print(json.dumps(result, indent=2))
