import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./App.css";

export default function App() {
  const [namesText, setNamesText] = useState("");
  const [times, setTimes] = useState(["@7", "@10"]);
  const [positions, setPositions] = useState([
    "L1", "L2", "FS", "FM", "BS", "BM", "TXT", "BNB"
  ]);
  const [output, setOutput] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [lastAssignments, setLastAssignments] = useState(
    JSON.parse(localStorage.getItem("lastAssignments") || "{}")
  );
  const [shiftHistory, setShiftHistory] = useState(
    JSON.parse(localStorage.getItem("shiftHistory") || "[]")
  );
  const [laneText, setLaneText] = useState("");

  const countPositionHistory = (history, name, position) =>
    history.reduce((acc, shift) => (shift[name] === position ? acc + 1 : acc), 0);

  const generate = () => {
    const baseNames = namesText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    const laneNames = (laneText || "")
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    // Combined pool (dedupe)
    const allNames = [...new Set([...baseNames, ...laneNames])];

    // Build a position entry per row (unique key per index)
    const posEntries = positions.map((label, idx) => ({
      label: (label || "").trim(),
      key: `${label || ""}__${idx}`,
    })).filter(p => p.label); // drop blank labels

    // Need total people >= total position rows
    if (allNames.length < posEntries.length) {
      alert(`Not enough names for all positions! You have ${allNames.length} total but need ${posEntries.length}.`);
      return;
    }

    // Lane/Text guarantees -> each listed name can take L1/L2/TXT
    const guaranteedMap = {};
    for (const name of laneNames) guaranteedMap[name] = ["L1", "L2", "TXT"];

    // roleMap keyed by unique position key (not label!)
    const numTimes = times.length;
    const roleMap = {};
    posEntries.forEach(pe => { roleMap[pe.key] = Array(numTimes).fill(""); });

    // helper: has this person already held this label earlier this run?
    const heldThisLabelEarlier = (name, label, tIdx) => {
      // scan all entries with same label
      for (const pe of posEntries) {
        if (pe.label !== label) continue;
        if (roleMap[pe.key].slice(0, tIdx).includes(name)) return true;
      }
      return false;
    };

    // shuffle helper
    const shuffleArr = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    for (let tIdx = 0; tIdx < numTimes; tIdx++) {
      let pool = shuffleArr([...allNames]);
      const assignedThisSlot = new Set();

      // === PASS 1: Fill all L1/L2/TXT slots using Lane/Text people first ===
      const lanePositions = posEntries.filter(p =>
        ["L1", "L2", "TXT"].includes(p.label)
      );

      // Create a fresh queue of lane-texters
      let rotatedLanePeople = shuffleArr([...laneNames]);

      // If none are defined, skip this pass
      if (rotatedLanePeople.length > 0) {
        // Randomize which lane slot gets filled first
        const randomizedLaneSlots = shuffleArr([...lanePositions]);

        for (const pe of randomizedLaneSlots) {
          // If we’ve run out of lane people, stop assigning
          if (rotatedLanePeople.length === 0) break;

          // Pull the next available person
          const name = rotatedLanePeople.shift();

          roleMap[pe.key][tIdx] = name;
          assignedThisSlot.add(name);
          pool = pool.filter(n => n !== name);
        }
      }

      // === PASS 2: Fill all remaining positions ===
      const remainingPositions = posEntries.filter(
        p => !["L1", "L2", "TXT", "BNB"].includes(p.label)
      );

      for (const pe of remainingPositions) {
        if (roleMap[pe.key][tIdx]) continue;

        if (pool.length === 0) {
          alert("Not enough people to fill all positions!");
          return;
        }

        // Filter candidates: not assigned this slot, avoid repeats, maintain fairness
        let candidates = pool.filter(
          n =>
            !assignedThisSlot.has(n) &&
            lastAssignments[n] !== pe.label &&
            !roleMap[pe.key].slice(0, tIdx).includes(n)
        );

        // Relax if needed
        if (candidates.length === 0) {
          candidates = pool.filter(
            n => !assignedThisSlot.has(n) && !roleMap[pe.key].slice(0, tIdx).includes(n)
          );
        }
        if (candidates.length === 0) {
          candidates = pool.filter(n => !assignedThisSlot.has(n));
        }

        // Sort by fairness (fewer historical counts first)
        candidates.sort(
          (a, b) =>
            countPositionHistory(shiftHistory, a, pe.label) -
            countPositionHistory(shiftHistory, b, pe.label)
        );

        const chosen = candidates[0];
        roleMap[pe.key][tIdx] = chosen;
        assignedThisSlot.add(chosen);
        pool = pool.filter(n => n !== chosen);
      }

      // === STEP 1: assign guaranteed people first, in random order ===
      const guaranteedEntries = shuffleArr(Object.entries(guaranteedMap));

      for (const [name, prefLabels] of guaranteedEntries) {
        if (!pool.includes(name) || assignedThisSlot.has(name)) continue;

        // Build the list of unfilled slots (by index) that match any preferred label
        // Randomize preferred labels too so they don't always pick L1 first.
        const prefs = shuffleArr(prefLabels);

        let chosenKey = null;

        // strict pass: avoid lastAssignments and avoid same-label earlier in run
        for (const prefLabel of prefs) {
          for (const pe of posEntries) {
            if (
              pe.label === prefLabel &&
              !roleMap[pe.key][tIdx] &&
              !heldThisLabelEarlier(name, pe.label, tIdx) &&
              lastAssignments[name] !== pe.label
            ) {
              chosenKey = pe.key; break;
            }
          }
          if (chosenKey) break;
        }

        // relaxed pass: ignore lastAssignments but keep no same-label-earlier
        if (!chosenKey) {
          for (const prefLabel of prefs) {
            for (const pe of posEntries) {
              if (
                pe.label === prefLabel &&
                !roleMap[pe.key][tIdx] &&
                !heldThisLabelEarlier(name, pe.label, tIdx)
              ) {
                chosenKey = pe.key; break;
              }
            }
            if (chosenKey) break;
          }
        }

        if (chosenKey) {
          roleMap[chosenKey][tIdx] = name;
          assignedThisSlot.add(name);
          pool = pool.filter(n => n !== name);
        }
        // If no L1/L2/TXT slot was found, try to forcibly assign one
        if (!chosenKey) {
          for (const pe of posEntries) {
            if (
              ["L1", "L2", "TXT"].includes(pe.label) &&
              !roleMap[pe.key][tIdx] &&
              !assignedThisSlot.has(name)
            ) {
              chosenKey = pe.key;
              break;
            }
          }
          if (!chosenKey) {
            alert(`Could not assign ${name} to an L1/L2/TXT slot!`);
            return;
          }
        }
      }

      // === STEP 2: fill remaining unfilled slots (by unique key) ===
      for (const pe of posEntries) {
        if (roleMap[pe.key][tIdx]) continue; // already filled

        if (pool.length === 0) {
          alert("Not enough people to fill all positions after guaranteed assignments!");
          return;
        }

        // Candidates:
        // - not already assigned this time
        // - avoid lastAssignments for this label
        // - avoid same-label earlier in this run
        let candidates = pool.filter(
          (n) =>
            !assignedThisSlot.has(n) &&
            lastAssignments[n] !== pe.label &&
            !heldThisLabelEarlier(n, pe.label, tIdx)
        );

        // Relax lastAssignments if needed
        if (candidates.length === 0) {
          candidates = pool.filter(
            (n) => !assignedThisSlot.has(n) && !heldThisLabelEarlier(n, pe.label, tIdx)
          );
        }

        // Last resort: anyone not yet assigned this slot
        if (candidates.length === 0) {
          candidates = pool.filter((n) => !assignedThisSlot.has(n));
        }

        if (candidates.length === 0) {
          alert("Constraint conflict: cannot assign unique people to all positions this slot.");
          return;
        }

        // Fairness: fewest times in this label historically
        candidates.sort(
          (a, b) =>
            countPositionHistory(shiftHistory, a, pe.label) -
            countPositionHistory(shiftHistory, b, pe.label)
        );

        const chosen = candidates[0];
        roleMap[pe.key][tIdx] = chosen;
        assignedThisSlot.add(chosen);
        pool = pool.filter(n => n !== chosen);
      }
    }

    // === Output & history ===
    const newAssignments = {};
    const lines = [times.join(" // ")];

    // Print rows in the same order as the positions list
    for (const pe of posEntries) {
      const row = roleMap[pe.key];
      lines.push(`${pe.label}: ${row.join(" // ")}`);
      row.forEach((name) => {
        if (name) newAssignments[name] = pe.label;
      });
    }

    const message = lines.join("\n");
    setOutput(message);

    const updatedHistory = [newAssignments, ...shiftHistory].slice(0, 10);
    localStorage.setItem("shiftHistory", JSON.stringify(updatedHistory));
    localStorage.setItem("lastAssignments", JSON.stringify(newAssignments));
    setLastAssignments(newAssignments);
    setShiftHistory(updatedHistory);
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
  const deletePosition = (index) =>
    setPositions(positions.filter((_, i) => i !== index));

  const handleShiftSelect = (value) => {
    setShiftType(value);
    switch (value) {
      case "morning":
        setTimes(["@7", "@10"]);
        break;
      case "mid":
        setTimes(["@12", "@3"]);
        break;
      case "close":
        setTimes(["@5", "@8"]);
        break;
      default:
        setTimes(["@7", "@10"]);
        break;
    }
  };

  const handleDragEnd = (result, type) => {
    if (!result.destination) return;
    const items = type === "times" ? [...times] : [...positions];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    if (type === "times") setTimes(items);
    else setPositions(items);
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

      {/* === Lane/Text Guarantee === */}
      <div className="section">
        <h3>Lane/Text Guarantee</h3>
        <textarea
          placeholder="Enter names to guarantee L1, L2, or TXT"
          rows="3"
          value={laneText}
          onChange={(e) => setLaneText(e.target.value)}
        />
      </div>

      {/* === Shift Type Dropdown === */}
      <div className="section">
        <h3>Shift Type</h3>
        <select
          value={shiftType}
          onChange={(e) => handleShiftSelect(e.target.value)}
          className="dropdown"
        >
          <option value="">Select a shift</option>
          <option value="morning">Morning</option>
          <option value="mid">Mid</option>
          <option value="close">Close</option>
        </select>
      </div>

      {/* === TIMES === */}
      <div className="section">
        <h3>Times</h3>
        <DragDropContext onDragEnd={(result) => handleDragEnd(result, "times")}>
          <Droppable droppableId="times-droppable">
            {(provided) => (
              <div
                className="droppable"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {times.map((t, i) => (
                  <Draggable key={`time-${i}`} draggableId={`time-${i}`} index={i}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`inline-input draggable-item ${snapshot.isDragging ? "dragging" : ""
                          }`}
                        style={provided.draggableProps.style}
                      >
                        <span
                          {...provided.dragHandleProps}
                          className="drag-handle"
                          title="Drag to reorder"
                        >
                          ☰
                        </span>
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
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <button onClick={addTime}>+ Add Time</button>
      </div>

      {/* === POSITIONS === */}
      <div className="section">
        <h3>Positions</h3>
        <DragDropContext onDragEnd={(result) => handleDragEnd(result, "positions")}>
          <Droppable droppableId="positions-droppable">
            {(provided) => (
              <div
                className="droppable"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {positions.map((p, i) => (
                  <Draggable key={`pos-${i}`} draggableId={`pos-${i}`} index={i}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`inline-input draggable-item ${snapshot.isDragging ? "dragging" : ""
                          }`}
                        style={provided.draggableProps.style}
                      >
                        <span
                          {...provided.dragHandleProps}
                          className="drag-handle"
                          title="Drag to reorder"
                        >
                          ☰
                        </span>
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
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <button onClick={addPosition}>+ Add Position</button>
      </div>

      {/* === Generate === */}
      <div className="section">
        <button className="gen-btn" onClick={generate}>
          Generate Random Shift
        </button>
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
      <h5>Created by Thomas Nguyen</h5>
      <h6>v0.9</h6>
    </div>
  );
}