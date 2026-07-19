# BigQuery Release Notes Explorer

A premium, responsive web dashboard built with **Python Flask** and vanilla **HTML, JavaScript, and CSS** that fetches, parses, segments, and displays the official BigQuery release notes from the Google Cloud feed. 

It provides an interactive, developer-focused interface to browse releases and instantly compose and customize social updates that mathematically fit within the 280-character Twitter/X limit.

---

## ✨ Features

- **Granular Segment Parsing**: Daily Google release entries containing multiple updates are automatically parsed by `<h3>` header elements and flattened into individual, taggable items (Features, Announcements, Changes, Security bulletins, Deprecations).
- **Rich Dashboard Statistics**: A metric panel displays real-time statistics of the feed updates. Dashboard cards double as quick filters when clicked.
- **Advanced Text Cleaner**: Converts complex HTML feed content into plain, readable text suitable for posts (e.g. converting `<code>` tags to backticks, mapping list items to clean bullet points).
- **Integrated Twitter/X Composer Modal**: Includes an interactive composing editor with an SVG-based circular character limit validator, dynamic text formatting, and direct integrations with the X Web Intent interface and clipboard copy features.
- **Smart 5-Minute In-Memory Cache**: Serves updates instantaneously with cached data and falls back gracefully on network failure. Supports force-refreshing through a toolbar button.
- **Modern UI Design System**: Custom modern grid typography, responsive flex/grid layouts, card lift-effects, dark mode styling, and animated skeleton loading states.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, XML.etree.ElementTree (Standard Library XML Parser), Urllib (Standard Library Request Library)
- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables, Flexbox, Grids, Transitions, Keyframes), ES6 JavaScript (Fetch API, DOM Events, Character Limit Math)
- **Design System & Assets**: Google Fonts (Outfit, Inter, JetBrains Mono), Raw SVG Vectors & Badges

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py              # Flask server backend, caching & XML parsing logic
├── README.md           # Documentation
├── .gitignore          # File exclusions
├── templates/
│   └── index.html      # Frontend HTML skeleton
└── static/
    ├── css/
    │   └── style.css   # Main layout, colors, variables & animations
    └── js/
        └── main.js     # State manager, filters, selections & X integration
```

---

## 🚀 Getting Started

Follow these steps to run the application locally on your machine:

### Prerequisites

Make sure you have Python 3 installed. Check your version with:
```bash
python3 --version
```

### Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   git clone https://github.com/SELLAMI-Soufiane/Big-event-talks-app.git
   cd Big-event-talks-app
   ```

2. **Create a virtual environment**:
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment**:
   - On Linux/macOS:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

4. **Install dependencies**:
   ```bash
   pip install flask
   ```

### Running the App

Start the Flask development server:
```bash
python app.py
```

The application will run by default on **[http://localhost:5000](http://localhost:5000)**. Open this URL in your web browser to browse the explorer dashboard!

---

## 📝 License

This project is open-source and available under the MIT License.
