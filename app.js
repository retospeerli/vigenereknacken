const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const germanFreqOrder = "ENISRATDHULCGMOBWFKZPVJYXQ";

const cipherInput = document.getElementById("cipherInput");
const kasiskiOutput = document.getElementById("kasiskiOutput");
const lengthOutput = document.getElementById("lengthOutput");
const frequencyOutput = document.getElementById("frequencyOutput");
const manualLength = document.getElementById("manualLength");
const keyInput = document.getElementById("keyInput");
const plainOutput = document.getElementById("plainOutput");

document.getElementById("exampleBtn").addEventListener("click", loadExample);
document.getElementById("analyzeBtn").addEventListener("click", analyze);
document.getElementById("clearBtn").addEventListener("click", clearAll);
document.getElementById("useManualBtn").addEventListener("click", analyzeManualLength);
document.getElementById("decryptBtn").addEventListener("click", decryptWithKey);

function cleanText(text) {
  return text
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/[^A-Z]/g, "");
}

function loadExample() {
  cipherInput.value =
    "KMKXG QVPVL TQXQH KZZEO HKKSH QVPKF SSKIX QVJMP KXGKS " +
    "JWZVR QVVLX GWVVO JEPVW XGQII EIPKW GSSZH KZZEO HKKSH";
}

function clearAll() {
  cipherInput.value = "";
  kasiskiOutput.innerHTML = "";
  lengthOutput.innerHTML = "";
  frequencyOutput.innerHTML = "";
  keyInput.value = "";
  plainOutput.value = "";
}

function analyze() {
  const text = cleanText(cipherInput.value);

  if (text.length < 40) {
    kasiskiOutput.innerHTML = `<span class="bad">Der Text ist sehr kurz. Der Kasiski-Test funktioniert besser mit längeren Geheimtexten.</span>`;
    return;
  }

  const repeats = findRepeats(text);
  const factors = countFactors(repeats);
  const bestLength = guessKeyLength(factors);

  showKasiski(repeats, factors);
  showLength(bestLength);

  manualLength.value = bestLength || 5;

  if (bestLength) {
    analyzeColumns(text, bestLength);
  }
}

function findRepeats(text) {
  const results = [];

  for (let size = 3; size <= 5; size++) {
    const map = {};

    for (let i = 0; i <= text.length - size; i++) {
      const part = text.slice(i, i + size);
      if (!map[part]) map[part] = [];
      map[part].push(i);
    }

    for (const part in map) {
      if (map[part].length > 1) {
        const positions = map[part];
        const distances = [];

        for (let i = 1; i < positions.length; i++) {
          distances.push(positions[i] - positions[i - 1]);
        }

        results.push({
          part,
          positions,
          distances
        });
      }
    }
  }

  return results;
}

function countFactors(repeats) {
  const factorCount = {};

  repeats.forEach(rep => {
    rep.distances.forEach(distance => {
      for (let f = 2; f <= 20; f++) {
        if (distance % f === 0) {
          factorCount[f] = (factorCount[f] || 0) + 1;
        }
      }
    });
  });

  return factorCount;
}

function guessKeyLength(factors) {
  const entries = Object.entries(factors)
    .map(([factor, count]) => ({ factor: Number(factor), count }))
    .sort((a, b) => b.count - a.count);

  return entries.length ? entries[0].factor : null;
}

function showKasiski(repeats, factors) {
  if (repeats.length === 0) {
    kasiskiOutput.innerHTML = `
      <p class="bad">Keine brauchbaren Wiederholungen gefunden.</p>
      <p>Der Text ist vielleicht zu kurz oder der Schlüssel ist lang.</p>
    `;
    return;
  }

  let html = `
    <p>Gefundene wiederholte Buchstabengruppen:</p>
    <table>
      <tr>
        <th>Gruppe</th>
        <th>Positionen</th>
        <th>Abstände</th>
      </tr>
  `;

  repeats.slice(0, 25).forEach(rep => {
    html += `
      <tr>
        <td class="code">${rep.part}</td>
        <td>${rep.positions.join(", ")}</td>
        <td>${rep.distances.join(", ")}</td>
      </tr>
    `;
  });

  html += `</table>`;

  html += `<p>Häufige Teiler der Abstände:</p>`;
  html += `<table><tr><th>Teiler</th><th>Treffer</th><th>Anzeige</th></tr>`;

  Object.entries(factors)
    .map(([factor, count]) => ({ factor: Number(factor), count }))
    .sort((a, b) => b.count - a.count)
    .forEach(item => {
      html += `
        <tr>
          <td>${item.factor}</td>
          <td>${item.count}</td>
          <td><span class="bar" style="width:${item.count * 18}px"></span></td>
        </tr>
      `;
    });

  html += `</table>`;

  kasiskiOutput.innerHTML = html;
}

function showLength(length) {
  if (!length) {
    lengthOutput.innerHTML = `<span class="bad">Keine sichere Schätzung möglich.</span>`;
    return;
  }

  lengthOutput.innerHTML = `
    Vermutlich: <span class="good">${length}</span><br>
    <small>Das ist keine Garantie, aber ein guter Startwert.</small>
  `;
}

function analyzeManualLength() {
  const text = cleanText(cipherInput.value);
  const length = Number(manualLength.value);

  if (!text || length < 1) return;

  analyzeColumns(text, length);
}

function analyzeColumns(text, keyLength) {
  let guessedKey = "";
  let html = `
    <p>Der Geheimtext wird in ${keyLength} Spalten aufgeteilt. Jede Spalte wurde wahrscheinlich mit demselben Caesar-Buchstaben verschoben.</p>
    <table>
      <tr>
        <th>Schlüsselstelle</th>
        <th>Häufigster Buchstabe</th>
        <th>Vermutete Verschiebung</th>
        <th>Vermuteter Schlüsselbuchstabe</th>
      </tr>
  `;

  for (let i = 0; i < keyLength; i++) {
    let column = "";

    for (let j = i; j < text.length; j += keyLength) {
      column += text[j];
    }

    const mostCommon = getMostCommonLetter(column);
    const shift = guessShiftByE(mostCommon);
    const keyLetter = alphabet[shift];

    guessedKey += keyLetter;

    html += `
      <tr>
        <td>${i + 1}</td>
        <td class="code">${mostCommon}</td>
        <td>${shift}</td>
        <td class="good code">${keyLetter}</td>
      </tr>
    `;
  }

  html += `</table>`;

  html += `
    <p class="warn">
      Vereinfachte Annahme: Der häufigste Buchstabe einer Spalte entspricht ungefähr dem E.
      Bei deutschen Texten ist das oft hilfreich, aber nicht immer perfekt.
    </p>
  `;

  frequencyOutput.innerHTML = html;
  keyInput.value = guessedKey;
  decryptWithKey();
}

function getMostCommonLetter(text) {
  const counts = {};

  for (const char of text) {
    counts[char] = (counts[char] || 0) + 1;
  }

  let best = "E";
  let bestCount = 0;

  for (const char in counts) {
    if (counts[char] > bestCount) {
      best = char;
      bestCount = counts[char];
    }
  }

  return best;
}

function guessShiftByE(letter) {
  const cipherIndex = alphabet.indexOf(letter);
  const plainIndex = alphabet.indexOf("E");
  return (cipherIndex - plainIndex + 26) % 26;
}

function decryptWithKey() {
  const original = cipherInput.value;
  const key = cleanText(keyInput.value);

  if (!key) return;

  let result = "";
  let keyPos = 0;

  for (const char of original) {
    const upper = char.toUpperCase();

    if (alphabet.includes(upper)) {
      const c = alphabet.indexOf(upper);
      const k = alphabet.indexOf(key[keyPos % key.length]);
      const p = (c - k + 26) % 26;

      result += alphabet[p];
      keyPos++;
    } else {
      result += char;
    }
  }

  plainOutput.value = result;
}
