import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import time
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_TIMEOUT = 300 # 5 minutes cache

cache = {
    "data": None,
    "last_fetched": 0
}

def clean_html(html_str):
    """
    Cleans HTML tags and formats elements like lists and code blocks
    into plain text suitable for Twitter and general text representation.
    """
    text = html_str
    # Convert code blocks to markdown code ticks
    text = re.sub(r'<code>(.*?)</code>', r'`\1`', text, flags=re.DOTALL)
    # Convert list items to bullet points
    text = re.sub(r'<li>\s*(.*?)\s*</li>', r'• \1', text, flags=re.DOTALL)
    # Replace closing tags of block elements with double newlines
    text = re.sub(r'</p>|</div>|</h3>|</ul>|</ol>', r'\n\n', text)
    # Remove any other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entity symbols (e.g. &amp;, &lt;, &gt;, &quot;)
    text = html.unescape(text)
    
    # Split text into lines, strip whitespace, and normalize spacing
    lines = []
    for line in text.split('\n'):
        cleaned = re.sub(r'[ \t]+', ' ', line).strip()
        lines.append(cleaned)
        
    non_empty_lines = []
    for line in lines:
        if line:
            non_empty_lines.append(line)
        else:
            if non_empty_lines and non_empty_lines[-1] != '' and not non_empty_lines[-1].startswith('•'):
                non_empty_lines.append('')
                
    final_lines = []
    for i, line in enumerate(non_empty_lines):
        # Prevent empty line before bullet points
        if line == '' and i + 1 < len(non_empty_lines) and non_empty_lines[i + 1].startswith('•'):
            continue
        final_lines.append(line)
        # Ensure exactly one empty line after a list of bullet points
        if line.startswith('•') and i + 1 < len(non_empty_lines) and not non_empty_lines[i + 1].startswith('•') and non_empty_lines[i + 1] != '':
            final_lines.append('')
            
    return '\n'.join(final_lines).strip()

def fetch_and_parse_feed():
    """
    Fetches the BigQuery XML feed and parses it into flattened update items.
    """
    try:
        # Set User-Agent to mimic a browser just in case Google restricts python urllib
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        flat_updates = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns).text or ""
            entry_id = entry.find('atom:id', ns).text or ""
            updated_str = entry.find('atom:updated', ns).text or ""
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry.find("atom:link", ns)
            link_url = link_elem.attrib.get('href', '') if link_elem is not None else ''
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Find sub-headers (e.g. <h3>Feature</h3>) to segment the day's updates
            matches = re.findall(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', content_html, re.DOTALL)
            
            if not matches:
                # If no sub-headers are found, treat the content as one main update
                clean_txt = clean_html(content_html)
                flat_updates.append({
                    "id": f"{entry_id}_0",
                    "date": title,
                    "updated": updated_str,
                    "link": link_url,
                    "type": "Update",
                    "html": content_html.strip(),
                    "text": clean_txt
                })
            else:
                for idx, (update_type, update_html) in enumerate(matches):
                    clean_txt = clean_html(update_html)
                    flat_updates.append({
                        "id": f"{entry_id}_{idx}",
                        "date": title,
                        "updated": updated_str,
                        "link": link_url,
                        "type": update_type.strip(),
                        "html": update_html.strip(),
                        "text": clean_txt
                    })
        return flat_updates
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_fetched"] > CACHE_TIMEOUT):
        try:
            data = fetch_and_parse_feed()
            cache["data"] = data
            cache["last_fetched"] = current_time
            source = "network"
        except Exception as e:
            if cache["data"]:
                # Graceful fallback to cache if available
                data = cache["data"]
                source = "cache_fallback"
            else:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to fetch release notes: {str(e)}"
                }), 500
    else:
        data = cache["data"]
        source = "cache"
        
    return jsonify({
        "status": "success",
        "source": source,
        "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"])),
        "count": len(data),
        "data": data
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
