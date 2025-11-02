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

  const [lastAssignments, setLastAssignments] = useState(
    JSON.parse(localStorage.getItem("lastAssignments") || "{}")
  );

  const shuffle = (arr) => {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const pickNames = (namesPool, position, count) => {
    const available = namesPool.filter((n) => lastAssignments[n] !== position);
    const source = available.length >= count ? available : namesPool;
    const shuffled = shuffle(source);
    return shuffled.slice(0, count);
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

    for (let pos of positions) {
      let rolePeople = [];
      for (let i = 0; i < numTimes; i++) {
        if (namesPool.length === 0) namesPool = shuffle(names);
        const choice = pickNames(namesPool, pos, 1)[0];
        rolePeople.push(choice);
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
  const deleteTime = (index) => {
    if (times.length <= 1) {
      alert("You must have at least one time slot.");
      return;
    }
    setTimes(times.filter((_, i) => i !== index));
  };

  const addPosition = () => setPositions([...positions, ""]);
  const deletePosition = (index) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  return (
    <div className="app">
      <h1>Shift Position Generator ☕</h1>

      {/* === Names === */}
      <div className="section">
        <h3>Names List</h3>
        <textarea
          placeholder="Enter names separated by commas or new lines"
          rows="5"
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
        />
      </div>

      {/* === Times === */}
      <div className="section">
        <h3>Times</h3>
        {times.map((t, i) => (
          <div key={i} className="inline-input">
            <input
              type="text"
              value={t}
              onChange={(e) => {
                const updated = [...times];
                updated[i] = e.target.value;
                setTimes(updated);
              }}
            />
            <button
              type="button"
              className="delete-btn"
              onClick={() => deleteTime(i)}
              title="Delete this time"
            >
              ×
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={addTime}>
          + Add Time
        </button>
      </div>

      {/* === Positions === */}
      <div className="section">
        <h3>Positions</h3>
        {positions.map((p, i) => (
          <div key={i} className="inline-input">
            <input
              type="text"
              value={p}
              onChange={(e) => {
                const updated = [...positions];
                updated[i] = e.target.value;
                setPositions(updated);
              }}
            />
            <button
              type="button"
              className="delete-btn"
              onClick={() => deletePosition(i)}
              title="Delete this position"
            >
              ×
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={addPosition}>
          + Add Position
        </button>
      </div>

      {/* === Generate === */}
      <div className="section">
        <button onClick={generate}>Generate Random Shift</button>
      </div>

      {/* === Output === */}
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
