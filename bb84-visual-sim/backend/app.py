# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
import numpy as np
import random
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import base64
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

def encode_message(bits, bases):
    circuits = []
    for bit, basis in zip(bits, bases):
        qc = QuantumCircuit(1, 1)
        if basis == 0:  # Z basis
            if bit == 1:
                qc.x(0)
        else:  # X basis
            if bit == 0:
                qc.h(0)
            else:
                qc.x(0)
                qc.h(0)
        circuits.append(qc)
    return circuits

def measure_message(circuits, bases):
    measured_circuits = []
    for qc, basis in zip(circuits, bases):
        measured_qc = qc.copy()
        if basis == 1:  # X basis → apply H before measurement
            measured_qc.h(0)
        measured_qc.measure(0, 0)
        measured_circuits.append(measured_qc)
    return measured_circuits

def remove_garbage(a_bases, b_bases, bits):
    return [bit for i, bit in enumerate(bits) if a_bases[i] == b_bases[i]]

def calculate_qber(alice_key, bob_key):
    """Calculate Quantum Bit Error Rate (QBER)."""
    if not alice_key or not bob_key:  # avoid division by zero
        return 0.0
    errors = sum(a != b for a, b in zip(alice_key, bob_key))
    qber = errors / len(alice_key)
    return qber

def eavesdrop(circuits, eve_bases, eve_prob=0.0):
    """Eve intercepts, measures, and resends qubits with probability eve_prob."""
    intercepted_circuits = []
    eve_results = []

    backend = Aer.get_backend("qasm_simulator")

    for i, (qc, basis) in enumerate(zip(circuits, eve_bases)):
        if random.random() < eve_prob:  # Eve intercepts this qubit
            eve_circuit = qc.copy()
            if basis == 1:  # measure in X basis
                eve_circuit.h(0)
            eve_circuit.measure(0, 0)

            # Run Eve's measurement (1 shot, like real life)
            job = backend.run(transpile(eve_circuit, backend), shots=1)
            counts = job.result().get_counts()
            bit = int(max(counts, key=counts.get))
            eve_results.append(bit)

            # Eve resends according to her result & basis
            resent = QuantumCircuit(1, 1)
            if basis == 0:  # Z basis
                if bit == 1:
                    resent.x(0)
            else:  # X basis
                if bit == 0:
                    resent.h(0)
                else:
                    resent.x(0)
                    resent.h(0)

            intercepted_circuits.append(resent)
        else:  # Eve does not intercept → qubit passes untouched
            eve_results.append(None)  # no measurement
            intercepted_circuits.append(qc.copy())

    return intercepted_circuits, eve_results

def bb84_protocol(n_bits=10, seed=None, with_eve=False, eve_prob=0.0):
    if seed is not None:
        np.random.seed(seed)

    # Alice's random bits & bases
    alice_bits = np.random.randint(2, size=n_bits)
    alice_bases = np.random.randint(2, size=n_bits)

    # Bob's random bases
    bob_bases = np.random.randint(2, size=n_bits)

    # Encode + measure
    message = encode_message(alice_bits, alice_bases)
    eve_bases = None
    eve_results = None
    if with_eve:
        eve_bases = np.random.randint(2, size=n_bits)
        message, eve_results = eavesdrop(message, eve_bases, eve_prob=eve_prob)

    bob_circuits = measure_message(message, bob_bases)

    # Run on local simulator
    backend = Aer.get_backend("qasm_simulator")
    transpiled = transpile(bob_circuits, backend)
    job = backend.run(transpiled, shots=1)

    results = job.result()
    bob_results = []
    for i in range(n_bits):
        counts = results.get_counts(i)
        outcome = max(counts, key=counts.get)
        bob_results.append(int(outcome))

    # Sifted keys
    alice_key = remove_garbage(alice_bases, bob_bases, alice_bits)
    bob_key = remove_garbage(alice_bases, bob_bases, bob_results)

    qber = calculate_qber(alice_key, bob_key)

    # Format table data for frontend
    table_data = []
    for i in range(n_bits):
        eve_intercepted = with_eve and eve_results[i] is not None
        table_data.append({
            "Alice Bit": int(alice_bits[i]),
            "Alice Basis": "+ (0°)" if alice_bases[i] == 0 else "× (45°)",
            "Bob Basis": "+ (0°)" if bob_bases[i] == 0 else "× (45°)",
            "Eve Intercepting": "Yes" if eve_intercepted else "No",
            "Eve Bit": int(eve_results[i]) if eve_intercepted else "-",
            "Bob Measured Bit": int(bob_results[i]),
            "Match": "Yes" if alice_bases[i] == bob_bases[i] else "No"
        })

    # Get Eve's key (only bits she intercepted and where bases matched)
    eve_key = []
    if with_eve and eve_results is not None:
        for i in range(n_bits):
            if alice_bases[i] == bob_bases[i] and eve_results[i] is not None:
                eve_key.append(int(eve_results[i]))

    return {
        "table_data": table_data,
        "alice_key": [int(bit) for bit in alice_key],
        "bob_key": [int(bit) for bit in bob_key],
        "qber": float(qber),
        "eve_key": eve_key,
        "matched_indices": [i for i in range(n_bits) if alice_bases[i] == bob_bases[i]]
    }

def aes_encrypt(message, key):
    """Encrypt a message using AES with the provided key"""
    # Convert key to bytes and pad to 16, 24, or 32 bytes
    key_bytes = pad(str(key).encode(), 32)
    cipher = AES.new(key_bytes, AES.MODE_EAX)
    ciphertext, tag = cipher.encrypt_and_digest(message.encode())
    return {
        'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
        'nonce': base64.b64encode(cipher.nonce).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8')
    }

def aes_decrypt(encrypted_data, key):
    """Decrypt a message using AES with the provided key"""
    key_bytes = pad(str(key).encode(), 32)
    ciphertext = base64.b64decode(encrypted_data['ciphertext'])
    nonce = base64.b64decode(encrypted_data['nonce'])
    tag = base64.b64decode(encrypted_data['tag'])
    
    cipher = AES.new(key_bytes, AES.MODE_EAX, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    return plaintext.decode('utf-8')

@app.route('/api/bb84', methods=['POST'])
def run_bb84():
    data = request.json
    n_bits = data.get('n_bits', 10)
    eve_prob = data.get('eve_prob', 0.3)
    seed = data.get('seed', None)
    
    with_eve = eve_prob > 0
    
    try:
        results = bb84_protocol(
            n_bits=n_bits, 
            seed=seed, 
            with_eve=with_eve, 
            eve_prob=eve_prob
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/encrypt', methods=['POST'])
def encrypt_message():
    data = request.json
    message = data.get('message', '')
    key = data.get('key', [])
    
    try:
        encrypted = aes_encrypt(message, key)
        return jsonify(encrypted)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/decrypt', methods=['POST'])
def decrypt_message():
    data = request.json
    encrypted_data = data.get('encrypted_data', {})
    key = data.get('key', [])
    
    try:
        decrypted = aes_decrypt(encrypted_data, key)
        return jsonify({'decrypted': decrypted})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)