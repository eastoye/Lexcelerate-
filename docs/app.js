// ---------------------------
// Global Variables for User & Catalogue
// ---------------------------

let currentUser = localStorage.getItem('currentUser');
let wordCatalogue = []; // This will be loaded per user

// Load the current user’s catalogue from localStorage (or initialize it)
function loadUserCatalogue() {
  if (currentUser) {
    const key = "wordCatalogue_" + currentUser;
    wordCatalogue = JSON.parse(localStorage.getItem(key)) || [];
    // Ensure each word object has required properties (including ranking: score and streak)
    wordCatalogue.forEach(wordObj => {
      if (typeof wordObj.score !== 'number') wordObj.score = 0;  // ranking score, default 0
      if (typeof wordObj.streak !== 'number') wordObj.streak = 0;
      if (!wordObj.mistakes) wordObj.mistakes = {};
      if (!wordObj.nextReview) wordObj.nextReview = Date.now();
      if (!wordObj.interval) wordObj.interval = 1;
    });
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
// Notification Function (Non-blocking)
// ---------------------------
function showNotification(message) {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.style.display = 'block';
  setTimeout(() => {
    notif.style.display = 'none';
  }, 2000); // 2 seconds
}

// ---------------------------
// Login / Authentication Section
// ---------------------------
function checkLogin() {
  currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    loadUserCatalogue();
    showScreen('home-screen');
  } else {
    showScreen('login-screen');
  }
}

document.getElementById('login-btn').addEventListener('click', () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (username === "" || password === "") {
    alert("Please enter both a username and password.");
    return;
  }
  localStorage.setItem('currentUser', username);
  currentUser = username;
  loadUserCatalogue();
  showScreen('home-screen');
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  wordCatalogue = [];
  currentUser = null;
  showScreen('login-screen');
});

// ---------------------------
// Helper Functions for Lexcelerate
// ---------------------------
function getCoveredWord(word) {
  return "_".repeat(word.length);
}

function splitWordIntoSyllables(word) {
  let syllables = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+|$)/gi);
  return syllables ? syllables : [word];
}

// Generate a syllable-based hint that reveals one more syllable per extra wrong attempt.
function generateSyllableHint(word, attemptCount) {
  let syllables = splitWordIntoSyllables(word);
  let syllablesToReveal = Math.min(attemptCount - 2, syllables.length);
  let hintArray = syllables.map((syl, index) => {
    return index < syllablesToReveal ? syl : "_".repeat(syl.length);
  });
  return hintArray.join("-");
}

// ---------------------------
// Global Variables for Practice Session & Sound Toggle
// ---------------------------
let attemptCount = 0;
let currentWordObj = null;
let soundEnabled = true; // Default: sound is ON

// ---------------------------
// Progress & Navigation Functions
// ---------------------------
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
                <p>Correct on First Try: ${wordObj.correctFirstTryCount}</p>
                <p>Score: ${wordObj.score}</p>`;
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
// Navigation Event Listeners
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
// Add Word Functionality (with Ranking Properties)
// ---------------------------
document.getElementById('save-word-btn').addEventListener('click', () => {
  const wordInput = document.getElementById('word-input');
  const word = wordInput.value.trim();
  if (word !== "") {
    // Initialize new word with ranking properties: score and streak.
    wordCatalogue.push({
      word: word,
      totalAttempts: 0,
      correctFirstTryCount: 0,
      mistakes: {},
      nextReview: Date.now(),
      interval: 1,
      score: 0,     // Ranking score (0-100; lower means less known)
      streak: 0     // Correct answer streak for this word
    });
    saveCatalogue();
    wordInput.value = '';
    showNotification(`"${word}" added`);
    updateProgressSummary();
  } else {
    alert('Please enter a valid word.');
  }
});

// ---------------------------
// Adaptive Learning with Ranking System
// ---------------------------
// Here, we use each word's score to determine its weight.
// Lower-scoring words (harder words) should appear more frequently.
// For example, weight = (maxScore + 1) - score, where maxScore is 100.
const maxScore = 100;
function getRandomWord() {
  let now = Date.now();
  // (You could combine spaced repetition by filtering due words if desired.
  // For simplicity, we use the ranking system here.)
  let totalWeight = 0;
  let weights = [];
  wordCatalogue.forEach(wordObj => {
    // Weight formula: higher score gives lower weight.
    let weight = (maxScore + 1) - wordObj.score; // if score is 0 => weight=101; if score=100 => weight=1
    weights.push(weight);
    totalWeight += weight;
  });
  let random = Math.random() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < wordCatalogue.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return wordCatalogue[i];
    }
  }
  return wordCatalogue[0];
}

// ---------------------------
// Load Practice Word & Sound Toggle / Reveal Functionality
// ---------------------------
function loadPracticeWord() {
  currentWordObj = getRandomWord();
  let actualWord = currentWordObj.word;
  document.getElementById('prompt').textContent = getCoveredWord(actualWord);
  document.getElementById('feedback').textContent = '';
  document.getElementById('spell-input').value = '';
  attemptCount = 0;
  // If sound is enabled, auto-speak the word.
  if (soundEnabled) {
    const utterance = new SpeechSynthesisUtterance(actualWord);
    speechSynthesis.speak(utterance);
  }
  // Ensure text input is enabled.
  document.getElementById('spell-input').disabled = false;
}

// ---------------------------
// Sound Toggle Button
// ---------------------------
document.getElementById('sound-toggle-btn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('sound-toggle-btn').textContent = soundEnabled ? "Sound: ON" : "Sound: OFF";
});

// ---------------------------
// Reveal Word on Prompt Tap (Only when Sound is OFF)
// ---------------------------
document.getElementById('prompt').addEventListener('click', () => {
  if (!soundEnabled && currentWordObj) {
    // Reveal the actual word temporarily
    document.getElementById('prompt').textContent = currentWordObj.word;
    // Clear and disable the text input so the user cannot type while word is revealed.
    const spellInput = document.getElementById('spell-input');
    spellInput.value = "";
    spellInput.disabled = true;
    // After 3 seconds, re-hide the word and re-enable typing.
    setTimeout(() => {
      document.getElementById('prompt').textContent = getCoveredWord(currentWordObj.word);
      spellInput.disabled = false;
    }, 3000);
  }
});

// ---------------------------
// Talk Button (Always speaks the word)
document.getElementById('talk-btn').addEventListener('click', () => {
  const wordToSpeak = currentWordObj ? currentWordObj.word : "";
  if (!wordToSpeak) {
    alert("No word available to speak. Please start a practice session.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(wordToSpeak);
  speechSynthesis.speak(utterance);
});

// ---------------------------
// Allow pressing Enter in the input field to submit.
document.getElementById('spell-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('submit-spelling-btn').click();
  }
});

// ---------------------------
// Practice Submission Handler with Ranking Updates
// ---------------------------
document.getElementById('submit-spelling-btn').addEventListener('click', () => {
  let actualWord = currentWordObj.word;
  const userSpelling = document.getElementById('spell-input').value.trim();
  const feedbackEl = document.getElementById('feedback');
  
  if (userSpelling.toLowerCase() === actualWord.toLowerCase()) {
    feedbackEl.textContent = "Correct!";
    currentWordObj.totalAttempts++;
    
    // Update ranking: Increase streak and add points based on streak.
    currentWordObj.streak++;
    if (currentWordObj.streak >= 10) {
      currentWordObj.score += 5;
    } else if (currentWordObj.streak >= 5) {
      currentWordObj.score += 2;
    } else {
      currentWordObj.score += 1;
    }
    // Clamp score to maxScore
    if (currentWordObj.score > maxScore) currentWordObj.score = maxScore;
    
    // Increase correct first-try count if no mistakes this round.
    if (attemptCount === 0) {
      currentWordObj.correctFirstTryCount++;
    }
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
    // Update ranking: Reset streak and subtract points.
    currentWordObj.streak = 0;
    if (currentWordObj.score > 60) {
      currentWordObj.score -= 2;
    } else {
      currentWordObj.score -= 1;
    }
    // Clamp score so it doesn’t go below 0.
    if (currentWordObj.score < 0) currentWordObj.score = 0;
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
