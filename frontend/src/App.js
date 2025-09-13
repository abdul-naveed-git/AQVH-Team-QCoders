import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./styles.css";

const BB84Simulator = () => {
  const [n, setN] = useState(10);
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
  const [securityWarning, setSecurityWarning] = useState("");

  // QA Knowledge Base for chatbot
  const QA_KB = [
    {
      q: /what is bb48|bb84 protocol|explain bb84|how does this work/i,
      a: "BB84 is a quantum key distribution protocol. Alice sends qubits encoded in one of two bases (+ or ×). Bob measures in random bases. They keep only positions where their bases matched (the sifted key). If an eavesdropper (Eve) intercepts, she disturbs the system and increases the QBER (error rate), revealing her presence.",
    },
    {
      q: /what does eve(\'|)s? prob|eve prob|eve probability|what is eve/i,
      a: "Eve probability controls how often the eavesdropper intercepts and measures photons. Higher values typically raise the Quantum Bit Error Rate (QBER).",
    },
    {
      q: /qber|error rate|why is qber high/i,
      a: "QBER (Quantum Bit Error Rate) is the percentage of mismatched bits in the sifted key. In an ideal secure channel with no Eve and low noise, QBER stays low. A high QBER suggests eavesdropping or noise.",
    },
    {
      q: /sifted key|final key|why are some bits dropped|matched indices/i,
      a: "Only positions where Alice and Bob used the same basis are kept — this is key sifting. The simulator highlights those rows and forms the final sifted key from those bits.",
    },
    {
      q: /what does animation speed do|animation speed/i,
      a: "Animation speed changes how fast each photon travels across the quantum channel (purely visual).",
    },
    {
      q: /aes|encrypt|decrypt|how to encrypt/i,
      a: "After generating a sifted key, you can encrypt a message. The backend turns the key into an AES key to encrypt your text; then you can decrypt using the same key.",
    },
    {
      q: /backend|api|server|localhost 5000|error connecting/i,
      a: "This UI expects a local API at http://localhost:5000. Make sure your backend exposes /api/bb84, /api/encrypt, and /api/decrypt. If you see connection errors, start the server or check CORS.",
    },
    {
      q: /why are bases different|bases match|× vs \+|plus vs cross/i,
      a: "Alice encodes and Bob measures in random bases (+ or ×). Only matching bases yield reliable bits; different bases are discarded during sifting.",
    },
    {
      q: /reset|clear|start over/i,
      a: "To start over, just run the simulation again. It clears the table, timeline, photon, and results.",
    },
    {
      q: /tips|how to use|help/i,
      a: "1) Pick photons, Eve probability, and speed. 2) Run the simulation. 3) Watch the table fill. 4) Use the sifted key to encrypt a message; then decrypt it. If QBER > ~25–12%, assume Eve/noise.",
    },
  ];


  // Chatbot hook
  const useBot = () => {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
      {
        role: "bot",
        text: "Hi! I'm your quantum helper. Ask me about BB84, QBER, Eve, or how to encrypt/decrypt here.",
      },
    ]);

    const match = (text) => {
      for (const { q, a } of QA_KB) {
        if (q.test(text)) return a;
      }
      return "I'm not sure yet — try asking about 'BB84', 'Eve probability', 'QBER', or 'encryption'.";
    };

    const send = (text) => {
      if (!text.trim()) return;
      const userMsg = { role: "user", text };
      const botMsg = { role: "bot", text: match(text) };
      setMessages((m) => [...m, userMsg, botMsg]);
      setInput("");
    };

    return { open, setOpen, input, setInput, messages, send };
  };

  // Chatbot component
  const ChatHelpBot = () => {
    const { open, setOpen, input, setInput, messages, send } = useBot();
    const endRef = useRef(null);

    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open]);

    const quickPrompts = useMemo(
      () => [
        "What is BB84?",
        "What does Eve probability do?",
        "Why is QBER high?",
        "How do I encrypt a message?",
      ],
      []
    );

    return (
      <>
        <button
          className="chatbot-toggle"
          aria-label="Open help chatbot"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✖" : "💬 Help"}
        </button>

        <AnimatePresence>
          {open && (
            <motion.aside
              key="chatbot"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.2 }}
              className="chatbot-panel"
            >
              <div className="chatbot-header">
                <span>Quantum Help</span>
                <button className="chatbot-close" onClick={() => setOpen(false)}>
                  ×
                </button>
              </div>

              <div className="chatbot-body">
                {messages.map((m, i) => (
                  <div key={i} className={`msg ${m.role}`}>
                    <div className="bubble">{m.text}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="chatbot-quick">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="chip"
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <form
                className="chatbot-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question…"
                  aria-label="Type your question"
                />
                <button type="submit">Send</button>
              </form>
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    );
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setTableData([]);
    setHighlightedRow(null);
    setSiftedKey([]);
    setQBER(0);
    setEveKey([]);
    setSecurityWarning("");
    setTimeline("Sending request to quantum backend...");
    setEncryptedData(null);
    setDecryptedMessage("");
    setMessage("");
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
      
      // Check for security warning
      
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
      const color = bit === 0 ? "#4A90E2" : "#FF6B6B";
      setPhoton({ symbol, color, basis, bit });
      setAnimationKey((prev) => prev + 1);

      setTimeout(() => setEveActive(false), (speed * 30) / 2);
      setTimeout(resolve, speed * 30);
    });
  };

  // Modify encryptMessage function to check QBER
  const encryptMessage = async () => {
    if (parseFloat(qber) > 20) {
      setSecurityWarning("❌ Encryption blocked: QBER is too high (>20%). Potential eavesdropping detected.");
      return;
    }
    
    if (!message || siftedKey.length === 0) {
      setTimeline("Please generate a key and enter a message first");
      return;
    }

    setSecurityWarning("");
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

  // Modify decryptMessage function to check QBER
  const decryptMessage = async () => {
    if (parseFloat(qber) > 20) {
      setSecurityWarning("❌ Decryption blocked: QBER is too high (>20%). Potential eavesdropping detected.");
      return;
    }
    
    if (!encryptedData || siftedKey.length === 0) {
      setTimeline("No encrypted data or key available");
      return;
    }

    setSecurityWarning("");
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
      padding: "4px 12px",
      borderRadius: "6px",
      background: basis === 0 ? "rgba(74, 144, 226, 0.2)" : "rgba(255, 193, 7, 0.2)",
      border: `2px solid ${basis === 0 ? "#4A90E2" : "#FFC107"}`,
      color: basis === 0 ? "#4A90E2" : "#FFC107",
      fontWeight: "bold",
      fontSize: "1.1em"
    }}>
      {basis === 0 ? "+" : "×"}
    </span>
  );

  const BitIndicator = ({ bit }) => (
    <span className={`bit-indicator ${bit === 0 ? "zero" : "one"}`}>
      {bit}
    </span>
  );

  return (
    <div className="quantum-simulator">
      <ChatHelpBot />
      
      <div className="header">
        <h1>Quantum BB84 Simulator</h1>
        <p className="subtitle">Visualizing Quantum Key Distribution with the BB84 Protocol</p>
      </div>

      {securityWarning && (
        <div className="security-warning">
          {securityWarning}
        </div>
      )}

      <div className="controls-container">
        <div className="controls">
          {[
            { label: "Number of photons", value: n, min: 10, max: 50, step: 1, setter: setN },
            { label: "Eve probability", value: eveProb, min: 0, max: 1, step: 0.1, setter: setEveProb, format: (v) => `${(v * 100).toFixed(0)}%` },
            { label: "Animation speed", value: speed, min: 10, max: 300, step: 10, setter: setSpeed, format: (v) => `${v}ms` },
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

        <div className="simulate-button-container">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="simulate-button"
          >
            {isRunning ? "⏳ Running Quantum Simulation..." : "▶️ Run Quantum Simulation"}
          </button>
        </div>
      </div>

      <div className="timeline">{timeline}</div>

      <div className="quantum-channel-container">
        <div className="quantum-channel">
          <div className="party alice">
            <div className="label">Alice</div>
            <div className="description">Sender</div>
            <div className="bit-display">
              {photon && <BitIndicator bit={photon.bit} />}
            </div>
          </div>
          
          <div className="communication-line">
            <AnimatePresence>
              {photon && (
                <motion.div
                  key={animationKey}
                  initial={{ left: "10%", opacity: 0, scale: 0.8 }}
                  animate={{ left: "90%", opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: speed / 1000, ease: "easeInOut" }}
                  className="photon"
                  style={{ color: photon.color }}
                >
                  <div className="photon-symbol">{photon.symbol}</div>
                  <div className="photon-basis">
                    <BasisIndicator basis={photon.basis} />
                  </div>
                  <div className="photon-bit">
                    <BitIndicator bit={photon.bit} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {eveActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -20 }}
                className="eve-indicator"
              >
                .
              </motion.div>
            )}
          </div>
          
          <div className="party bob">
            <div className="label">Bob</div>
            <div className="description">Receiver</div>
            <div className="bit-display">
              {photon && <BitIndicator bit={photon.bit} />}
            </div>
          </div>

          <div className={`party eve ${eveActive ? 'active' : ''}`}>
            <div className="label">Eve</div>
            <div className="description">Eavesdropper</div>
          </div>
        </div>
      </div>

      <div className="results-table">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {["Alice Bases","Alice Bits", "Bob Basis", "Bob Measured Bit", "Eve Bits ", "Eve Intercepting", "Bases Match"].map((col) => (
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
      </div>

      <div className="results">
        <h2>Quantum Results</h2>
        
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
            <p>{qber > 20 ? "High error rate - Eve might be present!" : "Low error rate - channel is secure"}</p>
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
        <h2>AES Encryption {parseFloat(qber) > 20 && "(Disabled - High QBER)"}</h2>
        
        <div className="encryption-controls">
          <div className="input-group">
            <label>Message to encrypt:</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter secret message"
              disabled={parseFloat(qber) > 20}
            />
          </div>
          
          <button 
            onClick={encryptMessage} 
            disabled={siftedKey.length === 0 || parseFloat(qber) > 20}
          >
            {parseFloat(qber) > 20 ? "Encryption Disabled" : "Encrypt with Quantum Key"}
          </button>
          
          {encryptedData && (
            <div className="encrypted-data">
              <h4>Encrypted Message:</h4>
              <div className="ciphertext">{encryptedData.ciphertext}</div>
              
              <button 
                onClick={decryptMessage} 
                style={{ marginTop: '15px' }}
                disabled={parseFloat(qber) > 20}
              >
                {parseFloat(qber) >20 ? "Decryption Disabled" : "Decrypt with Quantum Key"}
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

      <div className="footer">
        <p>Quantum BB84 Protocol Simulator | Secure Quantum Communication</p>
      </div>
    </div>
  );
};

export default BB84Simulator;
