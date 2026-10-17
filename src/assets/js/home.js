
    (() => {
      const root = document.documentElement;
      const toggle = document.getElementById("theme-toggle");
      const icon = document.getElementById("theme-icon");
      const label = document.getElementById("theme-label");

      function readSavedTheme() {
        try {
          return sessionStorage.getItem("peervault-theme");
        } catch {
          return null;
        }
      }

      function saveTheme(theme) {
        try {

          sessionStorage.setItem("peervault-theme", theme);
        } catch {
          // Theme switching still works when storage is unavailable.
        }
      }

      function applyTheme(theme) {
        const isDark = theme === "dark";

        root.dataset.theme = isDark ? "dark" : "light";
        icon.textContent = isDark ? "☼" : "☾";
        label.textContent = isDark ? "Light mode" : "Dark mode";
        toggle.setAttribute(
          "aria-label",
          isDark ? "Switch to light theme" : "Switch to dark theme"
        );
        saveTheme(theme);
      }

      const savedTheme = readSavedTheme();
      applyTheme(savedTheme === "light" ? "light" : "dark");

      toggle.addEventListener("click", () => {
        applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
      });

      // UX-only search for the sample cards.
      // Keep your app.js search implementation if it already owns this input.
      const searchInput = document.getElementById("search-input");
      const entriesList = document.getElementById("entries-list");
      const summary = document.getElementById("entries-summary");

      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const cards = entriesList.querySelectorAll(".entry-card");
        let visibleCount = 0;

        cards.forEach((card) => {
          const matches = card.textContent.toLowerCase().includes(query);
          card.hidden = !matches;
          if (matches) visibleCount++;
        });

        summary.textContent = query
          ? `${visibleCount} matching ${visibleCount === 1 ? "entry" : "entries"}`
          : "Recent entries";
      });

      // UX-only selection for the sample entries.
      // The real data-driven detail view should be implemented in app.js.
      const sampleEntries = {
        welcome: {
          title: "Welcome to Pear AutoPass Desktop",
          subtitle: "A calm, organized space for information you want to keep close.",
          body: `
            <h2>A little space for what matters</h2>
            <p>Pear AutoPass Desktop is your workspace for keeping useful information organized. Browse entries, search for what you need, and manage your vault without unnecessary clutter.</p>
            <div class="callout"><strong>Designed for privacy.</strong><br>Keep your vault organized and use the connection status to understand when peer-related functionality is available.</div>
            <h2>Getting started</h2>
            <ul>
              <li>Create an entry using the plus button in the list header.</li>
              <li>Use search to find entries by title or content.</li>
              <li>Keep related information grouped into collections.</li>
              <li>Review your peer connection status in the sidebar.</li>
            </ul>`
        },
        project: {
          title: "Project workspace",
          subtitle: "A sample collection of project information and technical notes.",
          body: `
            <h2>Project overview</h2>
            <p>Keep implementation notes, links, decisions, and follow-up tasks in one place.</p>
            <div class="callout"><strong>UX preview.</strong><br>This content is static demonstration data, not a stored vault entry.</div>
            <h2>Next steps</h2>
            <ul><li>Record the key project decisions.</li><li>Organize useful references.</li><li>Review outstanding tasks.</li></ul>`
        },
        credentials: {
          title: "Development credentials",
          subtitle: "A sample secure-entry view. No real credentials are included.",
          body: `
            <h2>Credential details</h2>
            <p>This preview deliberately contains no real usernames, passwords, tokens, or secrets.</p>
            <div class="callout"><strong>Security note.</strong><br>Ensure actual secrets are protected by your vault's storage and access-control implementation. Never render sensitive values into untrusted preview text.</div>`
        },
        ideas: {
          title: "Ideas to explore",
          subtitle: "A lightweight place to collect ideas and revisit them later.",
          body: `
            <h2>Ideas</h2>
            <ul><li>Explore a simpler way to organize related entries.</li><li>Make entry search feel instant.</li><li>Show peer synchronization state clearly.</li><li>Keep important actions easy to discover.</li></ul>
            <p>These are demonstration notes for the interface prototype.</p>`
        }
      };

      entriesList.addEventListener("click", (event) => {
        const card = event.target.closest(".entry-card");
        if (!card || !sampleEntries[card.dataset.entry]) return;

        entriesList.querySelectorAll(".entry-card").forEach((item) => {
          item.classList.toggle("active", item === card);
        });

        const entry = sampleEntries[card.dataset.entry];
        document.getElementById("current-entry-label").textContent = entry.title;
        document.getElementById("detail-title").textContent = entry.title;
        document.getElementById("detail-subtitle").textContent = entry.subtitle;
        document.getElementById("detail-body").innerHTML = entry.body;
      });
    })();

