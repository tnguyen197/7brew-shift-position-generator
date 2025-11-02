import React, { useState } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  const [shiftType, setShiftType] = useState("");
  const [lastAssignments, setLastAssignments] = useState(
    JSON.parse(localStorage.getItem("lastAssignments") || "{}")
  );

  // Create a portal container for dragged items (fixes mobile offset)
  if (!document.getElementById("dnd-portal")) {
    const portal = document.createElement("div");
    portal.id = "dnd-portal";
    document.body.appendChild(portal);
  }

  const shuffle = (arr) => {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const countPositionHistory = (history, name, position) =>
    history.reduce((acc, shift) => (shift[name] === position ? acc + 1 : acc), 0);

  const generate = () => {
    const names = namesText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length < positions.length) {
      alert("Not enough names for all positions!");
      return;
    }

    const numTimes = times.length;
    const shiftHistory = JSON.parse(localStorage.getItem("shiftHistory") || "[]");
    const roleMap = {};
    positions.forEach((p) => (roleMap[p] = Array(numTimes).fill("")));

    for (let tIdx = 0; tIdx < numTimes; tIdx++) {
      let pool = shuffle([...names]);
      for (const pos of positions) {
        let candidates = pool.filter((n) => lastAssignments[n] !== pos);
        if (candidates.length === 0) candidates = [...pool];
        candidates.sort(
          (a, b) =>
            countPositionHistory(shiftHistory, a, pos) -
            countPositionHistory(shiftHistory, b, pos)
        );
        const chosen = candidates[0];
        roleMap[pos][tIdx] = chosen;
        pool = pool.filter((n) => n !== chosen);
      }
    }

    const newAssignments = {};
    const lines = [times.join(" // ")];
    for (const pos of positions) {
      const row = roleMap[pos];
      lines.push(`${pos}: ${row.join(" // ")}`);
      row.forEach((name) => (newAssignments[name] = pos));
    }

    const message = lines.join("\n");
    setOutput(message);
    const updatedHistory = [newAssignments, ...shiftHistory].slice(0, 10);
    localStorage.setItem("shiftHistory", JSON.stringify(updatedHistory));
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

  // Prevent background scroll while dragging on mobile
  const onDragStart = () => {
    document.body.style.overflow = "hidden";
  };
  const onDragEndSafe = (result, type) => {
    document.body.style.overflow = "auto";
    handleDragEnd(result, type);
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
        <DragDropContext
          onDragStart={onDragStart}
          onDragEnd={(result) => onDragEndSafe(result, "times")}
        >
          <Droppable droppableId="times-droppable">
            {(provided) => (
              <div
                className="droppable"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {times.map((t, i) => (
                  <Draggable key={`time-${i}`} draggableId={`time-${i}`} index={i}>
                    {(provided, snapshot) => {
                      const content = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`inline-input draggable-item ${
                            snapshot.isDragging ? "dragging" : ""
                          }`}
                          style={provided.draggableProps.style}
                        >
                          <span
                            {...provided.dragHandleProps}
                            className="drag-handle"
                            title="Drag to reorder"
                            onTouchStart={(e) => e.preventDefault()}
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
                      );
                      return snapshot.isDragging
                        ? ReactDOM.createPortal(
                            content,
                            document.getElementById("dnd-portal")
                          )
                        : content;
                    }}
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
        <DragDropContext
          onDragStart={onDragStart}
          onDragEnd={(result) => onDragEndSafe(result, "positions")}
        >
          <Droppable droppableId="positions-droppable">
            {(provided) => (
              <div
                className="droppable"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {positions.map((p, i) => (
                  <Draggable key={`pos-${i}`} draggableId={`pos-${i}`} index={i}>
                    {(provided, snapshot) => {
                      const content = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`inline-input draggable-item ${
                            snapshot.isDragging ? "dragging" : ""
                          }`}
                          style={provided.draggableProps.style}
                        >
                          <span
                            {...provided.dragHandleProps}
                            className="drag-handle"
                            title="Drag to reorder"
                            onTouchStart={(e) => e.preventDefault()}
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
                      );
                      return snapshot.isDragging
                        ? ReactDOM.createPortal(
                            content,
                            document.getElementById("dnd-portal")
                          )
                        : content;
                    }}
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
    </div>
  );
}