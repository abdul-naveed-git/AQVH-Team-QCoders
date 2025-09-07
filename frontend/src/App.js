import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./styles.css";

const BB84Simulator = () => {
  const [n, setN] = useState(8);
  const [eveProb, setEveProb] = useState(0.3);
  const [speed, setSpeed] = useState(150);
  const [tableData, setTableData] = useState([]);
  const [timeline, setTimeline] = useState("");
  const [photon, setPhoton] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [eveActive, setEveActive] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [siftedKey, setSiftedKey] = useState([]);
  const [qber, setQBER] = useState(0);
  const [eveKey, setEveKey] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState("");

  const runSimulation = async () => {
    setIsRunning(true);
    setTableData([]);
    setHighlightedRow(null);
    setSiftedKey([]);
    setQBER(0);
    setEveKey([]);
    setTimeline("Sending request to quantum backend...");

    try {
      const response = await fetch('http://localhost:5000/api/bb84', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          n_bits: n,
          eve_prob: eveProb
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setTimeline(`Error: ${data.error}`);
        setIsRunning(false);
        return;
      }

      setTimeline("Quantum simulation complete. Animating...");
      
      // Animate the table data
      for (let i = 0; i < data.table_data.length; i++) {
        setTimeline(`📡 Displaying photon ${i + 1} of ${data.table_data.length}`);
        
        // Check if Eve intercepted this photon
        const eveHere = data.table_data[i]["Eve Intercepting"] === "Yes";
        setEveActive(eveHere);
        
        // Animate photon
        await animatePhoton(
          data.table_data[i]["Alice Bit"], 
          data.table_data[i]["Alice Basis"].includes("+") ? 0 : 1,
          eveHere
        );
        
        // Add row to table
        setTableData(prev => [...prev, data.table_data[i]]);
      }

      // Animate key sifting
      setTimeline("🔍 Performing key sifting...");
      for (let idx of data.matched_indices) {
        setHighlightedRow(idx);
        await new Promise((res) => setTimeout(res, 500));
        setHighlightedRow(null);
        await new Promise((res) => setTimeout(res, 200));
      }

      // Set final results
      setSiftedKey(data.bob_key);
      setQBER((data.qber * 100).toFixed(2));
      setEveKey(data.eve_key);
      setTimeline("✅ Quantum simulation complete");
    } catch (error) {
      console.error('Error:', error);
      setTimeline("❌ Error connecting to quantum backend");
    } finally {
      setIsRunning(false);
    }
  };

  const animatePhoton = (bit, basis, eveHere) => {
    return new Promise((resolve) => {
      const symbol = bit === 0 ? "→" : "↗";
      const color = bit === 0 ? "#4fc3f7" : "#ff5252";
      setPhoton({ symbol, color, basis });
      setAnimationKey((prev) => prev + 1);

      setTimeout(() => setEveActive(false), (speed * 30) / 2);
      setTimeout(resolve, speed * 30);
    });
  };

  const encryptMessage = async () => {
    if (!message || siftedKey.length === 0) {
      setTimeline("Please generate a key and enter a message first");
      return;
    }

    setTimeline("Encrypting message with quantum key...");
    
    try {
      const response = await fetch('http://localhost:5000/api/encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          key: siftedKey
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setTimeline(`Encryption error: ${data.error}`);
        return;
      }

      setEncryptedData(data);
      setTimeline("✅ Message encrypted successfully");
    } catch (error) {
      console.error('Error:', error);
      setTimeline("❌ Error encrypting message");
    }
  };

  const decryptMessage = async () => {
    if (!encryptedData || siftedKey.length === 0) {
      setTimeline("No encrypted data or key available");
      return;
    }

    setTimeline("Decrypting message with quantum key...");
    
    try {
      const response = await fetch('http://localhost:5000/api/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_data: encryptedData,
          key: siftedKey
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setTimeline(`Decryption error: ${data.error}`);
        return;
      }

      setDecryptedMessage(data.decrypted);
      setTimeline("✅ Message decrypted successfully");
    } catch (error) {
      console.error('Error:', error);
      setTimeline("❌ Error decrypting message");
    }
  };

  const BasisIndicator = ({ basis }) => (
    <span style={{ 
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      background: basis === 0 ? "rgba(41, 182, 246, 0.2)" : "rgba(255, 152, 0, 0.2)",
      border: `1px solid ${basis === 0 ? "#29b6f6" : "#ff9800"}`,
      color: basis === 0 ? "#29b6f6" : "#ff9800",
      fontWeight: "bold",
      fontSize: "0.9em"
    }}>
      {basis === 0 ? "+" : "×"}
    </span>
  );

  return (
    <div className="quantum-simulator">
      <h1>🔐 BB84 Quantum Key Distribution Simulator</h1>

      <div className="controls">
        {[
          { label: "Number of photons", value: n, min: 5, max: 20, step: 1, setter: setN },
          { label: "Eve probability", value: eveProb, min: 0, max: 1, step: 0.1, setter: setEveProb, format: (v) => `${(v * 100).toFixed(0)}%` },
          { label: "Animation speed", value: speed, min: 50, max: 500, step: 10, setter: setSpeed, format: (v) => `${v}ms` },
        ].map((ctrl) => (
          <div key={ctrl.label} className="control-item">
            <label>{ctrl.label}: {ctrl.format ? ctrl.format(ctrl.value) : ctrl.value}</label>
            <input
              type="range"
              min={ctrl.min}
              max={ctrl.max}
              step={ctrl.step}
              value={ctrl.value}
              onChange={(e) => ctrl.setter(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
        ))}
      </div>

      <button
        onClick={runSimulation}
        disabled={isRunning}
        className="simulate-button"
      >
        {isRunning ? "⏳ Running..." : "▶️ Run Quantum Simulation"}
      </button>

      <div className="timeline">{timeline}</div>

      <div className="quantum-channel">
        <div className="party alice">
          <div className="label">Alice</div>
          <div className="description">Sender</div>
        </div>
        
        <div className="communication-line">
          <AnimatePresence>
            {photon && (
              <motion.div
                key={animationKey}
                initial={{ left: "10%", opacity: 0 }}
                animate={{ left: "90%", opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: speed / 1000, ease: "linear" }}
                className="photon"
                style={{ color: photon.color }}
              >
                <div className="photon-symbol">{photon.symbol}</div>
                <div className="photon-basis">
                  <BasisIndicator basis={photon.basis} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {eveActive && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="eve-indicator"
            >
              🕵️‍♀️ Eve intercepting!
            </motion.div>
          )}
        </div>
        
        <div className="party bob">
          <div className="label">Bob</div>
          <div className="description">Receiver</div>
        </div>
      </div>

      <div className="eve-status">
        Eve: {eveActive ? "INTERCEPTING" : "inactive"}
      </div>

      <div className="results-table">
        <table>
          <thead>
            <tr>
              {["Alice Bit", "Alice Basis", "Bob Basis", "Bases Match", "Eve Intercepting", "Eve Bit", "Bob Measured Bit"].map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => {
              const aliceBit = row["Alice Bit"];
              const bobBit = row["Bob Measured Bit"];
              const eveIntercept = row["Eve Intercepting"] === "Yes";
              const basesMatch = row["Match"] === "Yes";

              let rowClass = "";
              if (highlightedRow === idx) rowClass = "highlighted";
              else if (eveIntercept) rowClass = "eve-present";
              else if (!basesMatch) rowClass = "bases-differ";
              else if (aliceBit !== bobBit) rowClass = "error";
              else if (aliceBit === bobBit) rowClass = "correct";

              return (
                <tr key={idx} className={rowClass}>
                  {Object.values(row).map((val, i) => (
                    <td key={i}>{val}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="results">
        <h2>📊 Quantum Results</h2>
        
        <div className="result-cards">
          <div className="result-card">
            <h3>Final Sifted Key</h3>
            <div className="key-display">
              {siftedKey.length > 0 ? siftedKey.map((bit, idx) => (
                <span key={idx} className={`bit ${bit === 0 ? "zero" : "one"}`}>
                  {bit}
                </span>
              )) : "-"}
            </div>
            <p>{siftedKey.length} bits</p>
          </div>
          
          <div className="result-card">
            <h3>Quantum Bit Error Rate</h3>
            <div className="qber-value">{qber}%</div>
            <p>{qber > 10 ? "High error rate - Eve might be present!" : "Low error rate - channel is secure"}</p>
          </div>
          
          <div className="result-card">
            <h3>Eve's Intercepted Key</h3>
            <div className="key-display">
              {eveKey.length > 0 ? eveKey.map((bit, idx) => (
                <span key={idx} className={`bit eve-bit ${bit === 0 ? "zero" : "one"}`}>
                  {bit}
                </span>
              )) : "-"}
            </div>
            <p>{eveKey.length} bits intercepted</p>
          </div>
        </div>
      </div>

      <div className="encryption-section">
        <h2>🔒 AES Encryption</h2>
        
        <div className="encryption-controls">
          <div className="input-group">
            <label>Message to encrypt:</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter secret message"
            />
          </div>
          
          <button onClick={encryptMessage} disabled={siftedKey.length === 0}>
            Encrypt with Quantum Key
          </button>
          
          {encryptedData && (
            <div className="encrypted-data">
              <h4>Encrypted Message:</h4>
              <div className="ciphertext">{encryptedData.ciphertext}</div>
              
              <button onClick={decryptMessage} style={{ marginTop: '10px' }}>
                Decrypt with Quantum Key
              </button>
            </div>
          )}
          
          {decryptedMessage && (
            <div className="decrypted-data">
              <h4>Decrypted Message:</h4>
              <div className="plaintext">{decryptedMessage}</div>
            </div>
          )}
        </div>
      </div>

      <div className="legend">
        <h3>Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="color-swatch correct"></div>
            <span>Matching bases (no Eve)</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch eve-present"></div>
            <span>Eve intercepted</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch error"></div>
            <span>Measurement error</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch bases-differ"></div>
            <span>Different bases</span>
          </div>
          <div className="legend-item">
            <div className="color-swatch highlighted"></div>
            <span>Selected for key</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BB84Simulator;
