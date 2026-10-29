
const searchForm = document.querySelector("#search-form");
const wordInput = document.querySelector("#word-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");
const wordResult = document.querySelector("#word-result");
const favoritesList = document.querySelector("#favorites-list");
const favoriteCount = document.querySelector("#favorite-count");
const themeToggle = document.querySelector("#theme-toggle");

const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

let currentWord = null;
let favorites = loadFavorites();

// Read saved favorites safely.
function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem("wordly-favorites"));
    return Array.isArray(saved)
      ? saved.filter(word => typeof word === "string")
      : [];
  } catch {
    return [];
  }
}

// Display a message to the user.
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

// Fetch word information from the dictionary API.
async function fetchWord(word) {
  const response = await fetch(
    `${API_URL}${encodeURIComponent(word)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Word not found. Check the spelling and try again.");
    }

    throw new Error("Unable to retrieve the definition. Try again.");
  }

  return await response.json();
}

// Display dictionary results on the page.
function displayWord(data) {
  const entry = data[0];

  if (!entry) {
    throw new Error("No definition was found for this word.");
  }

  currentWord = entry.word.toLowerCase();

  wordResult.replaceChildren();

  const card = document.createElement("article");
  card.className = "word-card";

  // Word heading and action buttons.
  const header = document.createElement("div");
  header.className = "word-header";

  const heading = document.createElement("h2");
  heading.textContent = entry.word;

  const actions = document.createElement("div");
  actions.className = "word-actions";

  const audioUrl = entry.phonetics?.find(item => item.audio)?.audio;

  if (audioUrl) {
    const audioButton = document.createElement("button");
    audioButton.type = "button";
    audioButton.className = "icon-button";
    audioButton.textContent = "🔊 Listen";
    audioButton.setAttribute("aria-label", `Hear ${entry.word} pronounced`);

    audioButton.addEventListener("click", () => {
      const audio = new Audio(audioUrl);

      audio.play().catch(() => {
        showStatus("Audio playback is unavailable.", true);
      });
    });

    actions.appendChild(audioButton);
  }

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "icon-button";
  saveButton.addEventListener("click", toggleFavorite);

  actions.appendChild(saveButton);
  header.append(heading, actions);
  card.appendChild(header);

  // Pronunciation text.
  const phoneticText = entry.phonetic ||
    entry.phonetics?.find(item => item.text)?.text ||
    "Pronunciation not available";

  const pronunciation = document.createElement("p");
  pronunciation.className = "pronunciation";
  pronunciation.textContent = phoneticText;
  card.appendChild(pronunciation);

  // Definitions, parts of speech, examples, and synonyms.
  entry.meanings?.forEach(meaning => {
    const section = document.createElement("section");
    section.className = "definition";

    const partOfSpeech = document.createElement("h3");
    partOfSpeech.textContent = meaning.partOfSpeech || "Definition";
    section.appendChild(partOfSpeech);

    meaning.definitions?.forEach((item, index) => {
      const definition = document.createElement("p");
      definition.textContent = `${index + 1}. ${item.definition}`;
      section.appendChild(definition);

      if (item.example) {
        const example = document.createElement("p");
        example.className = "example";
        example.textContent = `Example: "${item.example}"`;
        section.appendChild(example);
      }
    });

    const synonyms = [
      ...new Set([
        ...(meaning.synonyms || []),
        ...(meaning.definitions || []).flatMap(
          item => item.synonyms || []
        )
      ])
    ];

    if (synonyms.length > 0) {
      const synonymHeading = document.createElement("h3");
      synonymHeading.textContent = "Synonyms";
      section.appendChild(synonymHeading);

      const tags = document.createElement("div");
      tags.className = "tag-list";

      synonyms.slice(0, 15).forEach(synonym => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = synonym;
        tags.appendChild(tag);
      });

      section.appendChild(tags);
    }

    card.appendChild(section);
  });

  // Link to the original dictionary entry.
  if (entry.sourceUrls?.length) {
    const source = document.createElement("p");
    const link = document.createElement("a");

    link.href = entry.sourceUrls[0];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "source-link";
    link.textContent = "View source";

    source.appendChild(link);
    card.appendChild(source);
  }

  wordResult.appendChild(card);
  updateSaveButton(saveButton);
}

// Update the save button to reflect favorite status.
function updateSaveButton(button) {
  const isSaved = favorites.includes(currentWord);

  button.textContent = isSaved ? "♥ Saved" : "♡ Save";
  button.setAttribute(
    "aria-label",
    isSaved ? "Remove from favorites" : "Save to favorites"
  );
}

// Add or remove the current word from favorites.
function toggleFavorite() {
  if (!currentWord) return;

  if (favorites.includes(currentWord)) {
    favorites = favorites.filter(word => word !== currentWord);
    showStatus(`Removed "${currentWord}" from favorites.`);
  } else {
    favorites.push(currentWord);
    showStatus(`Saved "${currentWord}" to favorites.`);
  }

  try {
    localStorage.setItem("wordly-favorites", JSON.stringify(favorites));
  } catch {
    showStatus("Could not save favorites in this browser.", true);
  }

  renderFavorites();

  const saveButton = wordResult.querySelector(".word-actions button:last-child");

  if (saveButton) {
    updateSaveButton(saveButton);
  }
}

// Display saved words as clickable buttons.
function renderFavorites() {
  favoritesList.replaceChildren();

  favoriteCount.textContent =
    `${favorites.length} saved`;

  if (favorites.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-favorites";
    emptyMessage.textContent =
      "Your favorite words will appear here.";

    favoritesList.appendChild(emptyMessage);
    return;
  }

  favorites.forEach(word => {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.type = "button";
    button.className = "favorite-word";
    button.textContent = `♡ ${word}`;
    button.setAttribute("aria-label", `Search for ${word}`);

    button.addEventListener("click", () => {
      wordInput.value = word;
      searchWord(word);
    });

    item.appendChild(button);
    favoritesList.appendChild(item);
  });
}

// Search for a word without refreshing the page.
async function searchWord(word) {
  const cleanedWord = word.trim();

  if (!cleanedWord) {
    showStatus("Please enter a word to search.", true);
    wordInput.focus();
    return;
  }

  searchButton.disabled = true;
  showStatus("Searching for your word...");
  wordResult.replaceChildren();

  try {
    const data = await fetchWord(cleanedWord);
    displayWord(data);
    showStatus(`Definition found for "${data[0].word}".`);
  } catch (error) {
    currentWord = null;
    showStatus(
      error.message || "Something went wrong. Please try again.",
      true
    );
  } finally {
    searchButton.disabled = false;
  }
}

// Listen for form submission.
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchWord(wordInput.value);
});

// Toggle between light and dark themes.
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-theme");

  themeToggle.textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme"
  );
});

// Show saved favorites when the page loads.
renderFavorites();
