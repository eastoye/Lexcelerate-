// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------

// Get the current user from localStorage (if logged in)
let currentUser = localStorage.getItem('currentUser');
// Global variable for the current user’s word catalogue
let wordCatalogue = [];

// Load the current user’s catalogue from localStorage (or initialize it)
function loadUserCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    wordCatalogue = JSON.parse(localStorage.getItem(key)) || [];
    // If words were stored as strings, convert them to objects with stats.
    if (wordCatalogue.length > 0 && typeof wordCatalogue[0] === "string") {
      wordCatalogue = wordCatalogue.map(word => ({
        word: word,
        totalAttempts: 0,
        correctFirstTryCount: 0,
        mistakes: {},
        nextReview: Date.now(),
        interval: 1
      }));
    } else {
      // Ensure every word object has the spaced repetition properties.
      wordCatalogue.forEach(wordObj => {
        if (!wordObj.mistakes) wordObj.mistakes = {};
        if (!wordObj.nextReview) wordObj.nextReview = Date.now();
        if (!wordObj.interval) wordObj.interval = 1;
      });
    }
    saveCatalogue();
  }
}

// Save the current user’s catalogue to localStorage.
function saveCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    localStorage.setItem(key, JSON.stringify(wordCatalogue));
  }
}

// ---------------------------
// Login / Authentication Section
// ---------------------------

// Check if a user is logged in; if not, show the login screen.
function checkLogin() {
  currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    // Load this user’s catalogue.
    loadUserCatalogue();
    showScreen('home-screen');
  } else {
    showScreen('login-screen');
  }
}

// Event listener for the login button.
document.getElementById('login-btn').addEventListener('click', () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (username === "" || password === "") {
    alert("Please enter both a username and password.");
    return;
  }
  // For this simple example, any username/password is accepted.
  localStorage.setItem('currentUser', username);
  currentUser = username;
  loadUserCatalogue();
  showScreen('home-screen');
});

// Log Out functionality.
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  // Optionally, you might clear the user's catalogue from memory.
  wordCatalogue = [];
  currentUser = null;
  showScreen('login-screen');
});

// ---------------------------
// Helper Functions for Lexcelerate
// ---------------------------

// Returns a string of underscores matching the length of the word.
function getCoveredWord(word) {
  return "_".repeat(word.length);
}

// Naively split the word into syllable-like chunks using a regex heuristic.
function splitWordIntoSyllables(word) {
  let syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+|$)/gi);
  return syllables ? syllables : [word];
}

// Generate a syllable-based hint that reveals one more syllable per extra wrong attempt.
// For example, on the third wrong attempt reveal the first syllable; on the fourth, the first two, etc.
function generateSyllableHint(word, attemptCount) {
  let syllables = splitWordIntoSyllables(word);
  let syllablesToReveal = Math.min(attemptCount - 2, syllables.length);
  let hintArray = syllables.map((syl, index) => {
    return index < syllablesToReveal ? syl : "_".repeat(syl.length);
  });
  return hintArray.join("-");
}

// ---------------------------
// Global Variables for Practice Session
// ---------------------------

let attemptCount = 0;
let currentWordObj = null;

// ---------------------------
// Progress & Navigation Functions
// ---------------------------

// Update the progress summary on the Home screen.
function updateProgressSummary() {
  const summaryDiv = document.getElementById('progress-summary');
  let totalAttempts = 0;
  let totalCorrectFirstTry = 0;
  wordCatalogue.forEach(wordObj => {
    totalAttempts += wordObj.totalAttempts;
    totalCorrectFirstTry += wordObj.correctFirstTryCount;
  });
  let progress = totalAttempts > 0 ? ((totalCorrectFirstTry / totalAttempts) * 100).toFixed(1) : 0;
  summaryDiv.textContent = `Overall First-Attempt Accuracy: ${progress}%`;
}

// Generate the statistics list HTML for the stats screen.
function updateStatsList() {
  const statsListDiv = document.getElementById('stats-list');
  let html = '';
  if (wordCatalogue.length === 0) {
    html = '<p>No words added.</p>';
  } else {
    wordCatalogue.forEach(wordObj => {
      html += `<div class="word-stat">
                <h3>${wordObj.word}</h3>
                <p>Total Attempts: ${wordObj.totalAttempts}</p>
                <p>Correct on First Try: ${wordObj.correctFirstTryCount}</p>`;
      if (Object.keys(wordObj.mistakes).length > 0) {
        html += `<p>Mistakes:</p><ul>`;
        for (let mistake in wordObj.mistakes) {
          html += `<li>${mistake} : ${wordObj.mistakes[mistake]} time(s)</li>`;
        }
        html += `</ul>`;
      } else {
        html += `<p>No mistakes recorded.</p>`;
      }
      html += `</div>`;
    });
  }
  statsListDiv.innerHTML = html;
}

// Handle navigation between screens.
function showScreen(screenId) {
  document.querySelectorAll('.screen, #home-screen, #login-screen').forEach(screen => {
    screen.style.display = 'none';
  });
  document.getElementById(screenId).style.display = 'block';
  if (screenId === 'home-screen') {
    updateProgressSummary();
  }
  if (screenId === 'stats-screen') {
    updateStatsList();
  }
}

// ---------------------------
// Navigation Event Listeners (for screens)
// ---------------------------

document.getElementById('add-word-btn').addEventListener('click', () => {
  showScreen('add-word-screen');
});
document.getElementById('practice-btn').addEventListener('click', () => {
  if (wordCatalogue.length === 0) {
    alert('Please add at least one word first!');
    return;
  }
  showScreen('practice-screen');
  loadPracticeWord();
});
document.getElementById('stats-btn').addEventListener('click', () => {
  showScreen('stats-screen');
});
document.querySelectorAll('.back-btn').forEach(button => {
  button.addEventListener('click', () => {
    showScreen('home-screen');
  });
});

// ---------------------------
// Add Word Functionality
// ---------------------------

document.getElementById('save-word-btn').addEventListener('click', () => {
  const wordInput = document.getElementById('word-input');
  const word = wordInput.value.trim();
  if (word !== "") {
    wordCatalogue.push({
      word: word,
      totalAttempts: 0,
      correctFirstTryCount: 0,
      mistakes: {},
      nextReview: Date.now(),
      interval: 1
    });
    saveCatalogue();
    wordInput.value = '';
    alert(`Word "${word}" added!`);
    updateProgressSummary();
  } else {
    alert('Please enter a valid word.');
  }
});

// ---------------------------
// Adaptive Learning with Spaced Repetition
// ---------------------------

// Choose a word that is due for review. If none are due, choose the one with the earliest nextReview.
function getRandomWord() {
  let now = Date.now();
  let dueWords = wordCatalogue.filter(wordObj => !wordObj.nextReview || wordObj.nextReview <= now);
  if (dueWords.length === 0) {
    let earliest = wordCatalogue.reduce((prev, curr) => (prev.nextReview < curr.nextReview ? prev : curr));
    dueWords = [earliest];
  }
  let totalWeight = 0;
  let weights = [];
  dueWords.forEach(wordObj => {
    let weight = 1 + (wordObj.totalAttempts - wordObj.correctFirstTryCount);
    weights.push(weight);
    totalWeight += weight;
  });
  let random = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < dueWords.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return dueWords[i];
    }
  }
  return dueWords[0];
}

// Load a word for practice and speak it aloud.
function loadPracticeWord() {
  currentWordObj = getRandomWord();
  let actualWord = currentWordObj.word;
  document.getElementById('prompt').textContent = getCoveredWord(actualWord);
  document.getElementById('feedback').textContent = '';
  document.getElementById('spell-input').value = '';
  attemptCount = 0;
  const utterance = new SpeechSynthesisUtterance(actualWord);
  speechSynthesis.speak(utterance);
}

// ---------------------------
// Practice Area Buttons & Enter-Key Submission
// ---------------------------

// Talk button: speaks the actual word.
document.getElementById('talk-btn').addEventListener('click', () => {
  const wordToSpeak = currentWordObj ? currentWordObj.word : "";
  if (!wordToSpeak) {
    alert("No word available to speak. Please start a practice session.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(wordToSpeak);
  speechSynthesis.speak(utterance);
});

// Allow pressing Enter in the input field to submit the attempt.
document.getElementById('spell-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('submit-spelling-btn').click();
  }
});

// ---------------------------
// Practice Submission Handler
// ---------------------------

document.getElementById('submit-spelling-btn').addEventListener('click', () => {
  let actualWord = currentWordObj.word;
  const userSpelling = document.getElementById('spell-input').value.trim();
  const feedbackEl = document.getElementById('feedback');
  
  if (userSpelling.toLowerCase() === actualWord.toLowerCase()) {
    feedbackEl.textContent = "Correct!";
    currentWordObj.totalAttempts++;
    if (attemptCount === 0) {
      currentWordObj.correctFirstTryCount++;
    }
    // Update spaced repetition properties.
    let now = Date.now();
    if (attemptCount === 0) {
      currentWordObj.interval = currentWordObj.interval ? currentWordObj.interval * 2 : 1;
    } else {
      currentWordObj.interval = 1;
    }
    currentWordObj.nextReview = now + currentWordObj.interval * 24 * 60 * 60 * 1000;
    saveCatalogue();
    updateProgressSummary();
    setTimeout(loadPracticeWord, 1500);
  } else {
    attemptCount++;
    feedbackEl.textContent = "Incorrect. Try again!";
    // Record the mistake.
    if (!currentWordObj.mistakes) {
      currentWordObj.mistakes = {};
    }
    let attemptLower = userSpelling.toLowerCase();
    if (attemptLower !== actualWord.toLowerCase()) {
      currentWordObj.mistakes[attemptLower] = (currentWordObj.mistakes[attemptLower] || 0) + 1;
    }
    saveCatalogue();
    if (attemptCount < 3) {
      document.getElementById('prompt').textContent = getCoveredWord(actualWord);
    } else {
      // After two wrong attempts, reveal a syllable-based hint.
      document.getElementById('prompt').textContent = generateSyllableHint(actualWord, attemptCount);
    }
  }
});

// ---------------------------
// On Initial Load, Check Login
// ---------------------------
checkLogin();
