import os
import re
import io
import subprocess
import pypdf

HTML_PATH = "Leftover_Radar_Project_Report.html"
FINAL_PDF_PATH = os.path.abspath("Leftover_Radar_Project_Report.pdf")
TEMP_RAW_PDF = os.path.abspath("raw_unwatermarked.pdf")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def build_perfect_toc_html():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    new_toc = """    <ul class="toc-list">
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>1  Project Title &amp; Executive Overview</strong></span></span>
            <span class="toc-num">6</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>2  Problem Statement</strong></span></span>
            <span class="toc-num">7</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>3  Objective of the Project</strong></span></span>
            <span class="toc-num">9</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>4  Dataset Description</strong></span></span>
            <span class="toc-num">11</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">4.1  Campus Cafeteria Operations Telemetry Dataset</span></span>
            <span class="toc-num">11</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">4.2  Database Entity Schema &amp; Constraints</span></span>
            <span class="toc-num">11</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">4.3  Descriptive Statistics &amp; Feature Variance</span></span>
            <span class="toc-num">12</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>5  Dataset Source &amp; Provenance</strong></span></span>
            <span class="toc-num">13</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">5.1  Institutional Data Provenance</span></span>
            <span class="toc-num">13</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">5.2  Repository &amp; Reproducibility Links</span></span>
            <span class="toc-num">13</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">5.3  Ethical Compliance &amp; Data Sanitation</span></span>
            <span class="toc-num">14</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>6  Tools &amp; Technologies Used</strong></span></span>
            <span class="toc-num">15</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">6.1  Distributed NoSQL Cluster Computing Framework &amp; Storage</span></span>
            <span class="toc-num">15</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">6.2  Backend Computing Runtime &amp; Microservice</span></span>
            <span class="toc-num">15</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">6.3  Machine Learning &amp; Conformal Prediction Stack</span></span>
            <span class="toc-num">16</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">6.4  Reactive Frontend &amp; Kitchen Workstation UI</span></span>
            <span class="toc-num">16</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">6.5  Automated Verification, Testing &amp; QA Framework</span></span>
            <span class="toc-num">16</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>7  Implementation / Methodology</strong></span></span>
            <span class="toc-num">19</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.1  System Architectural Pattern</span></span>
            <span class="toc-num">19</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.2  MongoDB 8.x Schema Validation &amp; Aggregations</span></span>
            <span class="toc-num">19</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.3  26-Feature Zero-Leakage Pipeline</span></span>
            <span class="toc-num">19</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.4  Target Transformation &amp; Log1p Inductive Bias</span></span>
            <span class="toc-num">20</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.5  Walk-Forward 4-Fold Cross-Validation</span></span>
            <span class="toc-num">20</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.6  Distribution-Free Split-Conformal Prediction</span></span>
            <span class="toc-num">20</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.7  Newsvendor Economic Buffer Optimization</span></span>
            <span class="toc-num">21</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.8  The 4-Tier Cold-Start Fallback Ladder</span></span>
            <span class="toc-num">21</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.9  Linear Waterfall Feature Explainability</span></span>
            <span class="toc-num">22</span>
        </li>
        <li class="toc-item toc-sub">
            <span class="toc-title"><span class="toc-name">7.10 Closed-Loop Shift Reconciliation &amp; SDG 12.3 Accounting</span></span>
            <span class="toc-num">22</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>8  Complete Code</strong></span></span>
            <span class="toc-num">23</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>9  Execution Screenshots &amp; Verification Logs</strong></span></span>
            <span class="toc-num">45</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>10 Output / Result Screenshots</strong></span></span>
            <span class="toc-num">48</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>11 Result Analysis</strong></span></span>
            <span class="toc-num">56</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>12 Conclusion &amp; Future Scope</strong></span></span>
            <span class="toc-num">58</span>
        </li>
        <li class="toc-item">
            <span class="toc-title"><span class="toc-name"><strong>13 References</strong></span></span>
            <span class="toc-num">59</span>
        </li>
    </ul>"""

    html = re.sub(r'<ul class=["\']toc-list["\']>.*?</ul>', new_toc, html, flags=re.DOTALL)
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html)
    print("Table of Contents updated with exact verified page numbers.")

def create_stamp_pdf(page_num, total_pages, is_chapter_opening=False, is_frontmatter=False):
    title = "Leftover Radar: Commercial Kitchen Demand Forecasting"
    
    # Coordinates in A4 points: 595.28 x 841.89
    if is_frontmatter:
        # Pages 1 to 4: Top running header with line, matching sample report
        x_page = 538 if page_num < 10 else 532
        stream = f"""q
0 0 0 rg
0.5 w
51 802 m 544 802 l S
BT
/F1 9.5 Tf
51 806 Td
({title}) Tj
ET
BT
/F1 9.5 Tf
{x_page} 806 Td
({page_num}) Tj
ET
Q"""
    elif is_chapter_opening:
        # Chapter opening pages and Contents: Bottom centered page number (LaTeX plain style)
        x_center = 294 if page_num < 10 else 291
        stream = f"""q
BT
/F1 10 Tf
{x_center} 32 Td
({page_num}) Tj
ET
Q"""
    else:
        # Running header: Left title, right page number, horizontal line underneath
        x_page = 538 if page_num < 10 else 532
        stream = f"""q
0 0 0 rg
0.5 w
51 802 m 544 802 l S
BT
/F1 9.5 Tf
51 806 Td
({title}) Tj
ET
BT
/F1 9.5 Tf
{x_page} 806 Td
({page_num}) Tj
ET
Q"""

    stream_bytes = stream.encode('latin1')
    length = len(stream_bytes)
    
    parts = []
    parts.append("%PDF-1.4\n")
    o1 = len("".join(parts))
    parts.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    o2 = len("".join(parts))
    parts.append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    o3 = len("".join(parts))
    parts.append("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n")
    o4 = len("".join(parts))
    parts.append("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n")
    o5 = len("".join(parts))
    parts.append(f"5 0 obj\n<< /Length {length} >>\nstream\n{stream}\nendstream\nendobj\n")
    xref_offset = len("".join(parts))
    parts.append("xref\n0 6\n0000000000 65535 f \n")
    parts.append(f"{o1:010d} 00000 n \n")
    parts.append(f"{o2:010d} 00000 n \n")
    parts.append(f"{o3:010d} 00000 n \n")
    parts.append(f"{o4:010d} 00000 n \n")
    parts.append(f"{o5:010d} 00000 n \n")
    parts.append(f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n")
    
    return io.BytesIO("".join(parts).encode('latin1'))

def compile_and_stamp():
    build_perfect_toc_html()
    
    html_abs = os.path.abspath(HTML_PATH).replace(chr(92), "/")
    print("Compiling HTML to raw PDF with Chrome headless (suppressing browser headers)...")
    cmd = [
        CHROME_PATH,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        f"--print-to-pdf={TEMP_RAW_PDF}",
        f"file:///{html_abs}"
    ]
    subprocess.run(cmd, check=True)
    print("Raw PDF compiled successfully.")

    writer = pypdf.PdfWriter(clone_from=TEMP_RAW_PDF)
    total_pages = len(writer.pages)
    print(f"Total pages in raw PDF: {total_pages}")

    # Chapter opening pages + Contents (page 5)
    chapter_opening_pages = {5, 6, 7, 9, 11, 13, 15, 19, 23, 45, 48, 56, 58, 59}

    print("Stamping running headers, rules, and page numbers onto all pages...")
    for idx, page in enumerate(writer.pages):
        page_num = idx + 1
        is_fm = (page_num in [1, 2, 3, 4])
        is_ch = (page_num in chapter_opening_pages)
        
        stamp_io = create_stamp_pdf(page_num, total_pages, is_chapter_opening=is_ch, is_frontmatter=is_fm)
        stamp_page = pypdf.PdfReader(stamp_io).pages[0]
        page.merge_page(stamp_page)

    with open(FINAL_PDF_PATH, "wb") as f_out:
        writer.write(f_out)

    print(f"Final report PDF saved to: {FINAL_PDF_PATH}")
    if os.path.exists(TEMP_RAW_PDF):
        os.remove(TEMP_RAW_PDF)

if __name__ == "__main__":
    compile_and_stamp()
