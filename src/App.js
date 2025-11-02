import React, { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [namesText, setNamesText] = useState("");
  const [times, setTimes] = useState(["@7", "@10"]);
  const [positions, setPositions] = useState([
    "L1",
    "L2",
    "FS",
    "FM",
    "BS",
    "BM",
    "TXT",
    "BNB",
  ]);
  const [output, setOutput] = useState("");

  // Load past assignments from localStorage
  const [lastAssignments, setLastAssignments] = useState(
    JSON.parse(localStorage.getItem("lastAssignments") || "{}")
  );

  // Helper: shuffle array
  const shuffle = (arr) => {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Helper: pick names avoiding same position if possible
  const pickNames = (namesPool, position, count) => {
    const available = namesPool.filter((n) => lastAssignments[n] !== position);
    let chosen = [];
    const source = available.length >= count ? available : namesPool;

    // Randomly pick names from source
    const shuffled = shuffle(source);
    for (let i = 0; i < count && shuffled.length > 0; i++) {
      chosen.push(shuffled.pop());
    }
    return chosen;
  };

  const generate = () => {
    let names = namesText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length < positions.length) {
      alert("Not enough names for all positions!");
      return;
    }

    const numTimes = times.length;
    let namesPool = shuffle(names);
    let newAssignments = {};
    let lines = [times.join(" // ")];
    let used = new Set();

    for (let pos of positions) {
      let rolePeople = [];
      for (let i = 0; i < numTimes; i++) {
        // Refill pool if we run out
        if (namesPool.length === 0) namesPool = shuffle(names);

        const choice = pickNames(namesPool, pos, 1)[0];
        rolePeople.push(choice);
        used.add(choice);
        namesPool = namesPool.filter((n) => n !== choice);
        newAssignments[choice] = pos;
      }
      lines.push(`${pos}: ${rolePeople.join(" // ")}`);
    }

    const message = lines.join("\n");
    setOutput(message);
    localStorage.setItem("lastAssignments", JSON.stringify(newAssignments));
    setLastAssignments(newAssignments);
  };

  const addTime = () => setTimes([...times, `@${times.length * 3 + 7}`]);
  const addPosition = () => setPositions([...positions, ""]);

  return (
    <div className="app">
      <h1>Shift Position Generator ☕</h1>

      <div className="section">
        <h3>Names List</h3>
        <textarea
          placeholder="Enter names separated by commas or new lines"
          rows="5"
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
        />
      </div>

      <div className="section">
        <h3>Times</h3>
        {times.map((t, i) => (
          <input
            key={i}
            value={t}
            onChange={(e) => {
              const updated = [...times];
              updated[i] = e.target.value;
              setTimes(updated);
            }}
          />
        ))}
        <button onClick={addTime}>+ Add Time</button>
      </div>

      <div className="section">
        <h3>Positions</h3>
        {positions.map((p, i) => (
          <input
            key={i}
            value={p}
            onChange={(e) => {
              const updated = [...positions];
              updated[i] = e.target.value;
              setPositions(updated);
            }}
          />
        ))}
        <button onClick={addPosition}>+ Add Position</button>
      </div>

      <div className="section">
        <button onClick={generate}>Generate Random Shift</button>
      </div>

      <div className="section">
        <h3>Generated Message</h3>
        <textarea readOnly rows="10" value={output} />
        <br />
        <button
          onClick={() => {
            navigator.clipboard.writeText(output);
            alert("Copied to clipboard!");
          }}
        >
          Copy Message
        </button>
      </div>
    </div>
  );
}
